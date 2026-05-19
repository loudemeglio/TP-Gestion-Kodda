const { createProxyMiddleware } = require('http-proxy-middleware');

/**
 * Solo reenvía /api al backend. Evita que HMR (*.hot-update.json) o favicon
 * se manden al puerto 8000 (error ECONNREFUSED si la API no está arriba).
 */
module.exports = function setupProxy(app) {
  const target =
    (process.env.PROXY_API_TARGET && process.env.PROXY_API_TARGET.trim()) ||
    'http://127.0.0.1:8000';
  app.use(
    '/api',
    createProxyMiddleware({
      target,
      changeOrigin: true,
    })
  );
  app.use(
    '/uploads',
    createProxyMiddleware({
      target,
      changeOrigin: true,
    })
  );
};
