import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  order_id: number;
  traveler_id: number; // Align with user service (number)
  buyer_id: number; // Align with user service (number)
  buyer_name?: string; // Align with user service
  rating: number; // 1-5
  comment: string;
  created_at: Date;
  updated_at: Date;
}

const ReviewSchema = new Schema<IReview>({
  order_id: { type: Number, required: true, unique: true }, // Satu order hanya bisa diberi 1 review
  traveler_id: { type: Number, required: true },
  buyer_id: { type: Number, required: true },
  buyer_name: { type: String },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

export const ReviewModel = mongoose.model<IReview>('Review', ReviewSchema, 'reviews');
