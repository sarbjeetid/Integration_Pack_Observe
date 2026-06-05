import express from 'express';
import cors from 'cors';
import expressWinston from 'express-winston';
import loggerInstance from './logger';
import incidentRoutes from '../routes/incidentRouter'; // Import the incident routes
import discoveryRoutes from '../routes/discoveryRouter';
import actions from '../../actions.json';
import bodyParser from 'body-parser';
import scenarioRoutes from '../routes/scenarioRoutes'; // Import the scenario routes
import healthRoutes from '../routes/healthCheck.router';
import '../otel';
const app = express();

app.get('/api/actions', (req, res) => {
    res.status(200).json(actions);
})

app.use(cors());
app.use(
    expressWinston.logger({
        winstonInstance: loggerInstance
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json({ type: 'application/cloudevents+json' }));

app.use('/api/incident', incidentRoutes);
app.use('/api/discovery', discoveryRoutes);
app.use('/api/scenario', scenarioRoutes);
app.use('/api/health', healthRoutes);
export default app;