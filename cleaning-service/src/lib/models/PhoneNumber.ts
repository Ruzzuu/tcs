// ============================================
// PHONE NUMBER MODEL - MongoDB Schema
// ============================================

import mongoose, { Schema, Document, Model } from 'mongoose';

// Document interface
export interface PhoneNumberDocument extends Document {
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}

// Schema definition
const PhoneNumberSchema = new Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Model
const PhoneNumber: Model<PhoneNumberDocument> =
  mongoose.models.PhoneNumber || mongoose.model<PhoneNumberDocument>('PhoneNumber', PhoneNumberSchema);

export default PhoneNumber;
