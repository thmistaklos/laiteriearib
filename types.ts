
export interface Product {
  id: string;
  name: string;
  description?: string;
  price?: number; // Price per unit or per kg based on quantityType
  imageUrl: string; // Can be a web URL or a base64 data URL
  barcode?: string;
  quantityType?: 'unit' | 'kg'; // Default 'unit'
  stock?: number; // Current stock level
}

export interface OrderItemType {
  product: Product;
  quantity: number; // For 'unit' type, this is item count. For 'kg' type, this is weight (e.g., 0.5 for 500g).
}

export enum OrderStatus {
  PENDING = "Pending",
  PREPARING = "In Preparation",
  SHIPPED = "Shipped",
  DELIVERED = "Delivered",
  CANCELLED = "Cancelled",
}

export interface OrderType {
  id: string;
  storeName: string;
  userEmail: string;
  items: OrderItemType[];
  orderDate: string;
  status: OrderStatus;
  totalAmount?: number;
}

export interface UserSession {
  email: string;
  storeName: string;
}
