/**
 * Central error handler.
 * HttpError instances (with a numeric `status`) are forwarded as-is;
 * anything unexpected is logged and masked as a generic 500 response.
 */
function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-unused-vars
  const status = Number.isInteger(err.status) ? err.status : 500;
  if (status >= 500) {
    console.error('[error]', err.stack || err.message);
  }
  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : err.message,
  });
}

module.exports = errorHandler;
