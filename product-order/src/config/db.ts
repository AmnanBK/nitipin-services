import mysql from 'mysql2/promise';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Koneksi MySQL (Cloud SQL)
export const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

// Koneksi MongoDB (GCE)
export const connectMongo = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log('MongoDB berhasil terkoneksi');
  } catch (error) {
    console.error('Koneksi MongoDB gagal:', error);
  }
};