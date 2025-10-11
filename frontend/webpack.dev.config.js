const path = require('path');

module.exports = {
  mode: 'development',
  
  // Development optimizations
  optimization: {
    // Disable minimize in development
    minimize: false,
    
    // Disable split chunks in development to save memory
    splitChunks: false,
  },
  
  // Resolve configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@services': path.resolve(__dirname, 'src/services'),
    },
  },
  
  // Performance hints (disable in development)
  performance: {
    hints: false,
  },
};

