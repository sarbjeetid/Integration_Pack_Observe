import { JsonController, Post, Body, Res } from 'routing-controllers';
import { Response } from 'express';
import { Service, Container } from 'typedi';
import SecretsManager from '../../../utils/secrets-manager';
import winston from 'winston';
import config from '../../../config';
import { UpdateAlertNoteRequestI } from '../../../interfaces/alerts';
import path from "path";
import { updateAlertNoteService } from '../../services/alerts/updateAlertNote';

@JsonController('/api/alerts')
@Service()
export class UpdateAlertNoteController {
     constructor(private readonly secretsManager: SecretsManager) { }
     @Post('/updateAlertNote')
     async updateAlertNote(
          @Body() stack: UpdateAlertNoteRequestI, @Res() response: Response) {
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
                    let access_id = secrets.accessId;
                    let access_key = secrets.accessKey;
                    let account_name = secrets.accountName;

                    let responseData = await updateAlertNoteService(access_id, access_key, account_name, stack.source_alert_id || '', stack.servicenow_ticket_id || '', stack.observe_display_id || '');
                    if (responseData.status === 200) {
                         return response.status(200).json(responseData);
                    }
                    return response.status(500).send({ error: 'CannotUpdateAlertNote', data: responseData});
               } else {
                    return response.status(500).send({ error: 'SecretFetchError', data: 'Error in fetching secrets from vault' });
               }
          } catch (error) {
               loggerInstance.error(`[controllers::alerts::UpdateAlertNoteController.ts::updateAlertNote] Error: ${JSON.stringify(error)}`, { path: path.relative(process.cwd(), __filename) });
               return response.status(500).send({
                    error: 'Error occurred in updateAlertNote',
                    data: JSON.stringify(error)
               });
          }
     }
}