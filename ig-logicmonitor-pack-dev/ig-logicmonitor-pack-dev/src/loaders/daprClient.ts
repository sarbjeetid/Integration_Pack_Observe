import { DaprClient, DaprClientOptions, CommunicationProtocolEnum } from 'dapr-client';
import config from '../config';

const daprHost = config.daprHost;
const daprPort = config.daprHttpPort;

const daprOptions: DaprClientOptions = {
    daprHost: daprHost,               // Ensure this is a string (should already be)
    daprPort: String(daprPort),   // Ensure port is passed as a string
    communicationProtocol: CommunicationProtocolEnum.HTTP, // Assuming you want to use HTTP protocol
  };
const daprClient = new DaprClient(daprOptions);
export default daprClient;
