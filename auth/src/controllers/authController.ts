import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/db';
import { registerTravelerSchema, registerBuyerSchema, loginSchema } from '../validators/authValidator';

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
      [name, email, passwordHash, phone || null, 'active']
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
    console.error('Traveler Registration Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

export const registerBuyer = async (req: Request, res: Response) => {
  try {
    // 1. Validate request body
    const { error, value } = registerBuyerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message,
      });
    }

    const { name, email, password, phone } = value;

    // 2. Check if email already exists
    const [existingUser]: any = await db.execute(
      'SELECT id FROM buyers WHERE email = ?',
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
      'INSERT INTO buyers (name, email, password_hash, phone) VALUES (?, ?, ?, ?)',
      [name, email, passwordHash, phone || null]
    );

    // 5. Success response
    return res.status(201).json({
      status: 'success',
      message: 'Buyer registered successfully',
      data: {
        userId: result.insertId,
        name,
        email,
      },
    });
  } catch (error: any) {
    console.error('Buyer Registration Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    // 1. Validate request body
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: error.details[0].message,
      });
    }

    const { email, password } = value;

    // 2. Search for user in both tables (travelers and buyers)
    // First, check in travelers table
    let [users]: any = await db.execute(
      'SELECT id, name, email, password_hash, "traveler" as role FROM travelers WHERE email = ?',
      [email]
    );

    // If not found in travelers, check in buyers table
    if (users.length === 0) {
      [users] = await db.execute(
        'SELECT id, name, email, password_hash, "buyer" as role FROM buyers WHERE email = ?',
        [email]
      );
    }

    // If still not found
    if (users.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    const user = users[0];

    // 3. Compare password hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    // 4. Generate JWT
    const payload = {
      id: user.id,
      role: user.role,
      name: user.name,
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'jastip_super_secret_key_2024',
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    );

    // 5. Success response
    return res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error: any) {
    console.error('Login Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};
