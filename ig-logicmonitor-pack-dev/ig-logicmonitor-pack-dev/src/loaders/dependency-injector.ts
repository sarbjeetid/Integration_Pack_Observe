import { Container } from 'typedi';
import LoggerInstance from './LoggerInstance';
import expressApp from './app';
import daprClient from './daprClient';
import config from "../config";
import { secrets as vaultClient, edgeSecrets as edgeVaultClient } from './vault';


export default () => {
    try {
        Container.set('loggerInstance', LoggerInstance);
        LoggerInstance.info('Logger loaded and injected');
        Container.set('expressApp', expressApp);
        LoggerInstance.info('Express App loaded and injected');
        // Injecting the appropriate client based on the config
        if (config.deployed_at === 'edge') {
            Container.set('edgeVaultClient', new edgeVaultClient());
            LoggerInstance.info('Edge Vault Client loaded and injected');
        } else if (config.deployed_at === 'core') {
            Container.set('vaultClient', new vaultClient());
            LoggerInstance.info('Vault Client loaded and injected');
        }
        Container.set('daprClient', daprClient);
        LoggerInstance.info('Dapr Client loaded and injected');
    } catch (e) {
        LoggerInstance.error('Error on dependency injector loader: %o', e);
        throw e;
    }
};
