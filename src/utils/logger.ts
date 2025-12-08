/**
 * Logging utility with strong visibility for user actions
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

class Logger {
  private minLevel: LogLevel = LogLevel.INFO;

  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private format(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    let output = `[${timestamp}] [${level}] ${message}`;

    if (data !== undefined) {
      output += `\n${JSON.stringify(data, null, 2)}`;
    }

    return output;
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.format(LogLevel.DEBUG, message, data));
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.format(LogLevel.INFO, message, data));
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.format(LogLevel.WARN, message, data));
    }
  }

  error(message: string, error?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      let errorData = error;

      // Extract useful error information
      if (error instanceof Error) {
        errorData = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };
      }

      console.error(this.format(LogLevel.ERROR, message, errorData));
    }
  }

  /**
   * Log HTTP request details
   */
  logRequest(method: string, url: string, headers?: Record<string, string>): void {
    this.info(`HTTP Request: ${method} ${url}`, { headers });
  }

  /**
   * Log HTTP response with status code explanation
   */
  logResponse(statusCode: number, url: string, duration?: number): void {
    const explanation = this.getStatusExplanation(statusCode);
    const message = `HTTP Response: ${statusCode} ${explanation} - ${url}`;
    const data = duration ? { durationMs: duration } : undefined;

    if (statusCode >= 400) {
      this.error(message, data);
    } else {
      this.info(message, data);
    }
  }

  /**
   * Get human-readable explanation for HTTP status codes
   */
  private getStatusExplanation(statusCode: number): string {
    const explanations: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      400: 'Bad Request - Invalid request syntax',
      401: 'Unauthorized - Authentication required or failed',
      403: 'Forbidden - Valid authentication but insufficient permissions',
      404: 'Not Found - Resource does not exist',
      422: 'Unprocessable Entity - Validation error in request data',
      429: 'Too Many Requests - Rate limit exceeded',
      500: 'Internal Server Error - Server encountered an error',
      502: 'Bad Gateway - Invalid response from upstream server',
      503: 'Service Unavailable - Server temporarily unavailable',
      504: 'Gateway Timeout - Upstream server did not respond in time',
    };

    return explanations[statusCode] || `HTTP ${statusCode}`;
  }

  /**
   * Log configuration on startup
   */
  logConfig(config: Record<string, any>, maskedFields: string[] = []): void {
    const safeConfig = { ...config };

    // Mask sensitive fields
    maskedFields.forEach(field => {
      if (field in safeConfig) {
        const value = safeConfig[field];
        if (typeof value === 'string') {
          safeConfig[field] = this.maskValue(value);
        }
      }
    });

    this.info('Configuration loaded:', safeConfig);
  }

  /**
   * Mask sensitive values (shows first 8 and last 4 chars)
   */
  private maskValue(value: string): string {
    if (value.length <= 12) {
      return '***';
    }
    const start = value.substring(0, 8);
    const end = value.substring(value.length - 4);
    const middle = '*'.repeat(Math.min(value.length - 12, 20));
    return `${start}${middle}${end}`;
  }
}

// Export singleton instance
export const logger = new Logger();
