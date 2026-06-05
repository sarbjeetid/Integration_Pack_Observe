import { Container } from 'typedi';
import loggerInstance from './logger';
import expressApp from './express';
// import { secrets } from './vault';
import axiosInstance from './axiosService';
import daprClient from './dapr';
import {edgeSecrets as edgeVaultClient} from './vault';

export default () => {
    try {
        Container.set('loggerInstance', loggerInstance);
        loggerInstance.info('Logger loaded and injected');
        Container.set('axiosInstance', axiosInstance); // Inject the axios instance
        loggerInstance.info('Axios instance loaded and injected');
        Container.set('expressApp', expressApp);
        loggerInstance.info('Express App loaded and injected');
        // Container.set('vaultClient', secrets);
        // loggerInstance.info('Vault Client loaded and injected');
        Container.set('edgeVaultClient', new edgeVaultClient());
        loggerInstance.info('Edge Vault Client loaded and injected');
        Container.set('daprClient', daprClient);
        loggerInstance.info('Dapr Client loaded and injected');

    } catch (e) {
        loggerInstance.error('Error on dependency injector loader: %o', e);
        throw e;
    }
};
