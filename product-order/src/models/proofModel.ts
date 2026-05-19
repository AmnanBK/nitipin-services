import mongoose, { Schema, Document } from 'mongoose';

export interface IProof extends Document {
  order_id: number;
  uploader_type: string; // 'buyer' | 'traveler'
  uploader_id: string;
  proof_type: string; // 'purchase' | 'receipt'
  photo_url: string;
  description?: string;
}

const ProofSchema = new Schema<IProof>({
  order_id: { type: Number, required: true },
  uploader_type: { type: String, required: true },
  uploader_id: { type: String, required: true },
  proof_type: { type: String, required: true },
  photo_url: { type: String, required: true },
  description: { type: String }
}, { timestamps: true });

export const ProofModel = mongoose.model<IProof>('Proof', ProofSchema);
