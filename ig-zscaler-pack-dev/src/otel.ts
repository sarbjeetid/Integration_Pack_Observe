// src/otel.ts

// OpenTelemetry configuration file
// Configure OpenTelemetry for monitoring and tracing

import { NodeTracerProvider } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { registerInstrumentations } from '@opentelemetry/instrumentation';

export const initializeOTel = () => {
    try {
        registerInstrumentations({
            instrumentations: [getNodeAutoInstrumentations()],
        });
    } catch (error) {
        console.error('Failed to initialize OpenTelemetry', error);
    }
};

export default initializeOTel;
