/**
 * Centralized Logging Utility
 * Replaces scattered console.log statements with configurable logging
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogCategory = 'api' | 'auth' | 'validation' | 'ui' | 'system' | 'user';

interface LogConfig {
  enabled: boolean;
  level: LogLevel;
  categories: LogCategory[];
  includeTimestamp: boolean;
  includeStackTrace: boolean;
}

// Configuration based on environment
const getLogConfig = (): LogConfig => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    enabled: isDevelopment,
    level: isDevelopment ? 'debug' : 'error',
    categories: isDevelopment 
      ? ['api', 'auth', 'validation', 'ui', 'system', 'user']
      : [],
    includeTimestamp: isDevelopment,
    includeStackTrace: false
  };
};

const config = getLogConfig();

// Log level hierarchy
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

// Color mapping for console output
const COLORS = {
  debug: '#6B7280', // Gray
  info: '#3B82F6',  // Blue
  warn: '#F59E0B',  // Yellow
  error: '#EF4444', // Red
  system: '#10B981', // Green
  api: '#8B5CF6',   // Purple
  auth: '#F97316',  // Orange
  validation: '#EC4899', // Pink
  ui: '#06B6D4',    // Cyan
  user: '#84CC16'   // Lime
};

// Category emojis for better visual identification
const CATEGORY_EMOJIS: Record<LogCategory, string> = {
  api: '🌐',
  auth: '🔐', 
  validation: '✅',
  ui: '🎨',
  system: '⚙️',
  user: '👤'
};

class Logger {
  private shouldLog(level: LogLevel, category?: LogCategory): boolean {
    if (!config.enabled) {
      return level === 'error'; // Always log errors
    }
    
    if (LOG_LEVELS[level] < LOG_LEVELS[config.level]) {
      return false;
    }
    
    if (category && !config.categories.includes(category)) {
      return false;
    }
    
    return true;
  }

  private formatMessage(level: LogLevel, message: string, category?: LogCategory, data?: any): any[] {
    const parts: any[] = [];
    
    if (config.includeTimestamp) {
      parts.push(`[${new Date().toISOString()}]`);
    }
    
    const emoji = category ? CATEGORY_EMOJIS[category] : '';
    const prefix = emoji ? `${emoji} ` : '';
    
    parts.push(`${prefix}${message}`);
    
    if (data !== undefined) {
      // Special handling for errors
      if (data instanceof Error || (data && data.isAxiosError)) {
        const errorInfo: any = {
          message: data.message,
          name: data.name
        };
        
        // For Axios errors
        if (data.response) {
          errorInfo.status = data.response.status;
          errorInfo.statusText = data.response.statusText;
          errorInfo.data = data.response.data;
        }
        
        if (data.request && !data.response) {
          errorInfo.request = 'No response received from server';
        }
        
        if (data.config) {
          errorInfo.url = data.config.url;
          errorInfo.method = data.config.method;
        }
        
        parts.push(errorInfo);
      } else {
        parts.push(data);
      }
    }
    
    return parts;
  }

  private log(level: LogLevel, message: string, category?: LogCategory, data?: any): void {
    if (!this.shouldLog(level, category)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, category, data);
    
    // Use appropriate console method
    switch (level) {
      case 'debug':
        console.debug(...formattedMessage);
        break;
      case 'info':
        console.info(...formattedMessage);
        break;
      case 'warn':
        console.warn(...formattedMessage);
        break;
      case 'error':
        console.error(...formattedMessage);
        break;
    }
  }

  // Public API
  debug(message: string, data?: any, category?: LogCategory): void {
    this.log('debug', message, category, data);
  }

  info(message: string, data?: any, category?: LogCategory): void {
    this.log('info', message, category, data);
  }

  warn(message: string, data?: any, category?: LogCategory): void {
    this.log('warn', message, category, data);
  }

  error(message: string, data?: any, category?: LogCategory): void {
    this.log('error', message, category, data);
  }

  // Category-specific convenience methods
  api = {
    request: (url: string, method: string, data?: any) => 
      this.debug(`API Request: ${method} ${url}`, data, 'api'),
    response: (url: string, status: number, data?: any) => 
      this.debug(`API Response: ${status} ${url}`, data, 'api'),
    error: (url: string, error: any) => 
      this.error(`API Error: ${url}`, error, 'api')
  };

  auth = {
    login: (user: string) => this.info(`Usuario autenticado: ${user}`, undefined, 'auth'),
    logout: () => this.info('Usuario cerró sesión', undefined, 'auth'),
    error: (message: string, error?: any) => this.error(`Auth Error: ${message}`, error, 'auth'),
    sessionExpired: () => this.warn('Sesión expirada', undefined, 'auth'),
    info: (message: string, data?: any) => this.info(message, data, 'auth')
  };

  validation = {
    fieldError: (field: string, error: string) => 
      this.debug(`Validation Error - ${field}: ${error}`, undefined, 'validation'),
    formValid: (formType: string) => 
      this.debug(`Form validation passed: ${formType}`, undefined, 'validation'),
    formInvalid: (formType: string, errors: any) => 
      this.debug(`Form validation failed: ${formType}`, errors, 'validation')
  };

  ui = {
    navigate: (from: string, to: string) => 
      this.debug(`Navigation: ${from} → ${to}`, undefined, 'ui'),
    dialogOpen: (dialog: string) => 
      this.debug(`Dialog opened: ${dialog}`, undefined, 'ui'),
    dialogClose: (dialog: string) => 
      this.debug(`Dialog closed: ${dialog}`, undefined, 'ui')
  };

  system = {
    init: (component: string) => 
      this.info(`Inicializando ${component}...`, undefined, 'system'),
    ready: (component: string) => 
      this.info(`${component} listo`, undefined, 'system'),
    error: (component: string, error: any) => 
      this.error(`System Error in ${component}`, error, 'system')
  };

  user = {
    action: (action: string, details?: any) => 
      this.debug(`User action: ${action}`, details, 'user'),
    created: (entityType: string, entityName: string) => 
      this.info(`${entityType} creado: ${entityName}`, undefined, 'user'),
    updated: (entityType: string, entityName: string) => 
      this.info(`${entityType} actualizado: ${entityName}`, undefined, 'user'),
    deleted: (entityType: string, entityName: string) => 
      this.info(`${entityType} eliminado: ${entityName}`, undefined, 'user')
  };
}

// Create singleton instance
export const logger = new Logger();

// Legacy compatibility - simple debug helper that respects configuration
export const debugLog = (message: string, data?: any): void => {
  logger.debug(message, data);
};

// Export as default for convenience
export default logger;
