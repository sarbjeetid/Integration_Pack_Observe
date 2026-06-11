import { DaprClient } from 'dapr-client';
import config from '../config';

const daprHost = config.daprHost;
const daprPort = config.daprHttpPort;

// Prefix with http:// if not already present, DaprClient expects it sometimes
const resolvedHost = daprHost.startsWith('http') ? daprHost : `http://${daprHost}`;

const daprClient = new DaprClient(resolvedHost, `${daprPort}`);

export default daprClient;
