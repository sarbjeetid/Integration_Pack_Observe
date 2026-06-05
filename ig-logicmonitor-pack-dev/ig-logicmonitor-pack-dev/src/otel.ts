import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { AzureMonitorTraceExporter } from '@azure/monitor-opentelemetry-exporter';
import { Resource } from '@opentelemetry/resources';
import { ConsoleSpanExporter} from '@opentelemetry/sdk-trace-base'
import { SEMRESATTRS_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import config from './config'
import LoggerInstance from './loaders/LoggerInstance';
const appInsightsEnabled = config.enableAppInsightsTracing;
let sdk: NodeSDK;

// Function to start tracing
async function startTracing(): Promise<void> {
  try {
    if (sdk) {
      await sdk.start();
      LoggerInstance.info('Tracing initialized');
    }
  } catch (error) {
    LoggerInstance.info('Error initializing tracing', error);
  }
}
if (appInsightsEnabled === 'true'){
    sdk = new NodeSDK({
      resource: new Resource({
        [SEMRESATTRS_SERVICE_NAME]: config.cloudRoleName
      }),
      traceExporter: config.appInsightsConnectionString ? new AzureMonitorTraceExporter({
        connectionString: config.appInsightsConnectionString,
      }) : new ConsoleSpanExporter(),
      instrumentations: [getNodeAutoInstrumentations()],
    });

  
    startTracing();

    // Ensure the SDK is shut down on exit to flush telemetry data
    process.on('SIGTERM', () => {
      sdk.shutdown()
        .then(() => LoggerInstance.info('Tracing terminated'))
        .catch((error) => LoggerInstance.info(`Error terminating tracing: ${error}`))
        .finally(() => process.exit(0));
    });

} else {
  LoggerInstance.info('Application Insights tracing is disabled.');
}

