export default {
    // Used by winston Logger
    logs: {
        level:
            process.env.LOG_LEVEL || process.env.NODE_ENV === 'production'
                ? 'info'
                : 'debug'
    },
    logLevels: ['error', 'warn', 'info', 'http', 'verbose', 'debug'],
    logColors: {
        error: 'bold red',
        warn: 'bold yellow',
        info: 'bold green',
        http: 'bold blue',
        verbose: 'grey cyanBG',
        debug: 'grey whiteBG'
    },
}