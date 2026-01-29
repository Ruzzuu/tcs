import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface RekapDocument extends Document {
  orderId: Types.ObjectId;
  amount: number;
  immutable: boolean;
  balanceSnapshot: number;
  createdAt: Date;
}

const RekapSchema = new Schema<RekapDocument>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
      unique: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    immutable: {
      type: Boolean,
      required: true,
      default: false,
      index: true
    },
    balanceSnapshot: {
      type: Number,
      required: true,
      default: 0
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: false
  }
);

RekapSchema.index({ createdAt: -1 });
RekapSchema.index({ immutable: 1, createdAt: -1 });

const Rekap: Model<RekapDocument> = 
  mongoose.models.Rekap || mongoose.model<RekapDocument>('Rekap', RekapSchema);

export default Rekap;
// ---