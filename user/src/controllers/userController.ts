import { Request, Response } from 'express';
import { db } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';
import { Review } from '../models/reviewModel';
import { uploadToGCS } from '../utils/uploadHelper';

/**
 * GET /api/travelers/:id
 * Retrieve a traveler's profile by ID.
 */
export const getTravelerById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Retrieve traveler from database, joining with countries to get the country name
    const [rows]: any = await db.execute(
      `SELECT t.id, t.name, t.email, t.phone, t.profile_photo, t.bio, t.country_id, c.name as country_name, t.account_status, t.balance, t.created_at, t.updated_at 
       FROM travelers t
       LEFT JOIN countries c ON t.country_id = c.id
       WHERE t.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Traveler not found',
      });
    }

    const traveler = rows[0];

    // Format balance decimal as a number
    if (traveler.balance !== undefined && traveler.balance !== null) {
      traveler.balance = Number(traveler.balance);
    }

    return res.status(200).json({
      status: 'success',
      data: traveler,
    });
  } catch (error: any) {
    console.error('❌ Get Traveler Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

/**
 * PUT /api/travelers/:id
 * Update traveler profile (Name, Phone, Profile Photo, Bio, Country ID).
 * Restricted to the profile owner.
 */
import { updateTravelerSchema, updateTravelerStatusSchema, updateTravelerCountrySchema, updateBuyerSchema, createBuyerAddressSchema, updateBuyerAddressSchema, topUpBuyerSchema } from '../validators/userValidator';

export const updateTraveler = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Ownership validation
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized: User not authenticated',
      });
    }

    if (parseInt(String(req.user.id)) !== parseInt(String(id)) || req.user.role !== 'traveler') {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Not the account owner',
      });
    }

    // 2. Request body validation
    const { error, value } = updateTravelerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message,
      });
    }

    // 3. Check if traveler exists
    const [existing]: any = await db.execute('SELECT id FROM travelers WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Traveler not found',
      });
    }

    // 4. Build dynamic update query
    const fieldsToUpdate = [];
    const queryValues = [];

    // GCS Upload if file is present
    let profilePhotoUrl = undefined;
    if (req.file) {
      profilePhotoUrl = await uploadToGCS(req.file.buffer, req.file.originalname, req.file.mimetype);
    } else if (value.profile_photo !== undefined) {
      profilePhotoUrl = value.profile_photo === '' ? null : value.profile_photo;
    }

    if (value.name !== undefined) {
      fieldsToUpdate.push('name = ?');
      queryValues.push(value.name);
    }
    if (value.phone !== undefined) {
      fieldsToUpdate.push('phone = ?');
      queryValues.push(value.phone);
    }
    if (profilePhotoUrl !== undefined) {
      fieldsToUpdate.push('profile_photo = ?');
      queryValues.push(profilePhotoUrl);
    }
    if (value.bio !== undefined) {
      fieldsToUpdate.push('bio = ?');
      queryValues.push(value.bio);
    }
    if (value.country_id !== undefined) {
      fieldsToUpdate.push('country_id = ?');
      queryValues.push(value.country_id);
    }

    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'At least one field must be provided for update',
      });
    }

    // Append id to the query values
    queryValues.push(id);

    const updateSql = `UPDATE travelers SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;
    await db.execute(updateSql, queryValues);

    // 5. Fetch and return the updated profile
    const [updatedRows]: any = await db.execute(
      `SELECT t.id, t.name, t.email, t.phone, t.profile_photo, t.bio, t.country_id, c.name as country_name, t.account_status, t.balance, t.created_at, t.updated_at 
       FROM travelers t
       LEFT JOIN countries c ON t.country_id = c.id
       WHERE t.id = ?`,
      [id]
    );

    const updatedTraveler = updatedRows[0];
    if (updatedTraveler.balance !== undefined && updatedTraveler.balance !== null) {
      updatedTraveler.balance = Number(updatedTraveler.balance);
    }

    return res.status(200).json({
      status: 'success',
      message: 'Traveler profile updated successfully',
      data: updatedTraveler,
    });
  } catch (error: any) {
    console.error('❌ Update Traveler Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

/**
 * PATCH /api/travelers/:id/status
 * Toggle or set traveler account status ('active' | 'inactive').
 * Restricted to the profile owner.
 */
export const updateTravelerStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Ownership validation
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized: User not authenticated',
      });
    }

    if (parseInt(String(req.user.id)) !== parseInt(String(id)) || req.user.role !== 'traveler') {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Not the account owner',
      });
    }

    // 2. Request body validation
    const { error, value } = updateTravelerStatusSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message,
      });
    }

    // 3. Check if traveler exists
    const [existing]: any = await db.execute('SELECT account_status FROM travelers WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Traveler not found',
      });
    }

    // 4. Update the account status
    await db.execute('UPDATE travelers SET account_status = ? WHERE id = ?', [value.account_status, id]);

    // 5. Fetch updated traveler status to return
    const [updated]: any = await db.execute('SELECT id, name, email, account_status FROM travelers WHERE id = ?', [id]);

    return res.status(200).json({
      status: 'success',
      message: `Traveler status updated to ${value.account_status} successfully`,
      data: updated[0],
    });
  } catch (error: any) {
    console.error('❌ Update Traveler Status Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

/**
 * PATCH /api/travelers/:id/country
 * Update traveler country_id.
 * Restricted to the profile owner.
 */
export const updateTravelerCountry = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Ownership validation
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized: User not authenticated',
      });
    }

    if (parseInt(String(req.user.id)) !== parseInt(String(id)) || req.user.role !== 'traveler') {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Not the account owner',
      });
    }

    // 2. Request body validation
    const { error, value } = updateTravelerCountrySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message,
      });
    }

    // 3. Check if traveler exists
    const [existingTraveler]: any = await db.execute('SELECT id FROM travelers WHERE id = ?', [id]);
    if (existingTraveler.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Traveler not found',
      });
    }

    // 4. Verify that the country exists in countries table
    const [country]: any = await db.execute('SELECT name FROM countries WHERE id = ?', [value.country_id]);
    if (country.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid country_id: Country does not exist',
      });
    }

    // 5. Update the country_id
    await db.execute('UPDATE travelers SET country_id = ? WHERE id = ?', [value.country_id, id]);

    return res.status(200).json({
      status: 'success',
      message: 'Traveler country updated successfully',
      data: {
        id: parseInt(String(id)),
        country_id: value.country_id,
        country_name: country[0].name,
      },
    });
  } catch (error: any) {
    console.error('❌ Update Traveler Country Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

/**
 * GET /api/travelers/:id/balance
 * Retrieve traveler balance.
 * Restricted to the profile owner.
 */
export const getTravelerBalance = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Ownership validation
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized: User not authenticated',
      });
    }

    if (parseInt(String(req.user.id)) !== parseInt(String(id)) || req.user.role !== 'traveler') {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Not the account owner',
      });
    }

    // 2. Fetch balance from MySQL
    const [rows]: any = await db.execute('SELECT id, name, email, balance FROM travelers WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Traveler not found',
      });
    }

    const traveler = rows[0];
    const balanceNum = Number(traveler.balance);

    return res.status(200).json({
      status: 'success',
      data: {
        id: traveler.id,
        name: traveler.name,
        email: traveler.email,
        balance: balanceNum,
      },
    });
  } catch (error: any) {
    console.error('❌ Get Traveler Balance Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

/**
 * GET /api/travelers/:id/reviews
 * Retrieve MongoDB reviews for a traveler.
 * Accessible to guests / public.
 */
export const getTravelerReviews = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Verify traveler exists in MySQL
    const [traveler]: any = await db.execute('SELECT name FROM travelers WHERE id = ?', [id]);
    if (traveler.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Traveler not found',
      });
    }

    // 2. Fetch reviews from MongoDB (sorted by created_at descending)
    let reviews: any[] = [];
    try {
      reviews = await Review.find({ traveler_id: parseInt(String(id)) }).sort({ created_at: -1 });
    } catch (mongoError: any) {
      console.warn('⚠️ MongoDB is offline or failed. Gracefully returning empty reviews list. Error:', mongoError.message);
    }

    // 3. Calculate summary metrics
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
      : 0;

    return res.status(200).json({
      status: 'success',
      data: {
        traveler_id: parseInt(String(id)),
        traveler_name: traveler[0].name,
        summary: {
          total_reviews: totalReviews,
          average_rating: averageRating,
        },
        reviews,
      },
    });
  } catch (error: any) {
    console.error('❌ Get Traveler Reviews Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

/**
 * GET /api/buyers/:id
 * Retrieve a buyer's profile by ID.
 * Restricted to the profile owner.
 */
export const getBuyerById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Ownership validation
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized: User not authenticated',
      });
    }

    if (parseInt(String(req.user.id)) !== parseInt(String(id)) || req.user.role !== 'buyer') {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Not the account owner',
      });
    }

    // 2. Fetch buyer details from MySQL
    const [rows]: any = await db.execute(
      'SELECT id, name, email, phone, profile_photo, balance FROM buyers WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Buyer not found',
      });
    }

    const buyer = rows[0];
    buyer.balance = Number(buyer.balance); // Convert DECIMAL to number

    return res.status(200).json({
      status: 'success',
      data: buyer,
    });
  } catch (error: any) {
    console.error('❌ Get Buyer Profile Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

/**
 * PUT /api/buyers/:id
 * Update a buyer's profile (Name, Phone, Profile Photo).
 * Restricted to the profile owner.
 */
export const updateBuyer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Ownership validation
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized: User not authenticated',
      });
    }

    if (parseInt(String(req.user.id)) !== parseInt(String(id)) || req.user.role !== 'buyer') {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Not the account owner',
      });
    }

    // 2. Request body validation
    const { error, value } = updateBuyerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message,
      });
    }

    // 3. Check if buyer exists in database
    const [existing]: any = await db.execute('SELECT id FROM buyers WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Buyer not found',
      });
    }

    // 4. Dynamic SQL Query Builder to update only provided fields
    const fieldsToUpdate: string[] = [];
    const values: any[] = [];

    // GCS Upload if file is present
    let profilePhotoUrl = undefined;
    if (req.file) {
      profilePhotoUrl = await uploadToGCS(req.file.buffer, req.file.originalname, req.file.mimetype);
    } else if (value.profile_photo !== undefined) {
      profilePhotoUrl = value.profile_photo === '' ? null : value.profile_photo;
    }

    if (value.name !== undefined) {
      fieldsToUpdate.push('name = ?');
      values.push(value.name);
    }
    if (value.phone !== undefined) {
      fieldsToUpdate.push('phone = ?');
      values.push(value.phone === '' ? null : value.phone);
    }
    if (profilePhotoUrl !== undefined) {
      fieldsToUpdate.push('profile_photo = ?');
      values.push(profilePhotoUrl);
    }

    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'At least one field (name, phone, profile_photo) must be provided to update',
      });
    }

    values.push(id);
    const sql = `UPDATE buyers SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;
    await db.execute(sql, values);

    // 5. Fetch updated buyer to return
    const [updatedRows]: any = await db.execute(
      'SELECT id, name, email, phone, profile_photo, balance FROM buyers WHERE id = ?',
      [id]
    );
    const updatedBuyer = updatedRows[0];
    updatedBuyer.balance = Number(updatedBuyer.balance);

    return res.status(200).json({
      status: 'success',
      message: 'Buyer profile updated successfully',
      data: updatedBuyer,
    });
  } catch (error: any) {
    console.error('❌ Update Buyer Profile Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

/**
 * POST /api/buyers/:id/addresses
 * Add a new shipping address for a buyer.
 * Restricted to the profile owner.
 */
export const createBuyerAddress = async (req: AuthRequest, res: Response) => {
  let conn;
  try {
    const { id } = req.params;

    // 1. Ownership validation
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized: User not authenticated',
      });
    }

    if (parseInt(String(req.user.id)) !== parseInt(String(id)) || req.user.role !== 'buyer') {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Not the account owner',
      });
    }

    // 2. Request body validation
    const { error, value } = createBuyerAddressSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message,
      });
    }

    // 3. Verify buyer exists
    const [buyer]: any = await db.execute('SELECT id FROM buyers WHERE id = ?', [id]);
    if (buyer.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Buyer not found',
      });
    }

    // 4. Start database transaction
    conn = await db.getConnection();
    await conn.beginTransaction();

    // Check if buyer has any existing addresses
    const [existingAddresses]: any = await conn.execute(
      'SELECT id FROM buyer_addresses WHERE buyer_id = ?',
      [id]
    );

    let isDefault = value.is_default !== undefined ? value.is_default : 0;

    // Force default if it's the first address
    if (existingAddresses.length === 0) {
      isDefault = 1;
    }

    // If setting as default, reset all other addresses
    if (isDefault === 1) {
      await conn.execute(
        'UPDATE buyer_addresses SET is_default = 0 WHERE buyer_id = ?',
        [id]
      );
    }

    // Insert new address
    const [result]: any = await conn.execute(
      `INSERT INTO buyer_addresses (buyer_id, label, full_address, city, postal_code, is_default)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        value.label,
        value.full_address,
        value.city,
        value.postal_code || null,
        isDefault,
      ]
    );

    const insertedId = result.insertId;

    // Retrieve inserted address details
    const [addressRows]: any = await conn.execute(
      'SELECT id, buyer_id, label, full_address, city, postal_code, is_default, created_at FROM buyer_addresses WHERE id = ?',
      [insertedId]
    );

    await conn.commit();

    const newAddress = addressRows[0];
    newAddress.is_default = Number(newAddress.is_default);

    return res.status(201).json({
      status: 'success',
      message: 'Address added successfully',
      data: newAddress,
    });
  } catch (error: any) {
    if (conn) {
      await conn.rollback();
    }
    console.error('❌ Create Buyer Address Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  } finally {
    if (conn) {
      conn.release();
    }
  }
};

