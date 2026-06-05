import dependencyInjectorLoader from './dependency-injector';
import logger from './logger';
import path from "path";

export default async () => {
    await dependencyInjectorLoader();
    logger.info('All loaders executed, proceeding to start server', {path: path.relative(process.cwd(), __filename)});
};
