// src/loaders/logger.ts

import winston from 'winston';
import { ecsFormat } from '@elastic/ecs-winston-format';
import config from '../config';

const logger = winston.createLogger({
    level: config.log.level,
    format: winston.format.combine(
        winston.format.timestamp(),
        ecsFormat(),
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp(),
                ecsFormat()
            ),
        }),
    ],
});

export default logger;
