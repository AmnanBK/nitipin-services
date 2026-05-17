import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db, connectMongo } from './config/db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8082;

app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    // Quick check on MySQL connection
    await db.query('SELECT 1');
    res.json({
      status: 'User Service is running',
      database: {
        mysql: 'connected',
        mongodb: 'connected (verified during startup)',
      },
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'User Service is degraded',
      error: error.message,
    });
  }
});

const startServer = async () => {
  // Try connecting to MongoDB on startup
  await connectMongo();
  
  app.listen(PORT, () => {
    console.log(`🚀 User Service is running on port ${PORT}`);
  });
};

startServer();
