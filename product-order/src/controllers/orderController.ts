import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { db } from '../config/db';
import { OrderModel } from '../models/orderModel';
import { EscrowModel } from '../models/escrowModel';
import { CartModel } from '../models/cartModel';
import { sendNotification } from '../utils/notificationHelper';
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
