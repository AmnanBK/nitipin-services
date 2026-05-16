import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Interface for user data stored in JWT and used across services.
 */
export interface UserPayload {
  id: string;
  role: 'traveler' | 'buyer' | 'admin';
}

/**
 * Extended Express Request to include decoded user information.
 */
export interface AuthRequest extends Request {
  user?: UserPayload;
}

/**
 * Middleware to validate authentication.
 * It supports both API Gateway injected headers (X-User-Id, X-User-Role)
 * and direct JWT verification (for local development).
 */
export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  // 1. Check for headers injected by API Gateway
  // Gateway has already validated the JWT and injected these headers.
  const gatewayId = req.headers['x-user-id'];
  const gatewayRole = req.headers['x-user-role'];

  if (gatewayId && gatewayRole) {
    req.user = {
      id: gatewayId as string,
      role: gatewayRole as any,
    };
    return next();
  }

  // 2. Fallback: Validate JWT directly (useful for local development bypassing Gateway)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized: No authentication credentials provided',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'jastip_super_secret_key_2024'
    ) as any;

    req.user = {
      id: decoded.userId || decoded.id,
      role: decoded.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized: Invalid or expired token',
    });
  }
};

/**
 * Middleware to restrict access based on user roles.
 * @param roles Array of allowed roles
 */
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized: User info not found',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: You do not have permission to perform this action',
      });
    }

    next();
  };
};
