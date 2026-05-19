import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/authMiddleware';
import { uploadProof, getProofs } from '../controllers/proofController';

// Gunakan memoryStorage agar file tidak disimpan di disk/harddisk lokal server, 
// melainkan ditampung di RAM (buffer) sejenak sebelum dilempar ke GCS.
const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// Endpoint untuk menambahkan bukti pada suatu order. 
// Field form-data untuk file wajib bernama 'photo'
router.post('/:id/proofs', authMiddleware, upload.single('photo'), uploadProof);

// Endpoint untuk mengambil daftar bukti
router.get('/:id/proofs', authMiddleware, getProofs);

export default router;
