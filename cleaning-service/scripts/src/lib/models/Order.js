"use strict";
// ============================================
// ORDER MODEL - MongoDB Schema
// ============================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = __importStar(require("mongoose"));
// OrderItem sub-schema
var OrderItemSchema = new mongoose_1.Schema({
    id: {
        type: String,
        required: true
    },
    serviceType: {
        type: String,
        required: true,
        enum: ['sepatu', 'sandal', 'tas_ransel', 'tas_gunung', 'topi', 'helm', 'one_day_service', 'unyellowing', 'whitening', 'sewing', 'repaint_canvas', 'repaint_leather', 'repaint_suede', 'other']
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
var OrderSchema = new mongoose_1.Schema({
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
            values: ['sepatu', 'sandal', 'tas_ransel', 'tas_gunung', 'topi', 'helm', 'one_day_service', 'unyellowing', 'whitening', 'sewing', 'repaint_canvas', 'repaint_leather', 'repaint_suede', 'other'],
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
        enum: ['pending', 'in_progress', 'finished', 'delivered', 'picked_up'],
        default: 'pending',
        index: true
    },
    // Verification (Anti-spam layer)
    verification: {
        status: {
            type: String,
            enum: ['unverified', 'approved', 'rejected'],
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
        type: mongoose_1.Schema.Types.ObjectId,
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
    },
    // TTL Auto-deletion
    expireAt: {
        type: Date
        // Note: index is defined separately with TTL options below
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// TTL Index: Auto-delete documents after expireAt
OrderSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
// Compound indexes for common queries
OrderSchema.index({ 'verification.status': 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ name: 'text', phone: 'text' }); // Text search
// Pre-save middleware
OrderSchema.pre('save', function () {
    // Set expireAt when order is finished (30 days TTL)
    if (this.status === 'finished' && !this.expireAt) {
        this.expireAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        this.finishedAt = new Date();
    }
});
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
var Order = mongoose_1.default.models.Order || mongoose_1.default.model('Order', OrderSchema);
exports.default = Order;
