import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  order_id: number;
  traveler_id: string; // Berguna agar kita bisa ambil semua ulasan milik 1 traveler
  buyer_id: string;
  rating: number; // 1-5
  comment: string;
}

const ReviewSchema = new Schema<IReview>({
  order_id: { type: Number, required: true, unique: true }, // Satu order hanya bisa diberi 1 review
  traveler_id: { type: String, required: true },
  buyer_id: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true }
}, { timestamps: true });

export const ReviewModel = mongoose.model<IReview>('Review', ReviewSchema);
