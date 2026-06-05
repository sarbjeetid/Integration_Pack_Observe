import { JsonController, Post, Body, Res } from 'routing-controllers';
import { Response } from 'express';
import { AlertRequestI} from '../../../interfaces/alerts';
import winston from 'winston';
import { Container, Service } from 'typedi';
import { constructAlertPayloadService } from '../../services/alerts/constructAlertsPayload';
import path from "path";
@JsonController('/api/alerts')
@Service()
export class ConstructAlertsPayloadController {
    @Post('/fetchPayload')
    async transformAlerts(
        @Body() stack: AlertRequestI, @Res() response: Response) {
            const loggerInstance: winston.Logger = Container.get('loggerInstance');
            try {
                let transformedAlertPayload = await constructAlertPayloadService();
                loggerInstance.info("Alerts payload created successfully", {path: path.relative(process.cwd(), __filename)});
                return response.status(200).json(transformedAlertPayload);
            } catch (error) {
                // Handle the error
                loggerInstance.error(`Error occurred for getting transforming alerts payload: ${error}`, {path: path.relative(process.cwd(), __filename)});
                return response.status(500).json({ error: "Internal server error for getting transforming alerts payload"});
            }
    }
}