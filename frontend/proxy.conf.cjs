module.exports = {
  '/api/**': {
    target: process.env.PORTFOLIO_API_TARGET || 'http://127.0.0.1:3000',
    changeOrigin: true,
    // Preserve Angular page URLs while forwarding these API paths to NestJS.
    pathRewrite: { '^/api/(?=(?:projets|diagrams|parcours|skills|documents|contact-form|stats/github)(?:/|\\?|$))': '/' },
  },
};
