import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { db } from '../config/db';
import { OrderModel } from '../models/orderModel';
import { EscrowModel } from '../models/escrowModel';
import { CartModel } from '../models/cartModel';
import { sendNotification } from '../utils/notificationHelper';
import { ProofModel } from '../models/proofModel';
import { RowDataPacket } from 'mysql2';


// POST /api/orders (Checkout)
export const createCheckout = async (req: AuthRequest, res: Response): Promise<void> => {
  const buyer_id = req.user?.id;
  if (!buyer_id) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { shipping_address_id, items } = req.body;
  
  if (!shipping_address_id || !items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ message: 'shipping_address_id dan items wajib diisi' });
    return;
  }

  // Mendapatkan koneksi dari pool untuk menjalankan Transaction
  const conn = await db.getConnection();
  await conn.beginTransaction();

  try {
    let totalOverallPrice = 0;
    const checkoutItems = [];

    // 1. Perulangan ke setiap items: Validasi produk & hitung harga
    for (const item of items) {
      const { product_id, quantity } = item;

      const qty = Number(quantity);
      if (isNaN(qty) || qty < 1 || !Number.isInteger(qty)) {
        throw new Error(`Kuantitas produk dengan ID ${product_id} tidak valid (harus bilangan bulat positif)`);
      }
      
      const [productRows] = await conn.execute<RowDataPacket[]>(
        'SELECT price, traveler_id, product_name FROM product_catalog WHERE id = ?',
        [product_id]
      );

      if (productRows.length === 0) {
        throw new Error(`Produk dengan ID ${product_id} tidak ditemukan`);
      }

      const product = productRows[0];
      const totalPrice = Number(product.price) * Number(quantity);
      totalOverallPrice += totalPrice;

      checkoutItems.push({
        product_id,
        quantity,
        traveler_id: String(product.traveler_id),
        product_name: product.product_name,
        total_price: totalPrice
      });
    }

    // 2. Cek saldo buyer di database
    const [buyerRows] = await conn.execute<RowDataPacket[]>(
      'SELECT balance FROM buyers WHERE id = ? FOR UPDATE', // FOR UPDATE mengunci baris ini selama transaksi
      [buyer_id]
    );

    if (buyerRows.length === 0) {
      throw new Error('Data pembeli tidak ditemukan');
    }

    const currentBalance = Number(buyerRows[0].balance);
    if (currentBalance < totalOverallPrice) {
      throw new Error('Saldo tidak mencukupi untuk checkout');
    }

    // 3. Kurangi saldo buyer
    await conn.execute(
      'UPDATE buyers SET balance = balance - ? WHERE id = ?',
      [totalOverallPrice, buyer_id]
    );

    // 4. Proses pembuatan order dan escrow
    for (const item of checkoutItems) {
      // Buat row baru di tabel orders
      const orderId = await OrderModel.create({
        buyer_id: String(buyer_id),
        traveler_id: item.traveler_id,
        product_id: String(item.product_id),
        quantity: item.quantity,
        total_price: item.total_price,
        shipping_address_id: String(shipping_address_id),
        status: 'pending_review'
      }, conn);

      // Buat row baru di tabel escrow_payments
      await EscrowModel.create({
        order_id: orderId,
        amount: item.total_price,
        status: 'hold'
      }, conn);

      // 5. (Asynchronous) Panggil helper notifikasi untuk memberitahu Traveler
      // Sengaja tidak di-await agar tidak memblokir respon terlalu lama
      sendNotification(
        item.traveler_id,
        'traveler',
        'Pesanan Baru',
        `Kamu mendapat pesanan baru untuk produk: ${item.product_name}`,
        orderId
      );
    }

    // 6. Jika semua berhasil, simpan perubahan ke database (Commit)
    await conn.commit();

    // 7. Hapus item tersebut dari keranjang MongoDB
    try {
      const cart = await CartModel.findOne({ buyer_id });
      if (cart) {
        const productIdsToRemove = items.map((i: any) => String(i.product_id));
        cart.items = cart.items.filter(i => !productIdsToRemove.includes(String(i.product_id)));
        await cart.save();
      }
    } catch (cartError) {
      console.error('Gagal menghapus item dari keranjang setelah checkout:', cartError);
      // Kita tidak me-throw error di sini karena pembayaran/checkout sudah sukses.
    }

    res.status(201).json({ message: 'Checkout berhasil', total_paid: totalOverallPrice });
  } catch (error: any) {
    // Jika ada error apa pun di blok try, batalkan semua perubahan database (Rollback)
    await conn.rollback();
    console.error('[createCheckout]', error);
    res.status(400).json({ message: error.message || 'Checkout gagal' });
  } finally {
    // Lepaskan koneksi kembali ke pool
    conn.release();
  }
};

