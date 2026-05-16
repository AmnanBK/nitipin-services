import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../config/db';
import { registerTravelerSchema } from '../validators/authValidator';

export const registerTraveler = async (req: Request, res: Response) => {
  try {
    // 1. Validate request body
    const { error, value } = registerTravelerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message,
      });
    }

    const { name, email, password, phone } = value;

    // 2. Check if email already exists
    const [existingUser]: any = await db.execute(
      'SELECT id FROM travelers WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Email already registered',
      });
    }

    // 3. Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Insert into database
    const [result]: any = await db.execute(
      'INSERT INTO travelers (name, email, password_hash, phone, account_status) VALUES (?, ?, ?, ?, ?)',
      [name, email, passwordHash, phone || null, 'active'] // Set to active for now as per seed example
    );

    // 5. Success response
    return res.status(201).json({
      status: 'success',
      message: 'Traveler registered successfully',
      data: {
        userId: result.insertId,
        name,
        email,
      },
    });
  } catch (error: any) {
    console.error('Registration Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};
