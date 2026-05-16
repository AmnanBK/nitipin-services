import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8081;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'Auth Service is running' });
});

// TODO: Tambahkan routes untuk register dan login di sini

app.listen(PORT, () => {
  console.log(`🚀 Auth Service is running on port ${PORT}`);
});
