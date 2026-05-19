import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { ChatModel } from '../models/chatModel';

// POST /api/chats
export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const raw_sender_id = req.user?.id;
    const sender_role = req.user?.role;
    if (!raw_sender_id || !sender_role) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const { receiver_id, message } = req.body;

    if (!receiver_id || !message) {
      res.status(400).json({ message: 'receiver_id dan message wajib diisi' });
      return;
    }

    const receiver_role = sender_role === 'buyer' ? 'traveler' : 'buyer';
    const sender_id = `${sender_role}_${raw_sender_id}`;
    const formatted_receiver_id = `${receiver_role}_${receiver_id}`;

    if (sender_id === formatted_receiver_id) {
      res.status(400).json({ message: 'Tidak bisa mengirim pesan ke diri sendiri' });
      return;
    }

    const chat = await ChatModel.create({
      sender_id,
      receiver_id: formatted_receiver_id,
      message
    });

    res.status(201).json({ message: 'Pesan terkirim', data: chat });
  } catch (error) {
    console.error('[sendMessage]', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/chats/messages
export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const raw_user_id = req.user?.id;
    const user_role = req.user?.role;
    if (!raw_user_id || !user_role) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const { with_user_id } = req.query;
    if (!with_user_id) {
      res.status(400).json({ message: 'Parameter query with_user_id wajib diisi' });
      return;
    }

    const with_user_role = user_role === 'buyer' ? 'traveler' : 'buyer';
    const user_id = `${user_role}_${raw_user_id}`;
    const formatted_with_user_id = `${with_user_role}_${with_user_id}`;

    // Ambil riwayat chat antara dua orang ini
    const messages = await ChatModel.find({
      $or: [
        { sender_id: user_id, receiver_id: formatted_with_user_id },
        { sender_id: formatted_with_user_id, receiver_id: user_id }
      ]
    }).sort({ createdAt: 1 }); // Ascending: Pesan terlama di atas, terbaru di bawah (standar chat UI)

    res.status(200).json({ message: 'Riwayat chat', data: messages });
  } catch (error) {
    console.error('[getMessages]', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/chats/contacts
export const getContacts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const raw_user_id = req.user?.id;
    const user_role = req.user?.role;
    if (!raw_user_id || !user_role) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const user_id = `${user_role}_${raw_user_id}`;

    // Ambil daftar chat di mana user_id ini terlibat (entah sebagai sender atau receiver)
    // Diurutkan dari yang paling baru agar kontak terakhir ada di urutan teratas
    const chats = await ChatModel.find({
      $or: [
        { sender_id: user_id },
        { receiver_id: user_id }
      ]
    }).select('sender_id receiver_id -_id').sort({ createdAt: -1 });

    // Gunakan Set untuk mendapatkan ID unik (mencegah duplikat kontak)
    const contactsSet = new Set<string>();

    chats.forEach(chat => {
      const contact = chat.sender_id !== user_id ? chat.sender_id : chat.receiver_id;
      // Hapus prefix role ('traveler_' atau 'buyer_') sebelum mengembalikan ke frontend
      const raw_contact_id = contact.split('_')[1];
      if (raw_contact_id) {
        contactsSet.add(raw_contact_id);
      }
    });

    const contactsArray = Array.from(contactsSet);

    res.status(200).json({ message: 'Daftar kontak', data: contactsArray });
  } catch (error) {
    console.error('[getContacts]', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
