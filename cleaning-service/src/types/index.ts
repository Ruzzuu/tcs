// ============================================
// TYPE DEFINITIONS
// ============================================

export interface Order {
  _id: string;
  orderNumber: string;
  
  // Customer Info
  name: string;
  phone: string;
  address: string;
  
  // Order Details
  itemType: ServiceType;
  quantity: number;
  estimatedPrice: number;
  finalPrice?: number;
  
  // Status
  status: OrderStatus;
  
  // Verification
  verification: {
    status: VerificationStatus;
    verifiedAt?: Date;
  };
  
  // Proof of Work
  proofOfWork?: {
    beforePhotos: string[];
    afterPhotos: string[];
  };

  // Custom Item
  customItemType?: string;
  
  // Notes
  notes: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  finishedAt?: Date;
  expireAt?: Date;
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
