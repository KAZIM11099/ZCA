import { env } from '../config/env.js';

export class HttpError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}
export const notFound = (req, res) =>
  res.status(404).json({ success: false, error: { message: 'Route not found' } });

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  const databaseUnavailable = err.code === 'P1001' || err.code === 'P2024';
  const status = err.status || (err.code === 'P2002' ? 409 : databaseUnavailable ? 503 : 500);
  if (status >= 500) {
    req.log?.error({
      errorType: err.name,
      errorCode: err.code,
      status,
    }, 'request failed');
  }
  res.status(status).json({
    success: false,
    error: {
      message: databaseUnavailable
        ? 'The database is temporarily unavailable. Please try again in a moment.'
        : status >= 500 && env.NODE_ENV === 'production'
        ? 'Something went wrong'
        : status === 409
          ? 'A record with this value already exists'
          : err.message,
      details: status >= 500 && env.NODE_ENV === 'production' ? undefined : err.details,
    },
  });
};
