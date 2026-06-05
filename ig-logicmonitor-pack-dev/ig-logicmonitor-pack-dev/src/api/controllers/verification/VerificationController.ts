import { JsonController, Post, Body} from 'routing-controllers';
import { Service, Container } from 'typedi';
import SecretsManager from '../../../utils/secrets-manager';
import winston from 'winston';
import config from '../../../config';
import {VerifyAPI} from '../../../interfaces/verification';
import path from "path";
import { verificationService } from '../../services/verification/verificationService';

@JsonController('/api/verification')
@Service()
export class VerificationController {
    constructor(private secretsManager: SecretsManager) { }
    @Post('/step/verify/apiVerification')
    async apiVerification(@Body() stack: VerifyAPI) {
        const loggerInstance: winston.Logger = Container.get('loggerInstance');
        let secrets = null;
        try {
            secrets = await this.secretsManager.fetchDiscoveryCredentials(
                stack.zone_id,
                stack.stack_id,
                config.platforms.LOGICMONITOR as 'logicmonitor',
                stack?.vault_path
            );
        } catch (err) {
            loggerInstance.error(`Error in fetching secrets ${err}`, {path: path.relative(process.cwd(), __filename)});
            return {
                error: 'Cannot fetch secrets',
                data: err
            };
        }
        if (secrets && secrets.accessId && secrets.accessKey && secrets.accountName) {
            // Use actual credentials
            stack.access_id = secrets.accessId;
            stack.access_key = secrets.accessKey;
            stack.account_name = secrets.accountName;
        }
        
        let accessId = stack.access_id;
        let accessKey: any = stack.access_key;
        let accountName = stack.account_name;
        try {
            return await verificationService(accessId, accessKey, accountName);
    
        } catch (e) {
            loggerInstance.error(`[controllers::verification::logicmonitor::VerificationController.ts::verificationService] Error: ${JSON.stringify(e)}`);
            return false;
        }
    }
}
