import mongoose, { Schema, Document } from 'mongoose';

export interface ReviewDocument extends Document {
  traveler_id: number;
  buyer_id: number;
  buyer_name?: string;
  rating: number;
  comment?: string;
  created_at: Date;
}

const ReviewSchema = new Schema<ReviewDocument>({
  traveler_id: { type: Number, required: true },
  buyer_id: { type: Number, required: true },
  buyer_name: { type: String },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  created_at: { type: Date, default: Date.now },
});

// Apply index matching standard jastip schema
ReviewSchema.index({ traveler_id: 1, created_at: -1 });

// Explicitly bind to 'reviews' collection
export const Review = mongoose.model<ReviewDocument>('Review', ReviewSchema, 'reviews');