// PATCH /api/orders/:id/approve
export const approveOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const traveler_id = req.user?.id;

    const [rows] = await db.execute<RowDataPacket[]>('SELECT traveler_id, status FROM orders WHERE id = ?', [id]);
    if (rows.length === 0) { res.status(404).json({ message: 'Order tidak ditemukan' }); return; }
    if (String(rows[0].traveler_id) !== String(traveler_id)) { res.status(403).json({ message: 'Bukan pesanan milikmu' }); return; }
    if (rows[0].status !== 'pending_review') { res.status(400).json({ message: 'Status tidak valid' }); return; }

    await db.execute('UPDATE orders SET status = ? WHERE id = ?', ['approved', id]);
    res.status(200).json({ message: 'Pesanan berhasil disetujui (approved)' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error approving order' });
  }
};

// PATCH /api/orders/:id/reject & cancel
export const rejectOrCancelOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const user_id = req.user?.id;
  const isReject = req.path.includes('reject');
  const targetStatus = isReject ? 'rejected' : 'cancelled';

  const conn = await db.getConnection();
  await conn.beginTransaction();

  try {
    const [rows] = await conn.execute<RowDataPacket[]>('SELECT traveler_id, buyer_id, status, total_price FROM orders WHERE id = ? FOR UPDATE', [id]);
    if (rows.length === 0) throw new Error('Order tidak ditemukan');
    
    const order = rows[0];

    if (isReject) {
      // Traveler reject: hanya dari pending_review
      if (String(order.traveler_id) !== String(user_id)) throw new Error('Hanya traveler yang bisa reject');
      if (order.status !== 'pending_review') throw new Error('Pesanan sudah tidak bisa ditolak');
    } else {
      // Buyer cancel: hanya dari pending_review
      if (String(order.buyer_id) !== String(user_id)) throw new Error('Hanya buyer yang bisa cancel');
      if (order.status !== 'pending_review') throw new Error('Pesanan sudah disetujui, tidak bisa dibatalkan');
    }

    await conn.execute('UPDATE orders SET status = ? WHERE id = ?', [targetStatus, id]);
    await conn.execute('UPDATE escrow_payments SET status = ? WHERE order_id = ?', ['refunded', id]);
    await conn.execute('UPDATE buyers SET balance = balance + ? WHERE id = ?', [order.total_price, order.buyer_id]);

    await conn.commit();
    res.status(200).json({ message: `Pesanan di-${targetStatus} dan uang dikembalikan ke buyer` });
  } catch (error: any) {
    await conn.rollback();
    console.error(error);
    res.status(400).json({ message: error.message });
  } finally {
    conn.release();
  }
};

// PATCH /api/orders/:id/purchased
export const purchaseOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const traveler_id = req.user?.id;

    const [rows] = await db.execute<RowDataPacket[]>('SELECT traveler_id, status FROM orders WHERE id = ?', [id]);
    if (rows.length === 0) { res.status(404).json({ message: 'Order tidak ditemukan' }); return; }
    if (String(rows[0].traveler_id) !== String(traveler_id)) { res.status(403).json({ message: 'Bukan pesanan milikmu' }); return; }
    if (rows[0].status !== 'approved') { res.status(400).json({ message: 'Status belum approved' }); return; }

    const proof = await ProofModel.findOne({ order_id: Number(id), proof_type: 'purchase' });
    if (!proof) { res.status(400).json({ message: 'Bukti pembelian (proof) belum diunggah ke MongoDB' }); return; }

    await db.execute('UPDATE orders SET status = ? WHERE id = ?', ['purchased', id]);
    res.status(200).json({ message: 'Pesanan diubah menjadi purchased' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error' });
  }
};

// PATCH /api/orders/:id/ship
export const shipOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const traveler_id = req.user?.id;

    const [rows] = await db.execute<RowDataPacket[]>('SELECT traveler_id, status FROM orders WHERE id = ?', [id]);
    if (rows.length === 0) { res.status(404).json({ message: 'Order tidak ditemukan' }); return; }
    if (String(rows[0].traveler_id) !== String(traveler_id)) { res.status(403).json({ message: 'Bukan pesanan milikmu' }); return; }
    if (rows[0].status !== 'purchased') { res.status(400).json({ message: 'Status belum purchased' }); return; }

    await db.execute('UPDATE orders SET status = ? WHERE id = ?', ['shipped', id]);
    res.status(200).json({ message: 'Pesanan dikirim (shipped)' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error' });
  }
};

