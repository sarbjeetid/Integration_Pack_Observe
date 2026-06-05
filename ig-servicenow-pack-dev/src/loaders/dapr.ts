import { DaprClient } from 'dapr-client';
import config from '../config';

const daprHost = config.daprHost;
const daprPort = config.daprHttpPort;

const daprClient = new DaprClient(daprHost, `${daprPort}`);

export default daprClient;
