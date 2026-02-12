type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

const LOG_LEVEL: LogLevel = (() => {
  if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_LOG_LEVEL) {
    return (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || 'none';
  }
  return 'none';
})();

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
};

function getTimestamp() {
  return new Date().toISOString();
}

function format(level: LogLevel) {
  let color: string;
  switch (level) {
    case 'debug':
      color = '\x1b[36m'; // Cyan
      break;
    case 'info':
      color = '\x1b[32m'; // Green
      break;
    case 'warn':
      color = '\x1b[33m'; // Yellow
      break;
    case 'error':
      color = '\x1b[31m'; // Red
      break;
    default:
      color = '';
  }
  const reset = '\x1b[0m';
  return `${color}[${getTimestamp()}] [${level.toUpperCase()}]${reset}`;
}

function write(level: LogLevel, ...args: any[]) {
  if (LEVELS[level] < LEVELS[LOG_LEVEL]) return;
  switch (level) {
    case 'debug':
    case 'info':
      // eslint-disable-next-line no-console
      console.log(format(level), ...args);
      break;
    case 'warn':
      console.warn(format(level), ...args);
      break;
    case 'error':
      console.error(format(level), ...args);
      break;
    default:
      // Do not log
      break;
  }
}

export const logger = {
  debug: (...args: any[]) => write('debug', ...args),
  info: (...args: any[]) => write('info', ...args),
  warn: (...args: any[]) => write('warn', ...args),
  error: (...args: any[]) => write('error', ...args),
};
