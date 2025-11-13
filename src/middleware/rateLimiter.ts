import { Request, Response, NextFunction, RequestHandler } from 'express';

interface Bucket {
  hits: number;
  resetAt: number;
}

const windows = new Map<string, Bucket>();

export function rateLimit({
  limit,
  windowMs,
  keyGenerator,
  onLimitReached,
}: {
  limit: number;
  windowMs: number;
  keyGenerator?: (req: Request) => string;
  onLimitReached?: (req: Request, res: Response) => void;
}): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator ? keyGenerator(req) : `${req.ip}:${req.originalUrl}`;
    const now = Date.now();
    const bucket = windows.get(key);

    if (!bucket || bucket.resetAt <= now) {
      windows.set(key, { hits: 1, resetAt: now + windowMs });
      res.setHeader('X-RateLimit-Limit', limit.toString());
      res.setHeader('X-RateLimit-Remaining', (limit - 1).toString());
      return next();
    }

    if (bucket.hits >= limit) {
      res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000).toString());
      if (onLimitReached) {
        onLimitReached(req, res);
      }
      return res.status(429).json({ message: 'Too many requests. Please wait before retrying.' });
    }

    bucket.hits += 1;
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', (limit - bucket.hits).toString());

    return next();
  };
}
