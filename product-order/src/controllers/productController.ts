import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { ProductModel } from '../models/productModel';
import { uploadToGCS } from '../utils/uploadHelper';

// 1. CREATE PRODUCT (Hanya Traveler)
export const createProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { product_name, description, price } = req.body;
    let { photo_url } = req.body;
    const traveler_id = req.user?.id;

    if (!traveler_id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!product_name || price === undefined || price === null) {
      res.status(400).json({ message: 'Nama produk dan harga wajib diisi' });
      return;
    }

    const parsedPrice = Number(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      res.status(400).json({ message: 'Harga harus berupa angka positif' });
      return;
    }

    // Jika ada file yang diunggah, proses unggah ke GCS
    if (req.file) {
      try {
        photo_url = await uploadToGCS(req.file.buffer, req.file.originalname, req.file.mimetype, 'products');
      } catch (uploadErr) {
        console.error('[createProduct GCS upload]', uploadErr);
        res.status(500).json({ message: 'Gagal mengunggah foto produk ke Cloud Storage' });
        return;
      }
    }

    const insertId = await ProductModel.create({
      traveler_id,
      product_name,
      description,
      price: parsedPrice,
      photo_url
    });

    res.status(201).json({
      message: 'Produk berhasil ditambahkan',
      data: { id: insertId, product_name, price: parsedPrice, photo_url }
    });
  } catch (error) {
    console.error('[createProduct]', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// 2. READ ALL PRODUCTS (Publik)
export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, traveler_id, minPrice, maxPrice } = req.query;

    const products = await ProductModel.findAll({
      search: search as string,
      traveler_id: traveler_id as string,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined
    });

    res.status(200).json({ message: 'Daftar produk berhasil diambil', data: products });
  } catch (error) {
    console.error('[getProducts]', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// 2b. SEARCH PRODUCT BY NAME (Publik)
export const searchProductByName = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.query;

    if (!name) {
      res.status(400).json({ message: 'Parameter name wajib diisi' });
      return;
    }

    const products = await ProductModel.findAll({
      search: name as string
    });

    res.status(200).json({ message: 'Hasil pencarian produk berdasarkan nama', data: products });
  } catch (error) {
    console.error('[searchProductByName]', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// 3. READ DETAIL PRODUCT (Publik)
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const product = await ProductModel.findById(id);

    if (!product) {
      res.status(404).json({ message: 'Produk tidak ditemukan' });
      return;
    }

    res.status(200).json({ message: 'Detail produk', data: product });
  } catch (error) {
    console.error('[getProductById]', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// 4. UPDATE PRODUCT (Hanya Traveler Pemilik Barang)
export const updateProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { product_name, description, price } = req.body;
    let { photo_url } = req.body;
    const traveler_id = req.user?.id;

    // Cek keberadaan dan kepemilikan
    const product = await ProductModel.findById(id);

    if (!product) {
      res.status(404).json({ message: 'Produk tidak ditemukan' });
      return;
    }

    if (String(product.traveler_id) !== String(traveler_id)) {
      res.status(403).json({ message: 'Forbidden: Ini bukan produk milikmu' });
      return;
    }

    let parsedPrice: number | undefined = undefined;
    if (price !== undefined && price !== null) {
      parsedPrice = Number(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        res.status(400).json({ message: 'Harga harus berupa angka positif' });
        return;
      }
    }

    // Jika ada file baru yang diunggah, proses unggah ke GCS
    if (req.file) {
      try {
        photo_url = await uploadToGCS(req.file.buffer, req.file.originalname, req.file.mimetype, 'products');
      } catch (uploadErr) {
        console.error('[updateProduct GCS upload]', uploadErr);
        res.status(500).json({ message: 'Gagal mengunggah foto produk baru ke Cloud Storage' });
        return;
      }
    }

    await ProductModel.update(id, {
      product_name,
      description,
      price: parsedPrice,
      photo_url
    });

    res.status(200).json({ message: 'Produk berhasil diupdate' });
  } catch (error) {
    console.error('[updateProduct]', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// 5. DELETE PRODUCT (Hanya Traveler Pemilik Barang)
export const deleteProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const traveler_id = req.user?.id;

    // Cek keberadaan dan kepemilikan
    const product = await ProductModel.findById(id);

    if (!product) {
      res.status(404).json({ message: 'Produk tidak ditemukan' });
      return;
    }

    if (String(product.traveler_id) !== String(traveler_id)) {
      res.status(403).json({ message: 'Forbidden: Ini bukan produk milikmu' });
      return;
    }

    // Cek apakah ada order aktif
    const hasActive = await ProductModel.hasActiveOrders(id);
    if (hasActive) {
      res.status(400).json({ message: 'Bad Request: Tidak bisa menghapus produk yang sedang dipesan (order aktif)' });
      return;
    }

    await ProductModel.delete(id);
    res.status(200).json({ message: 'Produk berhasil dihapus' });
  } catch (error) {
    console.error('[deleteProduct]', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};