import { JsonController, Post, Body, Res } from 'routing-controllers';
import { Response } from 'express';
import { Service, Container } from 'typedi';
import SecretsManager from '../../../utils/secrets-manager';
import winston from 'winston';
import config from '../../../config';
import { GetMetricRequestI, GetMetricResponseI, LogicmonitorGetMetricRequestI } from '../../../interfaces/onDemandMetrics';
import { getLogicmonitorMetricDataService } from '../../services/onDemandMetrics/onDemandMetricService';
import path from "path";

@JsonController('/api/metrics')
@Service()
export class OnDemandMetricsController {
    constructor(private secretsManager: SecretsManager) { }

    @Post('/getMetricData')
    async getMetricData(@Body() stack: GetMetricRequestI, @Res() response: Response<GetMetricResponseI>) {
        const loggerInstance: winston.Logger = Container.get('loggerInstance');

        try {
            // fetch secrets from vault
            let secrets = null;
            try {
                secrets = await this.secretsManager.fetchDiscoveryCredentials(
                    stack.zone_id,
                    stack.stack_id,
                    config.platforms.LOGICMONITOR as 'logicmonitor',
                    stack?.vault_path
                );
            } catch (err) {
                loggerInstance.error(`Error in fetching secrets ${err}`, { path: path.relative(process.cwd(), __filename) });
                return {
                    error: 'Cannot fetch secrets',
                    data: err
                };
            }

            if (secrets && secrets.accessId && secrets.accessKey && secrets.accountName) {

                // Use actual credentials
                let logicmonitorMetricRequest: LogicmonitorGetMetricRequestI = {
                    ...stack,
                    access_id: secrets.accessId,
                    access_key: secrets.accessKey,
                    account_name: secrets.accountName
                }

                let responseData: GetMetricResponseI = await getLogicmonitorMetricDataService(logicmonitorMetricRequest);
                return responseData;
            } else {
                return response.status(500).send({ error: 'SecretFetchError', data: 'Error in fetching secrets from vault' });
            }
        } catch (error) {
            loggerInstance.error(`[controllers::onDemandMetrics::OnDemandMetricsController.ts::OnDemandMetricsController] Error: ${JSON.stringify(error)}`, { path: path.relative(process.cwd(), __filename) });
            return response.status(500).send({
                error: 'Error occurred in getMetricData',
                data: JSON.stringify(error)
            });
        }
    }
}
