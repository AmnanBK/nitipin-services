import { Request, Response } from 'express';
import { db } from '../config/db';

// 1. CREATE PRODUCT (Hanya Traveler)
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { product_name, description, price, photo_url } = req.body;
    const traveler_id = req.user?.id;

    if (!product_name || !price) {
      res.status(400).json({ message: 'Nama produk dan harga wajib diisi' });
      return;
    }

    const [result] = await db.execute(
      'INSERT INTO product_catalog (traveler_id, product_name, description, price, photo_url) VALUES (?, ?, ?, ?, ?)',
      [traveler_id, product_name, description || null, price, photo_url || null]
    );

    res.status(201).json({
      message: 'Produk berhasil ditambahkan',
      data: { id: (result as any).insertId, product_name, price }
    });
  } catch (error) {
    console.error('[createProduct]', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// 2. READ ALL PRODUCTS (Publik)
export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, traveler_id } = req.query;
    let query = `
      SELECT p.*, t.name as traveler_name 
      FROM product_catalog p 
      JOIN travelers t ON p.traveler_id = t.id 
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      query += ` AND p.product_name LIKE ?`;
      params.push(`%${search}%`);
    }

    if (traveler_id) {
      query += ` AND p.traveler_id = ?`;
      params.push(traveler_id);
    }

    const [rows] = await db.execute(query, params);
    res.status(200).json({ message: 'Daftar produk berhasil diambil', data: rows });
  } catch (error) {
    console.error('[getProducts]', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// 3. READ DETAIL PRODUCT (Publik)
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute('SELECT * FROM product_catalog WHERE id = ?', [id]);
    const products = rows as any[];

    if (products.length === 0) {
      res.status(404).json({ message: 'Produk tidak ditemukan' });
      return;
    }

    res.status(200).json({ message: 'Detail produk', data: products[0] });
  } catch (error) {
    console.error('[getProductById]', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// 4. UPDATE PRODUCT (Hanya Traveler Pemilik Barang)
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { product_name, description, price, photo_url } = req.body;
    const traveler_id = req.user?.id;

    // Cek kepemilikan
    const [rows] = await db.execute('SELECT traveler_id FROM product_catalog WHERE id = ?', [id]);
    const products = rows as any[];

    if (products.length === 0) {
      res.status(404).json({ message: 'Produk tidak ditemukan' });
      return;
    }

    if (products[0].traveler_id !== traveler_id) {
      res.status(403).json({ message: 'Forbidden: Ini bukan produk milikmu' });
      return;
    }

    await db.execute(
      'UPDATE product_catalog SET product_name = ?, description = ?, price = ?, photo_url = ? WHERE id = ?',
      [product_name, description || null, price, photo_url || null, id]
    );

    res.status(200).json({ message: 'Produk berhasil diupdate' });
  } catch (error) {
    console.error('[updateProduct]', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// 5. DELETE PRODUCT (Hanya Traveler Pemilik Barang)
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const traveler_id = req.user?.id;

    // Cek kepemilikan
    const [rows] = await db.execute('SELECT traveler_id FROM product_catalog WHERE id = ?', [id]);
    const products = rows as any[];

    if (products.length === 0) {
      res.status(404).json({ message: 'Produk tidak ditemukan' });
      return;
    }

    if (products[0].traveler_id !== traveler_id) {
      res.status(403).json({ message: 'Forbidden: Ini bukan produk milikmu' });
      return;
    }

    await db.execute('DELETE FROM product_catalog WHERE id = ?', [id]);
    res.status(200).json({ message: 'Produk berhasil dihapus' });
  } catch (error) {
    console.error('[deleteProduct]', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};