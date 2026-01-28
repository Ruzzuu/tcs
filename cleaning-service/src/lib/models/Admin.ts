// ============================================
// ADMIN MODEL - Single Admin Authentication
// ============================================
// No registration - admin created via seed script only
// Email is recovery method, NOT identity
// Admin ID is the identity

import mongoose, { Schema, Document } from 'mongoose';

export interface IAdmin extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  email: string;
  passwordHash: string;
  
  // Pending email change (not yet verified)
  pendingEmail?: string;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  
  // Password reset
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  
  // Session management
  sessionVersion: number; // Increment to invalidate all sessions
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

const AdminSchema = new Schema<IAdmin>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    
    // Pending email change
    pendingEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    
    // Password reset
    passwordResetToken: String,
    passwordResetExpires: Date,
    
    // Session version - increment to invalidate all sessions
    sessionVersion: {
      type: Number,
      default: 1,
    },
    
    lastLoginAt: Date,
  },
  {
    timestamps: true,
  }
);

// Additional indexes (unique: true already creates index for email and username)
AdminSchema.index({ passwordResetToken: 1 });
AdminSchema.index({ emailVerificationToken: 1 });

export default mongoose.models.Admin || mongoose.model<IAdmin>('Admin', AdminSchema);
