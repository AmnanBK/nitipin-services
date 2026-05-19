import mongoose, { Schema, Document } from 'mongoose';

export interface IProof extends Document {
  order_id: number;
  type: string; // 'purchase' (bukti pembelian dari toko) | 'receipt' (bukti paket diterima)
  photo_url: string;
}

const ProofSchema = new Schema<IProof>({
  order_id: { type: Number, required: true },
  type: { type: String, required: true },
  photo_url: { type: String, required: true }
}, { timestamps: true });

export const ProofModel = mongoose.model<IProof>('Proof', ProofSchema);
