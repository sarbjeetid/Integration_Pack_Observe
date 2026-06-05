import 'reflect-metadata';
import loaders from './loaders';
import { Container } from 'typedi';

import logger from './loaders/logger';
import path from "path";
import config from "./config"
import winston from 'winston';

//  Normalize a port into a number, string, or false.
function normalizePort(val: any) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
      // named pipe
      return val;
  }
  if (port >= 0) {
      // port number
      return port;
  }
  return false;
}
var port = normalizePort(config.port);

async function configureAndStartServer() {
  
  // Wait for loaders to initialize dependencies
  await loaders();
  logger.info('Server pre-start initializations done.', {path: path.relative(process.cwd(), __filename)});

  const loggerInstance: winston.Logger = Container.get('loggerInstance');
  const app: any = Container.get('expressApp');
  
  app.listen(port, () => loggerInstance.info(`Server is running on: ${port}`));
}
configureAndStartServer();
