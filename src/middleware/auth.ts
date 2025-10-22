import { Request, Response, NextFunction } from 'express';

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
};