// Enhanced backend middleware for security, auditing, and rate limiting

import rateLimit from 'express-rate-limit';

// ==================== AUDIT LOGGING ====================
export function auditLog(action, entity, changes = {}) {
  return {
    timestamp: new Date().toISOString(),
    action,
    entity,
    changes,
  };
}

export const auditMiddleware = (req, res, next) => {
  res.auditLog = (action, entity, changes) => {
    const log = auditLog(action, entity, {
      ...changes,
      userId: req.admin?.id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    console.log('[AUDIT]', JSON.stringify(log));
  };
  next();
};

// ==================== RATE LIMITING ====================

// More aggressive rate limiting for sensitive operations
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // 5 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again later.' },
  skip: (req) => process.env.NODE_ENV !== 'production',
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 100, // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Rate limit exceeded. Please wait before making more requests.' },
});

export const createLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20, // 20 creates per minute
  standardHeaders: true,
  legacyHeaders: false,
});

export const deleteLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10, // 10 deletes per minute
  standardHeaders: true,
  legacyHeaders: false,
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30, // 30 uploads per minute
  standardHeaders: true,
  legacyHeaders: false,
});

// ==================== INPUT VALIDATION ====================

export function validateRequiredFields(res, data, fields) {
  const missing = fields.filter((f) => !data[f]);
  if (missing.length > 0) {
    res.status(400).json({
      message: `Missing required fields: ${missing.join(', ')}`,
      code: 'VALIDATION_ERROR',
    });
    return false;
  }
  return true;
}

export function validateEmailFormat(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

export function validatePhoneFormat(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= 10;
}

export function validateCurrencyAmount(amount) {
  const num = Number(amount);
  return !isNaN(num) && num >= 0 && num <= 9999999999;
}

export function validateDateFormat(dateStr) {
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date);
}

export function sanitizeString(str, maxLen = 1000) {
  let s = String(str || '').trim();
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

// ==================== RESPONSE STANDARDIZATION ====================

export function successResponse(res, data, statusCode = 200) {
  res.status(statusCode).json({
    success: true,
    data,
  });
}

export function errorResponse(res, message, statusCode = 400, code = 'ERROR') {
  res.status(statusCode).json({
    success: false,
    message,
    code,
    timestamp: new Date().toISOString(),
  });
}

export function paginatedResponse(res, items, page, perPage, total) {
  const totalPages = Math.ceil(total / perPage);
  res.status(200).json({
    success: true,
    data: items,
    pagination: {
      page,
      perPage,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
}

// ==================== ERROR HANDLER ====================

export const errorHandler = (error, req, res, next) => {
  console.error('[ERROR]', {
    timestamp: new Date().toISOString(),
    message: error.message,
    code: error.code,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  // Prisma errors
  if (error.code === 'P2025') {
    return errorResponse(res, 'Resource not found', 404, 'NOT_FOUND');
  }
  if (error.code === 'P2002') {
    const field = error.meta?.target?.[0] || 'field';
    return errorResponse(res, `${field} already exists`, 409, 'DUPLICATE');
  }
  if (error.code === 'P2014' || error.code === 'P2003') {
    return errorResponse(res, 'Invalid reference or constraint violation', 400, 'CONSTRAINT_ERROR');
  }

  // Custom app errors
  if (error.status) {
    return errorResponse(res, error.message, error.status, error.code);
  }

  // Generic server error
  return errorResponse(res, 'Unexpected server error', 500, 'INTERNAL_SERVER_ERROR');
};

// ==================== SECURITY HEADERS ====================

export const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'");
  }
  
  next();
};

// ==================== REQUEST LOGGING ====================

export const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.method}] ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
};

// ==================== UTILITY FUNCTIONS ====================

export function getPageFromQuery(query) {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const perPage = Math.min(100, Math.max(10, parseInt(query.perPage || '50', 10)));
  return { page, perPage, skip: (page - 1) * perPage };
}

export function getSortFromQuery(query, defaultSort = 'createdAt', defaultOrder = 'desc') {
  const sortBy = query.sortBy || defaultSort;
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
  return { sortBy, sortOrder };
}

export function getSearchFromQuery(query) {
  return String(query.search || '').trim().toLowerCase();
}
