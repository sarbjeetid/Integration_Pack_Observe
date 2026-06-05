// #!/usr/bin/env node
import 'reflect-metadata';

// /**
//  * Module dependencies.
//  */

// // var app = require("./config/express");
// // import app from "./loaders/express";
import loaders from './loaders';
import { Container } from 'typedi';
import { Express } from 'express';
import Logger from './loaders/LoggerInstance';
import path from "path";
var debug = require('debug')('ts-express-trial:server');
var http = require('http');

//  Get port from environment and store in Express.
//  Normalize a port into a number, string, or false.

function normalizePort(val: any) {
    var portNormalized = parseInt(val, 10);

    if (isNaN(portNormalized)) {
        // named pipe
        return val;
    }
    if (portNormalized >= 0) {
        // port number
        return portNormalized;
    }
    return false;
}
var port = normalizePort(process.env.PORT || '3000');

async function configureAndStartServer() {
    // Wait for loaders to initialize dependencies
    await loaders();
    Logger.info('Server pre-start initializations done.', {path: path.relative(process.cwd(), __filename)});

    const app: Express = Container.get('expressApp');
    app.listen(port);
}
configureAndStartServer();
