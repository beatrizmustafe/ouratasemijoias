export type ProductCategory =
  | 'Brincos'
  | 'Colares'
  | 'Pulseiras'
  | 'Anéis'
  | 'Conjuntos'
  | 'Tornozeleiras'
  | 'Pingentes'
  | 'Outros';

export interface TierPricing {
  minQty: number;
  unitPrice: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: ProductCategory;
  images: string[];
  price: number; // Retail price (Varejo)
  wholesalePrice: number; // Wholesale price (Atacado)
  minWholesaleQty: number;
  tieredPricing?: TierPricing[];
  stock: number;
  reservedStock: number;
  lowStockAlert: number;
  isFeatured?: boolean;
  isNewRelease?: boolean;
  isOffer?: boolean;
  platingType?: string;
  warranty?: string;
  minPurchaseQty?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Address {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  password?: string;
  phone: string;
  cpf?: string;
  role: 'admin' | 'customer';
  address?: Address;
  isVerified: boolean;
  verificationToken?: string;
  magicLinkToken?: string;
  favorites: string[];
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  image: string;
  unitPrice: number;
  quantity: number;
  isWholesaleApplied: boolean;
  subtotal: number;
}

export type OrderStatus =
  | 'AGUARDANDO CONFIRMAÇÃO DE PAGAMENTO'
  | 'PAGAMENTO CONFIRMADO'
  | 'PEDIDO EM SEPARAÇÃO'
  | 'PEDIDO ENVIADO'
  | 'PEDIDO ENTREGUE'
  | 'PEDIDO CANCELADO';

export interface Order {
  id: string; // e.g. OUR-2026-1042
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCpf?: string;
  shippingAddress: Address;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  isWholesaleOrder: boolean;
  status: OrderStatus;
  paymentMethodNotes: string;
  whatsappMessage: string;
  whatsappUrl: string;
  reservationExpiresAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type BathServiceStatus =
  | 'Solicitação recebida'
  | 'Aguardando recebimento'
  | 'Peças recebidas'
  | 'Em análise'
  | 'Em processo de banho'
  | 'Serviço concluído'
  | 'Aguardando envio'
  | 'Devolvido';

export interface BathServiceHistoryEntry {
  status: BathServiceStatus;
  date: string;
  notes?: string;
}

export interface BathService {
  id: string;
  protocol: string; // e.g. SB-2026-0042
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  pieceType: string;
  quantity: number;
  bathType: string;
  observations?: string;
  photoUrl?: string;
  status: BathServiceStatus;
  estimatedDays: number;
  priceQuote?: number;
  history: BathServiceHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  type: 'ENTRADA' | 'SAIDA_CONFIRMADA' | 'RESERVA' | 'LIBERACAO_CANCELAMENTO' | 'AJUSTE_MANUAL';
  quantity: number;
  previousStock: number;
  newStock: number;
  orderId?: string;
  reason: string;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  action: string;
  user: string;
  details: string;
  timestamp: string;
}
