import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

async function applyInventoryCarryForwardMigration() {
  console.log('===========================================================')
  console.log('APPLYING INVENTORY AUTOMATIC CARRY-FORWARD & PERSISTENCE FIX')
  console.log('===========================================================')

  const envPath = path.join(__dirname, '..', '.env.local')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach((line) => {
      const parts = line.split('=')
      if (parts.length >= 2 && !line.startsWith('#')) {
        const key = parts[0].trim()
        const val = parts.slice(1).join('=').trim()
        if (key && val && !process.env[key]) {
          process.env[key] = val
        }
      }
    })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rhqoonbhwsffwojvndnb.supabase.co'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const sql = `
CREATE OR REPLACE FUNCTION public.create_order_atomic(
    p_customer_id UUID,
    p_address_id UUID,
    p_items JSONB,
    p_inventory_date DATE DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL,
    p_delivery_fee NUMERIC DEFAULT 30.00,
    p_branch_id UUID DEFAULT 'b1111111-1111-1111-1111-111111111111',
    p_customer_remarks TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item JSONB;
    v_product_id UUID;
    v_quantity NUMERIC(10,3);
    v_unit_price NUMERIC(10,2);
    v_cutting_type TEXT;
    v_subtotal NUMERIC(10,2);
    v_total_amount NUMERIC(10,2) := 0;
    v_inv_id UUID;
    v_curr_available NUMERIC(10,3);
    v_price_per_kg NUMERIC(10,2);
    v_product_name TEXT;
    v_order_id UUID;
    v_order_number TEXT;
    v_today DATE := COALESCE(p_inventory_date, CURRENT_DATE);
    v_random_suffix TEXT;
    v_existing_order_id UUID;
    v_target_branch UUID := COALESCE(p_branch_id, 'b1111111-1111-1111-1111-111111111111');
BEGIN
    -- Check Idempotency key if provided
    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        SELECT reference_id INTO v_existing_order_id
        FROM public.inventory_movements
        WHERE reason = 'Idempotency: ' || p_idempotency_key
        LIMIT 1;

        IF v_existing_order_id IS NOT NULL THEN
            SELECT order_number INTO v_order_number FROM public.orders WHERE id = v_existing_order_id;
            RETURN jsonb_build_object(
                'success', true,
                'order_id', v_existing_order_id,
                'order_number', v_order_number,
                'idempotent_retry', true
            );
        END IF;
    END IF;

    -- Validate items array is not empty
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'EMPTY_CART: Cart items cannot be empty';
    END IF;

    -- Validate inventory for ALL items (Lock rows FOR UPDATE)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity_kg')::NUMERIC;
        v_unit_price := (v_item->>'unit_price')::NUMERIC;
        v_cutting_type := COALESCE(v_item->>'cutting_type', 'whole');
        v_subtotal := ROUND(v_quantity * v_unit_price, 2);

        IF v_quantity <= 0 THEN
            RAISE EXCEPTION 'INVALID_QUANTITY: Quantity must be greater than 0';
        END IF;

        -- 1. Try to lock inventory row for TODAY
        SELECT id, available_stock INTO v_inv_id, v_curr_available
        FROM public.inventory
        WHERE product_id = v_product_id AND inventory_date = v_today AND (branch_id = v_target_branch OR branch_id IS NULL)
        ORDER BY branch_id DESC NULLS LAST
        LIMIT 1
        FOR UPDATE;

        -- 2. If no inventory row for TODAY, carry forward from the LATEST previous inventory record!
        IF v_inv_id IS NULL THEN
            SELECT id, available_stock, price_per_kg INTO v_inv_id, v_curr_available, v_price_per_kg
            FROM public.inventory
            WHERE product_id = v_product_id AND branch_id = v_target_branch AND inventory_date <= v_today
            ORDER BY inventory_date DESC, created_at DESC
            LIMIT 1;

            IF v_inv_id IS NOT NULL AND v_curr_available > 0 THEN
                -- Auto Carry Forward to TODAY's date
                INSERT INTO public.inventory (
                    product_id, branch_id, inventory_date, price_per_kg, opening_stock, available_stock, available_stock_kg, low_stock_threshold
                ) VALUES (
                    v_product_id, v_target_branch, v_today, COALESCE(v_price_per_kg, v_unit_price), v_curr_available, v_curr_available, v_curr_available, 2.0
                )
                RETURNING id, available_stock INTO v_inv_id, v_curr_available;

                -- Lock the newly created row FOR UPDATE
                SELECT id, available_stock INTO v_inv_id, v_curr_available
                FROM public.inventory WHERE id = v_inv_id FOR UPDATE;
            END IF;
        END IF;

        SELECT name INTO v_product_name FROM public.products WHERE id = v_product_id;

        IF v_inv_id IS NULL THEN
            RAISE EXCEPTION 'NO_INVENTORY: % is not available in stock for selected branch', COALESCE(v_product_name, 'Selected fish');
        END IF;

        IF v_curr_available < v_quantity THEN
            RAISE EXCEPTION 'INSUFFICIENT_STOCK: Only % kg of % is available (requested % kg)', v_curr_available, v_product_name, v_quantity;
        END IF;

        v_total_amount := v_total_amount + v_subtotal;
    END LOOP;

    v_total_amount := v_total_amount + COALESCE(p_delivery_fee, 30.00);

    -- Generate unique order number (e.g., BF-20260825-4921)
    LOOP
        v_random_suffix := LPAD(CAST(FLOOR(RANDOM() * 9000 + 1000) AS TEXT), 4, '0');
        v_order_number := 'BF-' || TO_CHAR(v_today, 'YYYYMMDD') || '-' || v_random_suffix;

        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE order_number = v_order_number);
    END LOOP;

    -- Create Order record
    INSERT INTO public.orders (
        order_number, customer_id, address_id, total_amount, total, delivery_fee, status, payment_status, branch_id, customer_remarks, delivery_address
    ) VALUES (
        v_order_number, p_customer_id, p_address_id, v_total_amount, v_total_amount, COALESCE(p_delivery_fee, 30.00), 'pending', 'pending', v_target_branch, p_customer_remarks,
        (SELECT COALESCE(address_line, address_line1, 'Saved Address') FROM public.addresses WHERE id = p_address_id)
    )
    RETURNING id INTO v_order_id;

    -- Deduct inventory and insert order_items & inventory_movements
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity_kg')::NUMERIC;
        v_unit_price := (v_item->>'unit_price')::NUMERIC;
        v_cutting_type := COALESCE(v_item->>'cutting_type', 'whole');
        v_subtotal := ROUND(v_quantity * v_unit_price, 2);

        -- Find inventory row for TODAY
        SELECT id, available_stock INTO v_inv_id, v_curr_available
        FROM public.inventory
        WHERE product_id = v_product_id AND inventory_date = v_today AND (branch_id = v_target_branch OR branch_id IS NULL)
        ORDER BY branch_id DESC NULLS LAST
        LIMIT 1
        FOR UPDATE;

        IF v_inv_id IS NOT NULL THEN
            UPDATE public.inventory
            SET available_stock = available_stock - v_quantity,
                available_stock_kg = COALESCE(available_stock_kg, available_stock) - v_quantity,
                sold_stock = COALESCE(sold_stock, 0) + v_quantity,
                updated_at = NOW()
            WHERE id = v_inv_id;

            INSERT INTO public.inventory_movements (
                inventory_id, movement_type, quantity, reference_id, reason, branch_id
            ) VALUES (
                v_inv_id, 'SALE', -v_quantity, v_order_id, COALESCE('Idempotency: ' || p_idempotency_key, 'WhatsApp Order ' || v_order_number), v_target_branch
            );
        END IF;

        INSERT INTO public.order_items (
            order_id, product_id, quantity_kg, unit_price, cutting_type, subtotal
        ) VALUES (
            v_order_id, v_product_id, v_quantity, v_unit_price, v_cutting_type, v_subtotal
        );
    END LOOP;

    -- Clear cart session
    UPDATE public.chat_sessions
    SET cart = '[]'::JSONB,
        state = 'MAIN_MENU',
        updated_at = NOW()
    WHERE customer_id = p_customer_id;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'status', 'pending'
    );
END;
$$;
  `

  console.log('Executing RPC migration for create_order_atomic plpgsql function...')
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql })
    if (error) console.log('RPC execution note:', error.message)
  } catch (err: any) {
    console.log('RPC execution note:', err?.message || err)
  }

  // Also write migration file to migrations directory
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '009_inventory_carry_forward.sql')
  fs.writeFileSync(migrationPath, sql)
  console.log(`Saved migration to ${migrationPath}`)

  console.log('Migration script complete.')
}

applyInventoryCarryForwardMigration()
