import { ResultSetHeader, PoolConnection } from 'mysql2/promise';

export interface EscrowData {
  order_id: number;
  amount: number;
  status: string; // 'hold'
}

export const EscrowModel = {
  // Menggunakan PoolConnection agar mendukung Transaction
  async create(data: EscrowData, conn: PoolConnection): Promise<number> {
    const { order_id, amount, status } = data;
    
    const [result] = await conn.execute<ResultSetHeader>(
      `INSERT INTO escrow_payments (order_id, amount, status) VALUES (?, ?, ?)`,
      [order_id, amount, status]
    );
    
    return result.insertId;
  }
};
