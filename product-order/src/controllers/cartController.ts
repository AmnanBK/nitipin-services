import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { CartModel } from '../models/cartModel';
import { ProductModel } from '../models/productModel';

// GET /api/cart (Ambil keranjang)
export const getCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const buyer_id = req.user?.id;
    if (!buyer_id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    let cart = await CartModel.findOne({ buyer_id });
    if (!cart) {
      // Jika belum punya keranjang, buatkan kosong
      cart = await CartModel.create({ buyer_id, items: [] });
    }

    res.status(200).json({ message: 'Keranjang berhasil diambil', data: cart });
  } catch (error) {
    console.error('[getCart]', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/cart/items (Tambah item)
export const addItemToCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const buyer_id = req.user?.id;
    if (!buyer_id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { product_id, quantity, notes } = req.body;

    if (!product_id || !quantity || quantity < 1) {
      res.status(400).json({ message: 'product_id dan quantity (minimal 1) wajib diisi' });
      return;
    }

    // Validasi apakah produk ada di MySQL (Product Catalog)
    const product = await ProductModel.findById(product_id);
    if (!product) {
      res.status(404).json({ message: 'Produk tidak ditemukan di katalog' });
      return;
    }

    let cart = await CartModel.findOne({ buyer_id });
    if (!cart) {
      cart = new CartModel({ buyer_id, items: [] });
    }

    const existingItemIndex = cart.items.findIndex(item => item.product_id === String(product_id));

    if (existingItemIndex > -1) {
      // Produk sudah ada, tambahkan quantity-nya saja
      cart.items[existingItemIndex].quantity += Number(quantity);
      if (notes !== undefined) {
        cart.items[existingItemIndex].notes = notes;
      }
    } else {
      // Produk belum ada, tambahkan baru
      cart.items.push({ product_id: String(product_id), quantity: Number(quantity), notes });
    }

    await cart.save();
    res.status(200).json({ message: 'Item berhasil ditambahkan ke keranjang', data: cart });
  } catch (error) {
    console.error('[addItemToCart]', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// PUT /api/cart/items/:product_id (Ubah item)
export const updateCartItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const buyer_id = req.user?.id;
    if (!buyer_id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const product_id = req.params.product_id;
    const { quantity, notes } = req.body;

    const cart = await CartModel.findOne({ buyer_id });
    if (!cart) {
      res.status(404).json({ message: 'Keranjang tidak ditemukan' });
      return;
    }

    const itemIndex = cart.items.findIndex(item => item.product_id === String(product_id));
    if (itemIndex === -1) {
      res.status(404).json({ message: 'Item tidak ditemukan di keranjang' });
      return;
    }

    if (quantity !== undefined) {
      if (quantity < 1) {
        res.status(400).json({ message: 'Quantity minimal 1' });
        return;
      }
      cart.items[itemIndex].quantity = Number(quantity);
    }

    if (notes !== undefined) {
      cart.items[itemIndex].notes = notes;
    }

    await cart.save();
    res.status(200).json({ message: 'Item di keranjang berhasil diubah', data: cart });
  } catch (error) {
    console.error('[updateCartItem]', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// DELETE /api/cart/items/:product_id (Hapus item)
export const removeCartItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const buyer_id = req.user?.id;
    if (!buyer_id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const product_id = req.params.product_id;

    const cart = await CartModel.findOne({ buyer_id });
    if (!cart) {
      res.status(404).json({ message: 'Keranjang tidak ditemukan' });
      return;
    }

    const initialLength = cart.items.length;
    // Filter out item yang ingin dihapus
    cart.items = cart.items.filter(item => item.product_id !== String(product_id));

    if (cart.items.length === initialLength) {
      res.status(404).json({ message: 'Item tidak ditemukan di keranjang' });
      return;
    }

    await cart.save();
    res.status(200).json({ message: 'Item berhasil dihapus dari keranjang', data: cart });
  } catch (error) {
    console.error('[removeCartItem]', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
