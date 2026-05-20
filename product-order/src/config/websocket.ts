import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ChatModel } from '../models/chatModel';

// Map untuk melacak user online. Key: "role_id" (contoh: "buyer_123" atau "traveler_42"), Value: Socket ID
export const userSockets = new Map<string, string>();

export const initWebSocket = (io: Server) => {
  // Middleware Autentikasi untuk Koneksi WebSocket
  io.use((socket: Socket, next) => {
    // 1. Cek header yang disuntikkan oleh API Gateway
    const gatewayId = socket.handshake.headers['x-user-id'];
    const gatewayRole = socket.handshake.headers['x-user-role'];

    if (gatewayId && gatewayRole) {
      (socket as any).user = {
        id: gatewayId as string,
        role: gatewayRole as 'buyer' | 'traveler',
      };
      return next();
    }

    // 2. Fallback: Verifikasi JWT secara langsung (berguna untuk testing lokal)
    // Token bisa dikirim di query params (contoh: ws://localhost:8083?token=xxx) atau handshake auth
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication error: Token tidak disertakan'));
    }

    // Bersihkan token dari prefix Bearer jika ada
    const cleanToken = token.startsWith('Bearer ') ? token.split(' ')[1] : token;

    try {
      const decoded = jwt.verify(
        cleanToken,
        process.env.JWT_SECRET || 'jastip_super_secret_key_2024'
      ) as any;

      (socket as any).user = {
        id: decoded.userId || decoded.id,
        role: decoded.role as 'buyer' | 'traveler',
      };
      next();
    } catch (err) {
      next(new Error('Authentication error: Token tidak valid atau kadaluwarsa'));
    }
  });

  // Event handler ketika Client terkoneksi
  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    if (!user) {
      socket.disconnect();
      return;
    }

    // Simpan koneksi user berdasarkan role dan ID
    const userId = `${user.role}_${user.id}`;
    userSockets.set(userId, socket.id);
    console.log(`[WebSocket] User terhubung: ${userId} (Socket ID: ${socket.id})`);

    // Event: sendMessage
    socket.on('sendMessage', async (data: { receiverId: string | number; message: string }) => {
      try {
        const { receiverId, message } = data;

        if (!receiverId || !message) {
          socket.emit('error', { message: 'receiverId dan message wajib disertakan' });
          return;
        }

        const senderRole = user.role;
        const receiverRole = senderRole === 'buyer' ? 'traveler' : 'buyer';
        const formattedReceiverId = `${receiverRole}_${receiverId}`;

        if (userId === formattedReceiverId) {
          socket.emit('error', { message: 'Tidak bisa mengirim pesan ke diri sendiri' });
          return;
        }

        // Simpan pesan ke MongoDB
        const chat = await ChatModel.create({
          sender_id: userId,
          receiver_id: formattedReceiverId,
          message,
        });

        console.log(`[WebSocket] Pesan dikirim dari ${userId} ke ${formattedReceiverId}`);

        // Kirim pesan secara real-time ke penerima jika sedang online
        const receiverSocketId = userSockets.get(formattedReceiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('receiveMessage', chat);
          console.log(`[WebSocket] Pesan di-broadcast ke socket ${receiverSocketId}`);
        }

        // Berikan konfirmasi pengiriman sukses kembali ke pengirim
        socket.emit('messageSent', chat);
      } catch (error) {
        console.error('[WebSocket sendMessage error]', error);
        socket.emit('error', { message: 'Gagal mengirim pesan melalui WebSocket' });
      }
    });

    // Event: disconnect
    socket.on('disconnect', () => {
      userSockets.delete(userId);
      console.log(`[WebSocket] User terputus: ${userId}`);
    });
  });
};
