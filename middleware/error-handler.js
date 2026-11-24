/**
 * Middleware de Manejo Centralizado de Errores
 */

function errorHandler(err, req, res, next) {
  console.error('🔥 Error capturado en Express:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method
  });

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Ocurrió un error interno en el servidor.';

  res.status(statusCode).json({
    success: false,
    error: message,
    code: err.code || 'INTERNAL_SERVER_ERROR',
    timestamp: new Date().toISOString()
  });
}

module.exports = errorHandler;

