import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  user_id: string;
  user_type: string; // 'buyer' | 'traveler'
  title: string;
  message: string;
  order_id?: number;
  is_read: boolean;
}

const NotificationSchema = new Schema<INotification>({
  user_id: { type: String, required: true },
  user_type: { type: String, required: true }, // Untuk membedakan notifikasi traveler atau buyer
  title: { type: String, required: true },
  message: { type: String, required: true },
  order_id: { type: Number },
  is_read: { type: Boolean, default: false }
}, { timestamps: true });

export const NotificationModel = mongoose.model<INotification>('Notification', NotificationSchema);
