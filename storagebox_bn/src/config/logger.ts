import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const isTest = process.env.NODE_ENV === 'test';
const isProduction = process.env.NODE_ENV === 'production';
/** File logs only in local/dev — containers log to stdout (docker logs). */
const useFileLogs = !isTest && !isProduction && process.env.LOG_TO_FILE !== '0';

const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json()),
  transports: [
    new winston.transports.Console({
      silent: isTest,
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
    ...(useFileLogs
      ? [new DailyRotateFile({ dirname: 'logs', filename: 'storagebox-%DATE%.log', maxFiles: '14d', zippedArchive: true })]
      : []),
  ],
});

export default logger;
