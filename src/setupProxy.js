const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api/proxy',
    createProxyMiddleware({
      target: 'https://backend-ponto-digital-2.onrender.com',
      changeOrigin: true,
      pathRewrite: {
        '^/api/proxy': '', // Remove /api/proxy do caminho
      },
      onProxyReq: (proxyReq, req, res) => {
        // Log para debugging
        console.log(`[Local Proxy] ${req.method} ${req.url}`);
      },
      onError: (err, req, res) => {
        console.error('[Local Proxy Error]', err);
        res.status(500).json({ error: 'Proxy error' });
      }
    })
  );
};