import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectMongo } from './config/db';
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


// Jalankan Database & Server
const startServer = async () => {
  await connectMongo();
  
  app.listen(PORT, () => {
    console.log(`Product-Order Service berjalan di http://localhost:${PORT}`);
  });
};

startServer();