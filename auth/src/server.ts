import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8081;

app.use(cors());
app.use(express.json());

// Routes — mounted at root and /api/auth because of consistent proxy mapping in Gateway
app.use('/', authRoutes);
app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'Auth Service is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Auth Service is running on port ${PORT}`);
});
