import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      message: 'No token provided',
      code: 'NO_TOKEN'
    });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as AuthRequest).user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch (err: any) {
    // Differentiate between different JWT errors
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Session expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid authentication token',
        code: 'TOKEN_INVALID'
      });
    } else if (err.name === 'NotBeforeError') {
      return res.status(401).json({ 
        message: 'Token not yet valid',
        code: 'TOKEN_NOT_ACTIVE'
      });
    }
    return res.status(401).json({ 
      message: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
}

export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthRequest).user;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}
