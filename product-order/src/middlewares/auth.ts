import { Request, Response, NextFunction } from 'express';

// Deklarasi tipe tambahan untuk Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: 'traveler' | 'buyer';
        name: string;
      };
    }
  }
}

// Middleware untuk membaca header dari API Gateway
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const userId = req.headers['x-user-id'];
  const role = req.headers['x-user-role'];
  const name = req.headers['x-user-name'];

  if (!userId || !role) {
    res.status(401).json({ message: 'Unauthorized: Akses ditolak oleh Internal Service' });
    return;
  }

  req.user = {
    id: Number(userId),
    role: role as 'traveler' | 'buyer',
    name: name as string,
  };
  
  next();
};

// Middleware untuk membatasi role tertentu (misal: hanya traveler yang bisa tambah barang)
export const authorizeRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Forbidden: Kamu tidak memiliki akses untuk aksi ini' });
      return;
    }
    next();
  };
};