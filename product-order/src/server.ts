import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectMongo } from './config/db';
import productRoutes from './routes/productRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8083;

// Middleware global
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Registrasi Route
app.use('/api/products', productRoutes);

// Jalankan Database & Server
const startServer = async () => {
  await connectMongo();
  
  app.listen(PORT, () => {
    console.log(`Product-Order Service berjalan di http://localhost:${PORT}`);
  });
};

startServer();