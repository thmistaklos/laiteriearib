import { Product, OrderStatus } from './types';

export const ADMIN_EMAIL = 'admin@laiterie.com';

export const INITIAL_PRODUCTS: Product[] = [
  { id: 'prod_1', name: 'Premium Coffee Beans', description: '1kg bag of whole arabica beans.', price: 25.99, imageUrl: 'https://picsum.photos/seed/coffeebeans/200/200', barcode: '1234567890123', quantityType: 'kg', stock: 100, isVisible: true },
  { id: 'prod_2', name: 'Artisan Tea Selection', description: 'Box of 20 assorted tea bags.', price: 15.50, imageUrl: 'https://picsum.photos/seed/teabox/200/200', barcode: '1234567890124', quantityType: 'unit', stock: 50, isVisible: true },
  { id: 'prod_3', name: 'Organic Chocolate Bar', description: '70% cocoa, fair trade.', price: 5.00, imageUrl: 'https://picsum.photos/seed/chocolatebar/200/200', barcode: '1234567890125', quantityType: 'unit', stock: 200, isVisible: true },
  { id: 'prod_4', name: 'Fresh Croissants (Dozen)', description: 'Baked fresh daily.', price: 12.00, imageUrl: 'https://picsum.photos/seed/croissants/200/200', barcode: '1234567890126', quantityType: 'unit', stock: 30, isVisible: true },
  { id: 'prod_5', name: 'Gourmet Cheese Platter', description: 'Selection of three fine cheeses.', price: 30.00, imageUrl: 'https://picsum.photos/seed/cheeseplatter/200/200', barcode: '1234567890127', quantityType: 'unit', stock: 20, isVisible: true },
  { id: 'prod_6', name: 'Sparkling Water (6-pack)', description: 'Natural mineral water.', price: 8.75, imageUrl: 'https://picsum.photos/seed/sparklingwater/200/200', barcode: '1234567890128', quantityType: 'unit', stock: 150, isVisible: true },
];

export const ALL_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.PREPARING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
];