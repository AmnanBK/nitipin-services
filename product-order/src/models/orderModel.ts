import { ResultSetHeader, PoolConnection } from 'mysql2/promise';

export interface OrderData {
  buyer_id: string;
  traveler_id: string;
  product_id: string;
  quantity: number;
  total_price: number;
  shipping_address_id: string;
  status: string; // 'pending_review'
}

export const OrderModel = {
  // Menggunakan PoolConnection agar mendukung Transaction
  async create(data: OrderData, conn: PoolConnection): Promise<number> {
    const { buyer_id, traveler_id, product_id, quantity, total_price, shipping_address_id, status } = data;
    
    const [result] = await conn.execute<ResultSetHeader>(
      `INSERT INTO orders (buyer_id, traveler_id, product_id, quantity, total_price, shipping_address_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [buyer_id, traveler_id, product_id, quantity, total_price, shipping_address_id, status]
    );
    
    return result.insertId;
  }
};
