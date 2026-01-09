/**
 * Server-side logger utility that sends logs to the Vite preview server.
 * Logs are captured in OpenShift pod logs via the /api/log endpoint.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogPayload {
  message: string;
  level: LogLevel;
  data?: unknown;
}

class ServerLogger {
  private async send(payload: LogPayload): Promise<void> {
    // Also log to console for browser debugging
    const consoleMethod = payload.level === 'error' ? 'error' : 
                          payload.level === 'warn' ? 'warn' : 'log';
    console[consoleMethod](payload.message, payload.data || '');

    try {
      await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // Silently fail if server logging unavailable (e.g., in dev mode)
    }
  }

  debug(message: string, data?: unknown) {
    this.send({ message, level: 'debug', data });
  }

  info(message: string, data?: unknown) {
    this.send({ message, level: 'info', data });
  }

  warn(message: string, data?: unknown) {
    this.send({ message, level: 'warn', data });
  }

  error(message: string, data?: unknown) {
    this.send({ message, level: 'error', data });
  }
}

export const serverLogger = new ServerLogger();
