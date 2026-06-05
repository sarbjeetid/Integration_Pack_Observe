import { JsonController, Post, Body, Res, HeaderParam } from 'routing-controllers';
import { Response } from 'express';
import { LogicmonitorAlertI, CoreAlertI } from '../../../interfaces/alerts';
import winston from 'winston';
import { Container, Service } from 'typedi';
import { alertTransformerService } from '../../services/alerts/alertTransformer';
import path from "path";
@JsonController('/api/alerts')
@Service()
export class AlertsController {
    @Post('/')
    async transformAlerts(
        @Body() alertRequest: LogicmonitorAlertI, @HeaderParam("zone_id") zone_id: string, @HeaderParam("stack_id") stack_id: string, @HeaderParam("vault_path") vault_path: string, @Res() response: Response) {
            const loggerInstance: winston.Logger = Container.get('loggerInstance');
            try {
                loggerInstance.info(`Incoming alert data ${JSON.stringify(alertRequest)}`, {path: path.relative(process.cwd(), __filename)});
                let zone_arr = JSON.parse(zone_id);
                zone_id = zone_arr[0];
                loggerInstance.info(`Inside alert transformer`, {path: path.relative(process.cwd(), __filename)});
                let transformedAlert: CoreAlertI = await alertTransformerService(alertRequest, stack_id, zone_id);
                loggerInstance.info(`Published alert: ${transformedAlert}`, {path: path.relative(process.cwd(), __filename)});
                return response.status(200).json(transformedAlert);
            } catch (error) {
                // Handle the error
                loggerInstance.error(`Error occurred for publishing transformed alerts: ${error}`, {path: path.relative(process.cwd(), __filename)});
                return response.status(500).json({ error: "Internal server error for publishing transformed alerts"});
            }
    }
}