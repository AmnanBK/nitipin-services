import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import { connectMongo, db } from './config/db';
import { initWebSocket } from './config/websocket';
import productRoutes from './routes/productRoutes';
import cartRoutes from './routes/cartRoutes';
import orderRoutes from './routes/orderRoutes';
import proofRoutes from './routes/proofRoutes';
import reviewRoutes from './routes/reviewRoutes';
import notificationRoutes from './routes/notificationRoutes';
import chatRoutes from './routes/chatRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8083;

// Bungkus express dengan HTTP server bawaan Node.js untuk socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware global
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Registrasi Route
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/orders', proofRoutes); // Endpoint proofs digabung ke prefix /api/orders
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chats', chatRoutes);

// Jalankan Database, WebSocket & Server
const startServer = async () => {
  await connectMongo();
  
  // Jalankan migrasi kolom is_deleted ke tabel product_catalog jika belum ada
  try {
    await db.execute('ALTER TABLE product_catalog ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0');
    console.log('✅ Migrasi: Kolom is_deleted berhasil ditambahkan ke product_catalog');
  } catch (err: any) {
    if (err.code !== 'ER_DUP_FIELDNAME') {
      console.error('❌ Migrasi Gagal:', err);
    } else {
      console.log('ℹ️ Migrasi: Kolom is_deleted sudah ada di product_catalog');
    }
  }
  
  // Inisialisasi WebSocket
  initWebSocket(io);
  
  server.listen(PORT, () => {
    console.log(`Product-Order Service berjalan di http://localhost:${PORT}`);
  });
};

startServer();