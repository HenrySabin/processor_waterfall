import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export class RateLimiter {
  private store: RateLimitStore = {};
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      message: 'Too many requests, please try again later',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config,
    };

    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const key in this.store) {
      if (this.store[key].resetTime <= now) {
        delete this.store[key];
      }
    }
  }

  private getKey(req: Request): string {
    // Use IP address as the key, but you could also use user ID, API key, etc.
    return req.ip || req.connection.remoteAddress || 'unknown';
  }

  middleware = (req: Request, res: Response, next: NextFunction): void => {
    const key = this.getKey(req);
    const now = Date.now();

    // Skip rate limiting for demo requests
    if (req.body && req.body.metadata && req.body.metadata.demo === true) {
      next();
      return;
    }

    // Get or create rate limit entry
    if (!this.store[key] || this.store[key].resetTime <= now) {
      this.store[key] = {
        count: 0,
        resetTime: now + this.config.windowMs,
      };
    }

    const entry = this.store[key];

    // Check if limit exceeded
    if (entry.count >= this.config.maxRequests) {
      logger.warn(
        `Rate limit exceeded for ${key}`,
        'rate-limiter',
        {
          ip: key,
          path: req.path,
          method: req.method,
          count: entry.count,
          limit: this.config.maxRequests,
        }
      );

      res.status(429).json({
        error: 'Too Many Requests',
        message: this.config.message,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      });
      return;
    }

    // Increment counter
    entry.count++;

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': this.config.maxRequests.toString(),
      'X-RateLimit-Remaining': (this.config.maxRequests - entry.count).toString(),
      'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
    });

    // Set up response handler to potentially decrement counter
    const originalSend = res.send;
    res.send = function (body) {
      const statusCode = res.statusCode;
      
      // Decrement counter for successful requests if configured
      if (
        this.config?.skipSuccessfulRequests &&
        statusCode >= 200 &&
        statusCode < 400 &&
        entry.count > 0
      ) {
        entry.count--;
      }

      // Decrement counter for failed requests if configured
      if (
        this.config?.skipFailedRequests &&
        statusCode >= 400 &&
        entry.count > 0
      ) {
        entry.count--;
      }

      return originalSend.call(res, body);
    }.bind({ config: this.config });

    next();
  };
}

// Predefined rate limiters for different endpoints
export const apiRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  message: 'Too many API requests, please try again later',
});

export const paymentRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 payment requests per minute
  message: 'Too many payment requests, please try again in a minute',
  skipSuccessfulRequests: false,
  skipFailedRequests: true, // Don't count failed payments against limit
});

export const healthCheckRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 health check requests per minute
  message: 'Too many health check requests, please try again later',
});
