import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { CONFIG } from '../config';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'USER' | 'ADMIN';
  };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authorization token required' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as {
      id: string;
      email: string;
      role: 'USER' | 'ADMIN';
    };
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired authorization token' });
    return;
  }
}

export function requireRole(roles: ('USER' | 'ADMIN')[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Forbidden: Insufficient privileges' });
      return;
    }

    next();
  };
}

export const requireAdmin = [requireAuth, requireRole(['ADMIN'])];
