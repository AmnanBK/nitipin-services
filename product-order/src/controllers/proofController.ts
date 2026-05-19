import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { ProofModel } from '../models/proofModel';
import { uploadToGCS } from '../utils/uploadHelper';

// POST /api/orders/:id/proofs
export const uploadProof = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: order_id } = req.params;
    const uploader_id = req.user?.id;
    const uploader_type = req.user?.role; // 'buyer' atau 'traveler'

    if (!uploader_id || !uploader_type) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { proof_type, description } = req.body;

    if (!proof_type || (proof_type !== 'purchase' && proof_type !== 'receipt')) {
      res.status(400).json({ message: 'proof_type harus bernilai purchase atau receipt' });
      return;
    }

    // Mengambil file dari request (di-parse oleh multer)
    const file = req.file;
    if (!file) {
      res.status(400).json({ message: 'File foto bukti (photo) wajib diunggah' });
      return;
    }

    // Upload file ke Google Cloud Storage
    const photo_url = await uploadToGCS(file.buffer, file.originalname, file.mimetype);

    // Simpan data foto ke MongoDB
    const proof = await ProofModel.create({
      order_id: Number(order_id),
      uploader_type,
      uploader_id,
      proof_type,
      photo_url,
      description
    });

    res.status(201).json({
      message: 'Bukti (proof) berhasil diunggah',
      data: proof
    });
  } catch (error) {
    console.error('[uploadProof]', error);
    res.status(500).json({ message: 'Gagal mengunggah bukti ke GCS/MongoDB' });
  }
};

// GET /api/orders/:id/proofs
export const getProofs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: order_id } = req.params;
    
    // Ambil semua foto bukti untuk order ini
    const proofs = await ProofModel.find({ order_id: Number(order_id) });

    res.status(200).json({
      message: 'Daftar bukti berhasil diambil',
      data: proofs
    });
  } catch (error) {
    console.error('[getProofs]', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
