import { NotificationModel } from '../models/notificationModel';

export const sendNotification = async (
  user_id: string,
  user_type: string,
  title: string,
  message: string,
  order_id?: number
): Promise<void> => {
  try {
    await NotificationModel.create({
      user_id,
      user_type,
      title,
      message,
      order_id
    });
    console.log(`[Notification] Terkirim ke ${user_type} (ID: ${user_id}) - ${title}`);
  } catch (error) {
    console.error('[Notification Error] Gagal menyimpan notifikasi:', error);
  }
};
