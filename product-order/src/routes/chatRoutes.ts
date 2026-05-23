import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { sendMessage, getMessages, getContacts, markMessagesAsRead } from '../controllers/chatController';

const router = Router();

// Endpoint Chat sangat sensitif, wajib menggunakan autentikasi (login)
router.use(authMiddleware);

// POST /api/chats -> Kirim pesan
router.post('/', sendMessage);

// GET /api/chats/messages?with_user_id=123 -> Riwayat obrolan dengan satu orang
router.get('/messages', getMessages);

// GET /api/chats/contacts -> Daftar semua orang yang pernah berinteraksi
router.get('/contacts', getContacts);

// PUT /api/chats/read/:with_user_id -> Tandai semua pesan dari kontak ini sebagai terbaca
router.put('/read/:with_user_id', markMessagesAsRead);

export default router;

