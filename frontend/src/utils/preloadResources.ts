// Preload critical resources for better performance
export const preloadCriticalResources = () => {
  // Preload critical fonts
  const fontPreloads = [
    'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap'
  ];

  fontPreloads.forEach(href => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = href;
    document.head.appendChild(link);
  });

  // Preload critical API endpoints
  const criticalEndpoints = [
    '/api/health',
    '/api/physicians/dashboard'
  ];

  criticalEndpoints.forEach(endpoint => {
    fetch(endpoint, { method: 'HEAD' }).catch(() => {
      // Silently fail - this is just for preloading
    });
  });
};

// Lazy load non-critical resources
export const lazyLoadNonCriticalResources = () => {
  // Load non-critical CSS
  const nonCriticalCSS = [
    'https://fonts.googleapis.com/icon?family=Material+Icons'
  ];

  nonCriticalCSS.forEach(href => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.media = 'print';
    link.onload = () => {
      link.media = 'all';
    };
    document.head.appendChild(link);
  });
};

// Resource hints for better loading
export const addResourceHints = () => {
  // DNS prefetch for external resources
  const dnsPrefetchDomains = [
    'fonts.googleapis.com',
    'fonts.gstatic.com'
  ];

  dnsPrefetchDomains.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = `//${domain}`;
    document.head.appendChild(link);
  });

  // Preconnect to critical origins
  const preconnectOrigins = [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com'
  ];

  preconnectOrigins.forEach(origin => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
};
