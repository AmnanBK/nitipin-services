import { Response } from 'express';
import { db } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

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
import { updateTravelerSchema } from '../validators/userValidator';

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

