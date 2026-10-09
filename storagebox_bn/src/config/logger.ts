import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const isTest = process.env.NODE_ENV === 'test';

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json()),
  transports: [
    new winston.transports.Console({
      silent: isTest,
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
    ...(isTest
      ? []
      : [new DailyRotateFile({ dirname: 'logs', filename: 'storagebox-%DATE%.log', maxFiles: '14d', zippedArchive: true })]),
  ],
});

export default logger;
