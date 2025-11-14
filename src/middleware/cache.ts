import { Request, Response, NextFunction, RequestHandler } from 'express';

interface CachedEntry<T = unknown> {
  expiresAt: number;
  payload: T;
}

const cacheStore = new Map<string, CachedEntry>();

function resolveKey(keyOrFactory: string | ((req: Request) => string), req: Request): string {
  if (typeof keyOrFactory === 'string') {
    return keyOrFactory;
  }
  return keyOrFactory(req);
}

export function cached(
  keyOrFactory: string | ((req: Request) => string),
  ttlSeconds: number,
  handler: RequestHandler
): RequestHandler {
  return async function cachedHandler(req: Request, res: Response, next: NextFunction) {
    try {
      const cacheKey = resolveKey(keyOrFactory, req);
      const now = Date.now();
      const hit = cacheStore.get(cacheKey);

      if (hit && hit.expiresAt > now) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(hit.payload);
      }

      const originalJson = res.json.bind(res);
      res.json = (body?: any) => {
        cacheStore.set(cacheKey, {
          payload: body,
          expiresAt: now + ttlSeconds * 1000,
        });
        res.setHeader('X-Cache', hit ? 'REFRESH' : 'MISS');
        return originalJson(body);
      };

      return handler(req, res, next);
    } catch (error) {
      return next(error);
    }
  };
}

export function purgeCache(key?: string) {
  if (!key) {
    cacheStore.clear();
    return;
  }

  if (key.endsWith('*')) {
    const prefix = key.slice(0, -1);
    for (const cacheKey of cacheStore.keys()) {
      if (cacheKey.startsWith(prefix)) {
        cacheStore.delete(cacheKey);
      }
    }
    return;
  }

  cacheStore.delete(key);
}
