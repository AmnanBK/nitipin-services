import mongoose, { Schema, Document } from 'mongoose';

export interface IChat extends Document {
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean;
}

const ChatSchema = new Schema<IChat>({
  sender_id: { type: String, required: true },
  receiver_id: { type: String, required: true },
  message: { type: String, required: true },
  is_read: { type: Boolean, default: false }
}, { timestamps: true }); // Menggunakan timestamps: true akan otomatis membuat kolom createdAt dan updatedAt

export const ChatModel = mongoose.model<IChat>('Chat', ChatSchema);
