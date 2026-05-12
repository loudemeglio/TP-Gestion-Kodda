const { createProxyMiddleware } = require('http-proxy-middleware');

/**
 * Solo reenvía /api al backend. Evita que HMR (*.hot-update.json) o favicon
 * se manden al puerto 8000 (error ECONNREFUSED si la API no está arriba).
 */
module.exports = function setupProxy(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://127.0.0.1:8000',
      changeOrigin: true,
    })
  );
};
