export type CuttingType = 'whole' | 'curry_cut' | 'fry_cut' | 'cleaned';

export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'PACKED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CASH_ON_DELIVERY';

export type MovementType = 'OPENING' | 'SALE' | 'RESTOCK' | 'DAMAGED' | 'MANUAL_ADJUSTMENT' | 'CANCELLATION' | 'RETURN';

export type InventoryStatus = 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'INACTIVE';

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  image_url?: string | null;
  unit: string;
  active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Inventory {
  id: string;
  product_id: string;
  inventory_date: string;
  price_per_kg: number;
  opening_stock: number;
  sold_stock: number;
  reserved_stock: number;
  available_stock: number;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface Customer {
  id: string;
  phone: string;
  name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Address {
  id: string;
  customer_id: string;
  title: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  pincode?: string | null;
  is_default: boolean;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity_kg: number;
  cutting_type: CuttingType;
  unit_price: number;
  subtotal: number;
  created_at: string;
  product?: Product;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  address_id?: string | null;
  total_amount: number;
  delivery_fee: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  cancellation_reason?: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  address?: Address;
  items?: OrderItem[];
}

export interface InventoryMovement {
  id: string;
  inventory_id: string;
  product_id: string;
  movement_type: MovementType;
  quantity_change: number;
  reason?: string | null;
  reference_id?: string | null;
  admin_id?: string | null;
  created_at: string;
  product?: Product;
}

export interface CartItem {
  product_id: string;
  product_name: string;
  quantity_kg: number;
  cutting_type: CuttingType;
  unit_price: number;
  subtotal: number;
}

export interface ChatSession {
  id: string;
  customer_id: string;
  state: string;
  cart: CartItem[];
  selected_product_id?: string | null;
  selected_quantity?: number | null;
  selected_cutting_type?: CuttingType | null;
  selected_address_id?: string | null;
  last_message_id?: string | null;
  updated_at: string;
}
