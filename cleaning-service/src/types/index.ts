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
  id: string; // Unique ID for the item
  serviceType: ServiceType;
  quantity: number;
  unitPrice: number; // Price per unit at time of order
  subtotal: number; // unitPrice * quantity
  notes?: string; // Item-specific notes
  customItemType?: string; // For 'other' service type
}

// Order - main order interface
export interface Order {
  _id: string;
  orderNumber: string;
  name: string;
  phone: string;
  address: string;
  itemType?: ServiceType; // Legacy single-item orders
  quantity?: number;
  items?: OrderItem[]; // Multi-item orders (new feature)
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
  // Verification
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
  // Proof of Work
  proofOfWork?: {
    beforePhotos: CloudinaryImage[];
    afterPhotos: CloudinaryImage[];
  };
  customerNotes?: string; // Notes from customer when ordering
  notes: string; // Admin internal notes
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  finishedAt?: Date;
  // Rekap reference
  rekapId?: string;
  // Soft delete
  deleted?: boolean;
  archivedAt?: Date;
}

export type ServiceType =
  // Cleaning - Normal
  | 'Deepclean'
  | 'Deepclean_Sandal'
  | 'Deepclean_Tas'
  | 'deepclean_bag_small'
  | 'deepclean_bag_large'
  | 'tas_gunung'
  | 'topi'
  | 'helm'
  | 'one_day_service'
  // Treatment
  | 'unyellowing'
  | 'whitening'
  | 'sewing'
  | 'repaint_canvas'
  | 'repaint_leather'
  | 'repaint_suede'
  // Other;

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
}

// Order - main order interface
export interface Order {
  _id: string;
  orderNumber: string;
  name: string;
  phone: string;
  address: string;
  itemType?: ServiceType; // Legacy single-item orders
  quantity?: number;
  items?: OrderItem[]; // Multi-item orders (new feature)
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
  // Verification
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
  // Proof of Work
  proofOfWork?: {
    beforePhotos: CloudinaryImage[];
    afterPhotos: CloudinaryImage[];
    };
  customerNotes?: string; // Notes from customer when ordering
  notes: string; // Admin internal notes
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  finishedAt?: Date;
  // Rekap reference
  rekapId?: string;
  // Soft delete
  deleted?: boolean;
  archivedAt?: Date;
}

export type OrderStatus = 'pending' | 'in_progress' | 'finished' | 'delivered' | 'picked_up' | 'rejected';

export type VerificationStatus = 'unverified' | 'approved' | 'rejected';

export interface ServiceConfig {
  name: string;
  nameEn: string;
  price: number;
  icon: string;
}
