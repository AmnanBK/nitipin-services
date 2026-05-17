import { Response } from 'express';
import { db } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';
import { Review } from '../models/reviewModel';

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
import { updateTravelerSchema, updateTravelerStatusSchema, updateTravelerCountrySchema } from '../validators/userValidator';

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

    if (value.name !== undefined) {
      fieldsToUpdate.push('name = ?');
      queryValues.push(value.name);
    }
    if (value.phone !== undefined) {
      fieldsToUpdate.push('phone = ?');
      queryValues.push(value.phone);
    }
    if (value.profile_photo !== undefined) {
      fieldsToUpdate.push('profile_photo = ?');
      queryValues.push(value.profile_photo);
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






