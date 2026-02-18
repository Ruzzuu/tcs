// ============================================
//    TYPE DEFINITIONS
// ============================================

// Cloudinary Image type
export interface CloudinaryImage {
  url: string;
  publicId: string;
}

// Order Item - represents a single item in an order
export interface OrderItem {
  _id?: string;
  id: string;
  serviceType: ServiceType;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string;
  customItemType?: string;
  createdAt?: Date;
}

// Order - main order interface
export interface Order {
  _id: string;
  orderNumber: string;
  name: string;
  phone: string;
  address: string;
  itemType?: ServiceType;
  quantity?: number;
  items?: OrderItem[];
  customItemType?: string;
  estimatedPrice?: number;
  subtotal: number;
  finalPrice: number;
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  verification?: {
    status: VerificationStatus;
    verifiedAt?: Date;
    verifiedBy?: string;
    proofOfWork?: {
      beforePhotos: CloudinaryImage[];
      afterPhotos: CloudinaryImage[];
    };
    notes?: string;
  };
  proofOfWork?: {
    beforePhotos: CloudinaryImage[];
    afterPhotos: CloudinaryImage[];
  };
  customerNotes?: string;
  notes: string;
  finishedAt?: Date;
  rekapId?: string;
  deleted?: boolean;
  archivedAt?: Date;
  notaImage?: CloudinaryImage;
}

export type ServiceType =
  | 'Deepclean'
  | 'Deepclean_Sandal'
  | 'Deepclean_Tas'
  | 'deepclean_bag_small'
  | 'deepclean_bag_large'
  | 'tas_gunung'
  | 'topi'
  | 'helm'
  | 'one_day_service'
  | 'unyellowing'
  | 'whitening'
  | 'sewing'
  | 'repaint_canvas'
  | 'repaint_leather'
  | 'repaint_suede'
  | 'other';

export type OrderStatus = 'pending' | 'in_progress' | 'finished' | 'delivered' | 'picked_up' | 'rejected';

export type VerificationStatus = 'unverified' | 'approved' | 'rejected';

export interface ServiceConfig {
  name: string;
  nameEn: string;
  price: number;
  icon: string;
}

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

export interface DashboardData {
  total: number;
  pending: number;
  inProgress: number;
  delivered: number;
  pickedUp: number;
  finished: number;
  serviceDistribution: Array<{ name: string; value: number; color: string }>;
  incomeTrend: Array<{ day: string; date: string; amount: number }>;
  recentOrders: Order[];
}
