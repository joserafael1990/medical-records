module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  rules: {
    // CRITICAL: Enable essential rules that prevent runtime errors
    '@typescript-eslint/no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      ignoreRestSiblings: true 
    }],
    'react-hooks/exhaustive-deps': 'warn', // CRITICAL for useEffect dependencies
    'react/jsx-no-undef': 'error', // CRITICAL for undefined components
    'no-unused-vars': 'off', // Let TypeScript handle this
    
    // Import organization (less critical but helpful)
    'import/first': 'warn',
    'import/no-duplicates': 'warn',
    'import/newline-after-import': 'warn',
    
    // Allow some flexibility for development
    'import/order': 'off', // Can be noisy during development
    'import/no-unresolved': 'off', // TypeScript handles this
    '@typescript-eslint/no-redeclare': 'warn',
    'no-redeclare': 'off' // Let TypeScript handle this
  },
  ignorePatterns: [
    '*.test.js',
    '*.test.ts', 
    '*.test.tsx',
    'build/',
    'node_modules/',
    'coverage/'
  ]
};
