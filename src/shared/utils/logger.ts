/**
 * Utility for conditional logging based on environment
 * Logs will only be shown in development mode
 */

const isProduction = process.env.NODE_ENV === 'production';

export const logger = {
  /**
   * Log information messages - only in development
   */
  info: (...args: any[]) => {
    if (!isProduction) {
      console.info('🔵 INFO:', ...args);
    }
  },
  
  /**
   * Log debug messages - only in development
   */
  debug: (...args: any[]) => {
    if (!isProduction) {
      console.log('🔧 DEBUG:', ...args);
    }
  },
  
  /**
   * Log success messages - only in development
   */
  success: (...args: any[]) => {
    if (!isProduction) {
      console.log('✅ SUCCESS:', ...args);
    }
  },
  
  /**
   * Log warning messages - shown in all environments
   */
  warn: (...args: any[]) => {
    console.warn('⚠️ WARNING:', ...args);
  },
  
  /**
   * Log error messages - shown in all environments
   */
  error: (...args: any[]) => {
    console.error('❌ ERROR:', ...args);
  }
};
