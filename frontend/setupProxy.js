const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://python-backend:8000',
      changeOrigin: true,
      secure: false,
      logLevel: 'debug',
      onError: function (err, req, res) {
        console.log('Proxy error:', err);
      },
      onProxyReq: function (proxyReq, req, res) {
        console.log('Proxying request to:', proxyReq.path);
      }
    })
  );
};
