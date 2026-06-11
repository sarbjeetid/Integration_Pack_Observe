import express from 'express';
import {
    startDiscoveryController,
    listResourcesController,
    describeResourceController,
    describeAllResourcesController,
    describeAllRelationshipsController,
    verifyCreateStack
} from '../controllers/discoveryController';
import bodyParser from 'body-parser';

const router = express.Router();

// Route for starting discovery
router.post('/start', startDiscoveryController);

// Route for listing resources
router.post('/listResources', bodyParser.json({ type: 'application/cloudevents+json' }), (req, res, next) => {
    req.body = req.body.data;
    next();
}, listResourcesController);

// Route for describing a resource
router.post('/describeResource', bodyParser.json({ type: 'application/cloudevents+json' }), (req, res, next) => {
    req.body = req.body.data;
    next();
}, describeResourceController);

// Route for describing all resources
router.post('/describeAllResources', bodyParser.json({ type: 'application/cloudevents+json' }), (req, res, next) => {
    req.body = req.body.data;
    next();
}, describeAllResourcesController);

// Route for describing all relationships
router.post('/describeAllRelationships', bodyParser.json({ type: 'application/cloudevents+json' }), (req, res, next) => {
    req.body = req.body.data;
    next();
}, describeAllRelationshipsController);

// Route for verification of credentials
router.post('/step/verify/createStack', verifyCreateStack);

export default router;
