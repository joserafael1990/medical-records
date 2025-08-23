const path = require('path');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  // Enable tree shaking
  mode: 'production',
  
  // Optimization settings
  optimization: {
    // Enable tree shaking
    usedExports: true,
    sideEffects: false,
    
    // Split chunks for better caching
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Vendor chunk for third-party libraries
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
        },
        // MUI chunk
        mui: {
          test: /[\\/]node_modules[\\/]@mui[\\/]/,
          name: 'mui',
          chunks: 'all',
          priority: 20,
        },
        // React chunk
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'react',
          chunks: 'all',
          priority: 30,
        },
        // Common components chunk
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    },
    
    // Minimize bundle size
    minimize: true,
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
  
  // Plugins
  plugins: [
    // Bundle analyzer (only in analyze mode)
    ...(process.env.ANALYZE ? [new BundleAnalyzerPlugin()] : []),
  ],
};
