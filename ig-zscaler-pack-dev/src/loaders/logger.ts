// src/loaders/logger.ts

import winston from 'winston';
import { EcsFormat } from '@elastic/ecs-winston-format';
import config from '../config';

const logger = winston.createLogger({
    level: config.log.level,
    format: winston.format.combine(
        winston.format.timestamp(),
        new EcsFormat()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.simple()
            ),
        }),
    ],
});

export default logger;
