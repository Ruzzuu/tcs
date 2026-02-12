// ============================================
// TYPE DEFINITIONS
// ============================================

// Cloudinary Image type
export interface CloudinaryImage {
  url: string;
  publicId: string;
}

// Order Item - represents a single item in an order
export interface OrderItem {
  _id?: string;
  id: string; // Unique ID for the item
  serviceType: ServiceType;
  quantity: number;
  unitPrice: number; // Price per unit at time of order
  subtotal: number; // unitPrice * quantity
  notes?: string; // Item-specific notes
  customItemType?: string; // For 'other' service type
  createdAt: Date;
}

export interface Order {
  _id: string;
  orderNumber: string;
  
  // Customer Info
  name: string;
  phone: string;
  address: string;
  
  // Order Details - NEW: Multi-item support
  items?: OrderItem[]; // Array of items in this order (optional for legacy orders)
  
  // Legacy fields (kept for backwards compatibility during migration)
  itemType?: ServiceType;
  quantity?: number;
  estimatedPrice?: number;
  customItemType?: string;
  
  // Pricing
  subtotal: number; // Sum of all item subtotals
  finalPrice: number; // Total after discount
  
  // Discount
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  
  // Status
  status: OrderStatus;
  
  // Verification
  verification: {
    status: VerificationStatus;
    verifiedAt?: Date;
  };
  
  // Proof of Work (Cloudinary URLs)
  proofOfWork?: {
    beforePhotos: CloudinaryImage[];
    afterPhotos: CloudinaryImage[];
  };

  // Nota Image (Cloudinary URL)
  notaImage?: CloudinaryImage;
  
  // Notes
  customerNotes?: string; // Notes from customer when ordering
  notes: string; // Admin internal notes
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  finishedAt?: Date;
  expireAt?: Date;
  
  // Rekap reference
  rekapId?: string;
  
  // Soft delete
  deleted?: boolean;
  archivedAt?: Date;
}

export type ServiceType = 
  // Cleaning - Normal
  | 'sepatu' 
  | 'sandal' 
  | 'tas_ransel' 
  | 'tas_gunung' 
  | 'topi' 
  | 'helm' 
  | 'one_day_service'
  // Treatment
  | 'unyellowing'
  | 'whitening'
  | 'sewing'
  // Repaint
  | 'repaint_canvas'
  | 'repaint_leather'
  | 'repaint_suede'
  // Other
  | 'other';

export type OrderStatus = 'pending' | 'in_progress' | 'finished' | 'delivered' | 'picked_up';

export type VerificationStatus = 'unverified' | 'approved' | 'rejected';

export interface ServiceConfig {
  name: string;
  nameEn: string;
  price: number;
  icon: string;
}

export interface DashboardData {
  total: number;
  pending: number;
  inProgress: number;
  delivered: number;
  finished: number;
  unverified: number;
  serviceDistribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  incomeTrend: Array<{
    day: string;
    amount: number;
  }>;
  recentOrders: Order[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface OrderFormData {
  name: string;
  phone: string;
  address: string;
  itemType: ServiceType | '';
  customItemType?: string;
  quantity: number;
  notes?: string;
}

export interface VerifyAction {
  action: 'approved' | 'rejected';
}

export interface UpdateOrderData {
  status?: OrderStatus;
  notes?: string;
  beforePhoto?: string;
  afterPhoto?: string;
  finalPrice?: number;
}

// Phone Autocomplete Component
export interface PhoneAutocompleteProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export interface PhoneCacheData {
  phones: string[];
  timestamp: number;
}
