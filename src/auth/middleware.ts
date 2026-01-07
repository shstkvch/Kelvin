import { Request, Response, NextFunction } from 'express';
import { verifyToken } from './jwt';

export function authMiddleware(secret?: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token, secret);

    if (payload) {
      req.ctx = {
        authenticated: true,
        current_user: payload.userId,
        role: payload.role,
      };
    }

    next();
  };
}
