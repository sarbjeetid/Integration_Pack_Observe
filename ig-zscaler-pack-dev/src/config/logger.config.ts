import { LogConfigI } from '../interfaces/config';

const loggerConfig: LogConfigI = {
    log: {
        level: process.env.LOG_LEVEL || 'info',
        transports: {
            console: process.env.LOG_CONSOLE !== 'false',
            file: process.env.LOG_FILE !== 'false',
        },
    },
};

export default loggerConfig;
