import dependencyInjectorLoader from './dependency-injector';
import Logger from './LoggerInstance';
import path from "path";

export default async () => {
    dependencyInjectorLoader();
    Logger.info('All loaders executed, proceeding to start server', { path: path.relative(process.cwd(), __filename) });
};