/**
 * GET /api/buyers/:id/addresses
 * Retrieve a list of shipping addresses for a buyer.
 * Restricted to the profile owner.
 */
export const getBuyerAddresses = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Ownership validation
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized: User not authenticated',
      });
    }

    if (parseInt(String(req.user.id)) !== parseInt(String(id)) || req.user.role !== 'buyer') {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Not the account owner',
      });
    }

    // 2. Verify buyer exists
    const [buyer]: any = await db.execute('SELECT id FROM buyers WHERE id = ?', [id]);
    if (buyer.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Buyer not found',
      });
    }

    // 3. Fetch buyer addresses (Sorted by is_default desc, then id desc)
    const [rows]: any = await db.execute(
      'SELECT id, buyer_id, label, full_address, city, postal_code, is_default, created_at FROM buyer_addresses WHERE buyer_id = ? ORDER BY is_default DESC, id DESC',
      [id]
    );

    const addresses = rows.map((address: any) => ({
      ...address,
      is_default: Number(address.is_default),
    }));

    return res.status(200).json({
      status: 'success',
      data: addresses,
    });
  } catch (error: any) {
    console.error('❌ Get Buyer Addresses Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

/**
 * PUT /api/buyers/:id/addresses/:address_id
 * Update an existing shipping address for a buyer.
 * Restricted to the profile owner.
 */
export const updateBuyerAddress = async (req: AuthRequest, res: Response) => {
  let conn;
  try {
    const { id, address_id } = req.params;

    // 1. Ownership validation
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized: User not authenticated',
      });
    }

    if (parseInt(String(req.user.id)) !== parseInt(String(id)) || req.user.role !== 'buyer') {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Not the account owner',
      });
    }

    // 2. Request body validation
    const { error, value } = updateBuyerAddressSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message,
      });
    }

    // 3. Verify buyer exists
    const [buyer]: any = await db.execute('SELECT id FROM buyers WHERE id = ?', [id]);
    if (buyer.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Buyer not found',
      });
    }

    // 4. Start database transaction
    conn = await db.getConnection();
    await conn.beginTransaction();

    // Check if the address exists and belongs to the buyer
    const [existingAddress]: any = await conn.execute(
      'SELECT id, is_default FROM buyer_addresses WHERE id = ? AND buyer_id = ?',
      [address_id, id]
    );

    if (existingAddress.length === 0) {
      await conn.rollback();
      return res.status(404).json({
        status: 'error',
        message: 'Address not found or does not belong to this buyer',
      });
    }

    const currentDefault = Number(existingAddress[0].is_default);
    let newDefault = value.is_default !== undefined ? value.is_default : currentDefault;

    // Fetch all addresses for this buyer to count them
    const [allAddresses]: any = await conn.execute(
      'SELECT id, is_default FROM buyer_addresses WHERE buyer_id = ?',
      [id]
    );

    // If it's the only address, it MUST remain default
    if (allAddresses.length === 1) {
      newDefault = 1;
    }

    // If user tries to unset the default address (changing 1 to 0) directly when there are other addresses
    if (currentDefault === 1 && newDefault === 0 && allAddresses.length > 1) {
      await conn.rollback();
      return res.status(400).json({
        status: 'error',
        message: 'Cannot unset the default address. Please set another address as default instead.',
      });
    }

    // If setting this address as default, reset all other addresses
    if (newDefault === 1 && currentDefault === 0) {
      await conn.execute(
        'UPDATE buyer_addresses SET is_default = 0 WHERE buyer_id = ?',
        [id]
      );
    }

    // Dynamic SQL update builder
    const fieldsToUpdate: string[] = [];
    const values: any[] = [];

    if (value.label !== undefined) {
      fieldsToUpdate.push('label = ?');
      values.push(value.label);
    }
    if (value.full_address !== undefined) {
      fieldsToUpdate.push('full_address = ?');
      values.push(value.full_address);
    }
    if (value.city !== undefined) {
      fieldsToUpdate.push('city = ?');
      values.push(value.city);
    }
    if (value.postal_code !== undefined) {
      fieldsToUpdate.push('postal_code = ?');
      values.push(value.postal_code === '' ? null : value.postal_code);
    }
    if (value.is_default !== undefined || newDefault === 1) {
      fieldsToUpdate.push('is_default = ?');
      values.push(newDefault);
    }

    if (fieldsToUpdate.length > 0) {
      values.push(address_id);
      const sql = `UPDATE buyer_addresses SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;
      await conn.execute(sql, values);
    }

    // Retrieve updated address details
    const [updatedRows]: any = await conn.execute(
      'SELECT id, buyer_id, label, full_address, city, postal_code, is_default, created_at FROM buyer_addresses WHERE id = ?',
      [address_id]
    );

    await conn.commit();

    const updatedAddress = updatedRows[0];
    updatedAddress.is_default = Number(updatedAddress.is_default);

    return res.status(200).json({
      status: 'success',
      message: 'Address updated successfully',
      data: updatedAddress,
    });
  } catch (error: any) {
    if (conn) {
      await conn.rollback();
    }
    console.error('❌ Update Buyer Address Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  } finally {
    if (conn) {
      conn.release();
    }
  }
};

/**
 * DELETE /api/buyers/:id/addresses/:address_id
 * Delete a shipping address of a buyer.
 * Restricted to the profile owner.
 */
export const deleteBuyerAddress = async (req: AuthRequest, res: Response) => {
  let conn;
  try {
    const { id, address_id } = req.params;

    // 1. Ownership validation
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized: User not authenticated',
      });
    }

    if (parseInt(String(req.user.id)) !== parseInt(String(id)) || req.user.role !== 'buyer') {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Not the account owner',
      });
    }

    // 2. Verify buyer exists
    const [buyer]: any = await db.execute('SELECT id FROM buyers WHERE id = ?', [id]);
    if (buyer.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Buyer not found',
      });
    }

    // 3. Start database transaction
    conn = await db.getConnection();
    await conn.beginTransaction();

    // Check if the address exists and belongs to the buyer
    const [existingAddress]: any = await conn.execute(
      'SELECT id, is_default FROM buyer_addresses WHERE id = ? AND buyer_id = ?',
      [address_id, id]
    );

    if (existingAddress.length === 0) {
      await conn.rollback();
      return res.status(404).json({
        status: 'error',
        message: 'Address not found or does not belong to this buyer',
      });
    }

    const wasDefault = Number(existingAddress[0].is_default);

    // Delete the target address
    await conn.execute(
      'DELETE FROM buyer_addresses WHERE id = ?',
      [address_id]
    );

    // If the deleted address was the default, promote another address to default (if any exist)
    if (wasDefault === 1) {
      const [remainingAddresses]: any = await conn.execute(
        'SELECT id FROM buyer_addresses WHERE buyer_id = ? ORDER BY id DESC LIMIT 1',
        [id]
      );

      if (remainingAddresses.length > 0) {
        const nextDefaultId = remainingAddresses[0].id;
        await conn.execute(
          'UPDATE buyer_addresses SET is_default = 1 WHERE id = ?',
          [nextDefaultId]
        );
      }
    }

    await conn.commit();

    return res.status(200).json({
      status: 'success',
      message: 'Address deleted successfully',
    });
  } catch (error: any) {
    if (conn) {
      await conn.rollback();
    }
    console.error('❌ Delete Buyer Address Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  } finally {
    if (conn) {
      conn.release();
    }
  }
};

/**
 * PATCH /api/buyers/:id/addresses/:address_id/default
 * Set a shipping address as default for a buyer.
 * Restricted to the profile owner.
 */
export const setDefaultBuyerAddress = async (req: AuthRequest, res: Response) => {
  let conn;
  try {
    const { id, address_id } = req.params;

    // 1. Ownership validation
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized: User not authenticated',
      });
    }

    if (parseInt(String(req.user.id)) !== parseInt(String(id)) || req.user.role !== 'buyer') {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Not the account owner',
      });
    }

    // 2. Verify buyer exists
    const [buyer]: any = await db.execute('SELECT id FROM buyers WHERE id = ?', [id]);
    if (buyer.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Buyer not found',
      });
    }

    // 3. Start database transaction
    conn = await db.getConnection();
    await conn.beginTransaction();

    // Check if the address exists and belongs to the buyer
    const [existingAddress]: any = await conn.execute(
      'SELECT id, is_default FROM buyer_addresses WHERE id = ? AND buyer_id = ?',
      [address_id, id]
    );

    if (existingAddress.length === 0) {
      await conn.rollback();
      return res.status(404).json({
        status: 'error',
        message: 'Address not found or does not belong to this buyer',
      });
    }

    // Reset all other addresses
    await conn.execute(
      'UPDATE buyer_addresses SET is_default = 0 WHERE buyer_id = ?',
      [id]
    );

    // Set this address as default
    await conn.execute(
      'UPDATE buyer_addresses SET is_default = 1 WHERE id = ?',
      [address_id]
    );

    // Retrieve updated address details
    const [updatedRows]: any = await conn.execute(
      'SELECT id, buyer_id, label, full_address, city, postal_code, is_default, created_at FROM buyer_addresses WHERE id = ?',
      [address_id]
    );

    await conn.commit();

    const updatedAddress = updatedRows[0];
    updatedAddress.is_default = Number(updatedAddress.is_default);

    return res.status(200).json({
      status: 'success',
      message: 'Address set as default successfully',
      data: updatedAddress,
    });
  } catch (error: any) {
    if (conn) {
      await conn.rollback();
    }
    console.error('❌ Set Default Buyer Address Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  } finally {
    if (conn) {
      conn.release();
    }
  }
};

/**
 * POST /api/buyers/:id/topup
 * Top up a buyer's balance.
 * Restricted to the profile owner.
 */
export const topUpBuyer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Ownership validation
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized: User not authenticated',
      });
    }

    if (parseInt(String(req.user.id)) !== parseInt(String(id)) || req.user.role !== 'buyer') {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Not the account owner',
      });
    }

    // 2. Request body validation
    const { error, value } = topUpBuyerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message,
      });
    }

    // 3. Check if buyer exists in database
    const [existing]: any = await db.execute('SELECT id FROM buyers WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Buyer not found',
      });
    }

    // 4. Update the balance
    await db.execute('UPDATE buyers SET balance = balance + ? WHERE id = ?', [value.amount, id]);

    // 5. Fetch updated buyer details to return
    const [updatedRows]: any = await db.execute(
      'SELECT id, name, email, phone, profile_photo, balance FROM buyers WHERE id = ?',
      [id]
    );
    const updatedBuyer = updatedRows[0];
    updatedBuyer.balance = Number(updatedBuyer.balance);

    return res.status(200).json({
      status: 'success',
      message: 'Buyer balance topped up successfully',
      data: updatedBuyer,
    });
  } catch (error: any) {
    console.error('❌ Top Up Buyer Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

/**
 * GET /api/countries
 * Retrieve a list of all countries.
 * Public endpoint.
 */
export const getCountries = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await db.execute(
      'SELECT id, name FROM countries ORDER BY name ASC'
    );

    return res.status(200).json({
      status: 'success',
      data: rows,
    });
  } catch (error: any) {
    console.error('❌ Get Countries Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};













