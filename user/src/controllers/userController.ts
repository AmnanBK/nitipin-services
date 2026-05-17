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
