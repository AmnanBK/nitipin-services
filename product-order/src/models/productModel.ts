import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { db } from '../config/db';

export interface ProductData {
  traveler_id: string;
  product_name: string;
  description?: string;
  price: number;
  photo_url?: string;
}

export interface ProductFilters {
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  traveler_id?: string;
}

export const ProductModel = {
  // 1. Tambah Produk
  async create(data: ProductData): Promise<number> {
    const { traveler_id, product_name, description, price, photo_url } = data;
    const [result] = await db.execute<ResultSetHeader>(
      'INSERT INTO product_catalog (traveler_id, product_name, description, price, photo_url) VALUES (?, ?, ?, ?, ?)',
      [traveler_id, product_name, description || null, price, photo_url || null]
    );
    return result.insertId;
  },

  // 2. Ambil Semua Produk (dengan filter & JOIN)
  async findAll(filters: ProductFilters): Promise<RowDataPacket[]> {
    let query = `
      SELECT p.*, t.name AS traveler_name, t.country_id
      FROM product_catalog p
      LEFT JOIN travelers t ON p.traveler_id = t.id
      WHERE p.is_deleted = 0
    `;
    const params: any[] = [];

    if (filters.search) {
      query += ` AND p.product_name LIKE ?`;
      params.push(`%${filters.search}%`);
    }
    if (filters.minPrice) {
      query += ` AND p.price >= ?`;
      params.push(filters.minPrice);
    }
    if (filters.maxPrice) {
      query += ` AND p.price <= ?`;
      params.push(filters.maxPrice);
    }
    if (filters.traveler_id) {
      query += ` AND p.traveler_id = ?`;
      params.push(filters.traveler_id);
    }

    const [rows] = await db.execute<RowDataPacket[]>(query, params);
    return rows;
  },

  // 3. Ambil Detail Produk
  async findById(id: string): Promise<RowDataPacket | null> {
    const [rows] = await db.execute<RowDataPacket[]>(
      `SELECT p.*, t.name AS traveler_name 
       FROM product_catalog p
       LEFT JOIN travelers t ON p.traveler_id = t.id
       WHERE p.id = ?`, 
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  },

  // 4. Edit Produk
  async update(id: string, data: Partial<ProductData>): Promise<void> {
    const { product_name, description, price, photo_url } = data;
    await db.execute(
      'UPDATE product_catalog SET product_name = ?, description = ?, price = ?, photo_url = ? WHERE id = ?',
      [product_name ?? null, description ?? null, price ?? null, photo_url ?? null, id]
    );
  },

  // 5. Hapus Produk
  async delete(id: string): Promise<void> {
    await db.execute('UPDATE product_catalog SET is_deleted = 1 WHERE id = ?', [id]);
  },

  // Cek apakah ada order aktif untuk produk ini
  async hasActiveOrders(id: string): Promise<boolean> {
    // Asumsi tabel orders memiliki kolom product_id dan status
    // Status aktif misalnya: 'pending', 'paid', 'processing', 'shipping'
    // Status tidak aktif: 'completed', 'cancelled'
    try {
      const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM orders 
         WHERE product_id = ? AND status NOT IN ('completed', 'cancelled')`,
        [id]
      );
      return rows[0].count > 0;
    } catch (error: any) {
      // Jika tabel orders belum ada atau error lain, kita bisa return false sementara
      // atau log errornya.
      if (error.code === 'ER_NO_SUCH_TABLE') {
        console.warn('Table orders does not exist yet. Skipping active orders check.');
        return false;
      }
      throw error;
    }
  }
};
