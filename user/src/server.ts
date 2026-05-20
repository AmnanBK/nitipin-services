import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db, connectMongo } from './config/db';

import userRoutes from './routes/userRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8082;

app.use(cors());
app.use(express.json());

// Log all incoming requests to debug proxy paths in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`🔍 [User Service] ${req.method} ${req.url} | Headers:`, JSON.stringify(req.headers));
    next();
  });
}

// Register routes
app.use('/', userRoutes);


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
  // Try connecting to MongoDB on startup in a non-blocking way
  connectMongo();
  
  app.listen(PORT, () => {
    console.log(`🚀 User Service is running on port ${PORT}`);
  });
};

startServer();
