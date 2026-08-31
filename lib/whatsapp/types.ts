export type BotState =
  | 'MAIN_MENU'
  | 'SELECTING_BRANCH'
  | 'SELECTING_FISH'
  | 'SELECTING_QUANTITY'
  | 'CUSTOM_QUANTITY'
  | 'SELECTING_CUT'
  | 'CART'
  | 'SELECTING_ADDRESS'
  | 'ADDING_ADDRESS'
  | 'ADDING_REMARKS'
  | 'ORDER_REVIEW'
  | 'CONFIRMING_ORDER'
  | 'PROCESSING_ORDER'
  | 'ORDER_COMPLETED'
  | 'TRACK_ORDER'
  | 'PREVIOUS_ORDERS'
  | 'SUPPORT';

export interface WhatsAppButtonReply {
  id: string;
  title: string;
}

export interface WhatsAppListRow {
  id: string;
  title: string;
  description?: string;
}

export interface WhatsAppListSection {
  title: string;
  rows: WhatsAppListRow[];
}

export interface IncomingMessagePayload {
  from: string; // Phone number e.g. "15551964153"
  messageId: string;
  type: 'text' | 'button_reply' | 'list_reply' | string;
  text?: string;
  buttonId?: string;
  listId?: string;
}

export interface CartItem {
  product_id: string;
  product_name: string;
  quantity_kg: number;
  quantity?: number;
  cutting_type: string;
  unit_price: number;
  price_per_kg?: number;
  branch_id?: string;
  inventory_date?: string;
  subtotal: number;
}

export interface ChatSessionData {
  customer_id: string;
  state: BotState;
  cart: CartItem[];
  selected_product_id?: string | null;
  selected_quantity?: number | null;
  selected_cutting_type?: string | null;
  selected_address_id?: string | null;
  selected_branch_id?: string | null;
  pending_remarks?: string | null;
}
