import { format, transports, createLogger, config as winstonConfig } from 'winston';
import _ from "lodash";
import config from '../config';
const ecsFormat = require('@elastic/ecs-winston-format');

const addMetadata = format((info) => {
    info.labels = { service: 'ig-logicmonitor-pack' };
    return info;
});

const logFormatter = format.printf((log) => {
    if (!log.path) {
        return (`Level: [${log.level}]\tTimestamp: [${log.timestamp}] Message: [${log.message}]`);
    }
    else {
        return (`Level: [${log.level}]\tTimestamp: [${log.timestamp}] Path: [${log.path}] Message: [${log.message}]`);
    }
});

const LoggerInstance = createLogger({
    level: config.logs.level,
    levels: _.pick(winstonConfig.npm.levels, config.logLevels),
    transports: [
        new transports.Console(),
    ],
});

if (config.env.current !== config.env.PRODUCTION) {
    LoggerInstance.format = format.combine(
        format.errors({ message: true }),
        format.colorize({
            colors: config.logColors,
            level: true,
        }),
        format.splat(),
        format.timestamp(),
        logFormatter,
    );
} else {
    LoggerInstance.format = format.combine(
        format.splat(),
        addMetadata(),
        format.timestamp(),
        ecsFormat({ convertReqRes: true })
    );
}
export default LoggerInstance;
