// ============================================
// ORDER MODEL - MongoDB Schema
// ============================================

import mongoose, { Schema, Document, Model } from 'mongoose';
import { Order as OrderType, ServiceType, OrderStatus, VerificationStatus, OrderItem } from '@/types';

// Document interface
export interface OrderDocument extends Omit<OrderType, '_id'>, Document {}

// OrderItem sub-schema
const OrderItemSchema = new Schema({
  id: {
    type: String,
    required: true
  },
  serviceType: {
    type: String,
    required: true,
    enum: ['Deepclean', 'Deepclean_Sandal', 'Deepclean_Tas', 'deepclean_bag_small', 'deepclean_bag_large', 'one_day_service', 'unyellowing', 'sewing', 'sewing_dan_cuci', 'deepclean_kids', 'deepclean_topi', 'deepclean_fantofel', 'deepclean_member', 'deepclean_helm', 'whitening', 'repaint_leather', 'repaint_canvas', 'repaint_suede', 'lem'] as ServiceType[]
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  notes: {
    type: String,
    trim: true
  },
  customItemType: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

// Schema definition
const OrderSchema = new Schema<OrderDocument>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    
    // Customer Info
    name: {
      type: String,
      required: [true, 'Nama wajib diisi'],
      trim: true,
      index: true
    },
    phone: {
      type: String,
      required: [true, 'Nomor telepon wajib diisi'],
      trim: true,
      index: true
    },
    address: {
      type: String,
      default: '',
      trim: true
    },
    
    // Order Details - Multi-item support
    items: {
      type: [OrderItemSchema],
      required: false, // Optional for backwards compatibility with legacy orders
      default: undefined
    },
    
    // Legacy fields (for backwards compatibility)
    itemType: {
      type: String,
      enum: {
        values: ['Deepclean', 'Deepclean_Sandal', 'Deepclean_Tas', 'deepclean_bag_small', 'deepclean_bag_large', 'one_day_service', 'unyellowing', 'sewing', 'sewing_dan_cuci', 'deepclean_kids', 'deepclean_topi', 'deepclean_fantofel', 'deepclean_member', 'deepclean_helm', 'whitening', 'repaint_leather', 'repaint_canvas', 'repaint_suede', 'lem'] as ServiceType[],
        message: 'Jenis barang tidak valid'
      }
    },
    customItemType: {
      type: String,
      trim: true
    },
    quantity: {
      type: Number,
      min: [1, 'Jumlah minimal 1']
    },
    estimatedPrice: {
      type: Number,
      min: 0
    },
    
    // Pricing
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    finalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    
    // Discount information
    discount: {
      type: {
        type: String,
        enum: ['percentage', 'fixed']
      },
      value: {
        type: Number,
        min: 0
      }
    },
    
    // Pricing breakdown (removed - calculated from items)
    
    // Status Flow
    status: {
      type: String,
      enum: ['pending', 'finished', 'rejected'] as OrderStatus[],
      default: 'pending',
      index: true
    },
    
    // Verification (Anti-spam layer)
    verification: {
      status: {
        type: String,
        enum: ['unverified', 'approved', 'rejected'] as VerificationStatus[],
        default: 'unverified',
        index: true
      },
      verifiedAt: {
        type: Date
      }
    },
    
    // Photos (proof of work) - Cloudinary URLs + public_ids
    proofOfWork: {
      beforePhotos: [{
        url: { type: String },
        publicId: { type: String }
      }],
      afterPhotos: [{
        url: { type: String },
        publicId: { type: String }
      }]
    },

    // Nota Image - Cloudinary URL
    notaImage: {
      url: { type: String },
      publicId: { type: String }
    },
    
    // Customer notes (from order form)
    customerNotes: {
      type: String,
      default: ''
    },
    
    // Admin notes (internal)
    notes: {
      type: String,
      default: ''
    },
    
    // Finished timestamp
    finishedAt: {
      type: Date
    },

    // Rekap reference
    rekapId: {
      type: Schema.Types.ObjectId,
      ref: 'Rekap'
    },
    
    // Soft delete fields
    deleted: {
      type: Boolean,
      default: false,
      index: true
    },
    archivedAt: {
      type: Date
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound indexes for common queries
OrderSchema.index({ 'verification.status': 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ 'verification.status': 1, status: 1, finishedAt: -1 });
OrderSchema.index({ name: 'text', phone: 'text' }); // Text search

// Static methods
OrderSchema.statics.findPending = function () {
  return this.find({ 'verification.status': 'unverified' })
    .sort({ createdAt: -1 });
};

OrderSchema.statics.findApproved = function () {
  return this.find({ 'verification.status': 'approved' })
    .sort({ createdAt: -1 });
};

// Prevent model recompilation in development
const Order: Model<OrderDocument> = 
  mongoose.models.Order || mongoose.model<OrderDocument>('Order', OrderSchema);

export default Order;
