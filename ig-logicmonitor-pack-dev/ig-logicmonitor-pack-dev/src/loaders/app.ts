import express from 'express';
import { useExpressServer, useContainer } from 'routing-controllers';
var createError = require('http-errors');
var cookieParser = require('cookie-parser');
import expressWinston from 'express-winston';
import LoggerInstance from './LoggerInstance';
import cors from 'cors';
import '../otel';
import Container from 'typedi';
import bodyParser from 'body-parser';
import actions from '../actions.json';

const app = express();

app.get('/api/actions', (req, res) => {
    res.status(200).json(actions);
})

app.use(cors());
app.use(
    expressWinston.logger({
        winstonInstance: LoggerInstance
    })
);
// adding this middleware to parse SNS requests, which are sent as text/plain by default
app.use(function (req, res, next) {
    if (req.get('x-amz-sns-message-type')) {
        req.headers['content-type'] = 'application/json';
    }
    next();
});
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(bodyParser.json({ type: 'application/cloudevents+json', limit: '50mb' } ));


useContainer(Container);

import { DiscoveryController } from '../api/controllers/discovery/DiscoveryController';
import { ConstructAlertsPayloadController } from '../api/controllers/alerts/ConstructAlertsPayloadController';
import { AlertsController } from '../api/controllers/alerts/AlertsController';
import { VerificationController } from '../api/controllers/verification/VerificationController';
import {OnDemandMetricsController} from '../api/controllers/onDemandMetrics/OnDemandMetricsController';
import {HealthCheckController} from '../api/controllers/health-check/health-check-controller';
import {UpdateAlertNoteController} from '../api/controllers/alerts/UpdateAlertNoteController';
import { RelationshipDiscoveryController } from '../api/controllers/cdpNeighbour/RelationshipDiscoveryController';
useExpressServer(app, {
    controllers: [DiscoveryController, ConstructAlertsPayloadController, AlertsController, VerificationController, OnDemandMetricsController, HealthCheckController, UpdateAlertNoteController, RelationshipDiscoveryController]
});
// catch 404 and forward to error handler
app.use(function (req: any, res: any, next: any) {
    next(createError(404));
});
// error handler
app.use((err: any, req: any, res: any, next: any) => {
    // set locals, only providing error in development
    if (!res.finished) {
        res.locals.message = err.message;
        res.locals.error = req.app.get('env') === 'development' ? err : {};
        const response_msg =
            req.app.get('env') === 'development' ? err.stack : err.message;
        // render the error page
        res.status(err.status || 500);
        try {
            res.send(response_msg);
        } catch (e) {
            res.send(JSON.stringify(response_msg));
        }
    }
});
export default app;