// PATCH /api/orders/:id/complete
export const completeOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const buyer_id = req.user?.id;

  const conn = await db.getConnection();
  await conn.beginTransaction();

  try {
    const [rows] = await conn.execute<RowDataPacket[]>('SELECT buyer_id, traveler_id, status, total_price FROM orders WHERE id = ? FOR UPDATE', [id]);
    if (rows.length === 0) throw new Error('Order tidak ditemukan');
    
    const order = rows[0];

    if (String(order.buyer_id) !== String(buyer_id)) throw new Error('Hanya buyer yang bisa menyelesaikan pesanan');
    if (order.status !== 'shipped') throw new Error('Pesanan belum dikirim (shipped)');

    const proof = await ProofModel.findOne({ order_id: Number(id), proof_type: 'receipt' });
    if (!proof) throw new Error('Bukti penerimaan (receipt) belum diunggah ke MongoDB');

    await conn.execute('UPDATE orders SET status = ? WHERE id = ?', ['completed', id]);
    await conn.execute('UPDATE escrow_payments SET status = ? WHERE order_id = ?', ['released', id]);
    await conn.execute('UPDATE travelers SET balance = balance + ? WHERE id = ?', [order.total_price, order.traveler_id]);

    await conn.commit();
    res.status(200).json({ message: 'Pesanan selesai! Dana diteruskan ke Traveler' });
  } catch (error: any) {
    await conn.rollback();
    console.error(error);
    res.status(400).json({ message: error.message });
  } finally {
    conn.release();
  }
};

// GET /api/orders
export const getOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user_id = req.user?.id;
    const role = req.user?.role;
    
    let query = `
      SELECT o.*, 
             b.name AS buyer_name, 
             b.email AS buyer_email, 
             b.phone AS buyer_phone,
             ba.full_address AS shipping_address, 
             ba.city AS shipping_city, 
             ba.postal_code AS shipping_postal_code, 
             ba.label AS shipping_label,
             p.product_name,
             p.photo_url
      FROM orders o
      LEFT JOIN buyers b ON o.buyer_id = b.id
      LEFT JOIN buyer_addresses ba ON o.shipping_address_id = ba.id
      LEFT JOIN product_catalog p ON o.product_id = p.id
      WHERE `;
    const params = [];
    
    if (role === 'traveler') {
      query += 'o.traveler_id = ?';
    } else {
      query += 'o.buyer_id = ?';
    }
    params.push(user_id ?? null);
    
    const [rows] = await db.execute(query, params);
    res.status(200).json({ data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error' });
  }
};

// GET /api/orders/:id
export const getOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const query = `
      SELECT o.*, 
             b.name AS buyer_name, 
             b.email AS buyer_email, 
             b.phone AS buyer_phone,
             ba.full_address AS shipping_address, 
             ba.city AS shipping_city, 
             ba.postal_code AS shipping_postal_code, 
             ba.label AS shipping_label,
             p.product_name,
             p.photo_url
      FROM orders o
      LEFT JOIN buyers b ON o.buyer_id = b.id
      LEFT JOIN buyer_addresses ba ON o.shipping_address_id = ba.id
      LEFT JOIN product_catalog p ON o.product_id = p.id
      WHERE o.id = ?
    `;
    const [rows] = await db.execute(query, [id]);
    const orders = rows as any[];
    if (orders.length === 0) { res.status(404).json({ message: 'Order tidak ditemukan' }); return; }

    const order = orders[0];
    const userId = String(req.user?.id);
    const role = req.user?.role;

    if (role === 'buyer' && String(order.buyer_id) !== userId) {
      res.status(403).json({ message: 'Forbidden' }); return;
    }
    if (role === 'traveler' && String(order.traveler_id) !== userId) {
      res.status(403).json({ message: 'Forbidden' }); return;
    }

    res.status(200).json({ data: order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error' });
  }
};

// GET /api/orders/:id/escrow
export const getEscrowStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute(
      `SELECT e.*, o.buyer_id, o.traveler_id 
       FROM escrow_payments e
       JOIN orders o ON e.order_id = o.id
       WHERE e.order_id = ?`,
      [id]
    );
    const escrows = rows as any[];
    if (escrows.length === 0) { res.status(404).json({ message: 'Escrow tidak ditemukan' }); return; }

    const escrow = escrows[0];
    const userId = String(req.user?.id);
    const role = req.user?.role;

    if (role === 'buyer' && String(escrow.buyer_id) !== userId) {
      res.status(403).json({ message: 'Forbidden' }); return;
    }
    if (role === 'traveler' && String(escrow.traveler_id) !== userId) {
      res.status(403).json({ message: 'Forbidden' }); return;
    }

    delete escrow.buyer_id;
    delete escrow.traveler_id;

    res.status(200).json({ data: escrow });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error' });
  }
};

