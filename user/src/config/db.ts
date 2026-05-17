import mysql from 'mysql2/promise';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// MySQL Connection Pool (Cloud SQL)
export const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: { rejectUnauthorized: false },
});

// Test MySQL connection
db.getConnection()
  .then((conn) => {
    console.log('✅ Connected to MySQL database (User Service)');
    conn.release();
  })
  .catch((err) => {
    console.error('❌ MySQL connection failed (User Service):', err.message);
  });

// MongoDB Connection (GCE)
export const connectMongo = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/jastip_nosql';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB (User Service)');
  } catch (err: any) {
    console.error('❌ MongoDB connection failed (User Service):', err.message);
  }
};
