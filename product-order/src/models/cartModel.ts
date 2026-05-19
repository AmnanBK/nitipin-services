import mongoose, { Schema, Document } from 'mongoose';

export interface ICartItem {
  product_id: string; // Merujuk ke ID MySQL (Product Catalog)
  quantity: number;
  notes?: string;
}

export interface ICart extends Document {
  buyer_id: string;
  items: ICartItem[];
}

const CartItemSchema = new Schema<ICartItem>({
  product_id: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  notes: { type: String }
});

const CartSchema = new Schema<ICart>({
  buyer_id: { type: String, required: true, unique: true },
  items: [CartItemSchema]
}, { timestamps: true });

export const CartModel = mongoose.model<ICart>('Cart', CartSchema);
