import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { ProductModel } from '../models/productModel';

// 1. CREATE PRODUCT (Hanya Traveler)
export const createProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { product_name, description, price, photo_url } = req.body;
    const traveler_id = req.user?.id;

    if (!traveler_id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!product_name || !price) {
      res.status(400).json({ message: 'Nama produk dan harga wajib diisi' });
      return;
    }

    const insertId = await ProductModel.create({
      traveler_id,
      product_name,
      description,
      price: Number(price),
      photo_url
    });

    res.status(201).json({
      message: 'Produk berhasil ditambahkan',
      data: { id: insertId, product_name, price }
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
    const { product_name, description, price, photo_url } = req.body;
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

    await ProductModel.update(id, {
      product_name,
      description,
      price: Number(price),
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