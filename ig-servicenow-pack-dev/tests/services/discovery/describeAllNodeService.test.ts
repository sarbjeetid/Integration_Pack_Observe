import winston from 'winston';
import { Container } from 'typedi';
import { describeAllNodesService } from '../../../src/services/discovery/describeAllNodesService';
import { publishToDIS } from '../../../src/utils/publishToDIS';
import sleep from '../../../src/utils/sleep';
import config from '../../../src/config';

jest.mock('../../../src/utils/publishToDIS');
jest.mock('../../../src/utils/sleep');

jest.mock('../../../src/config', () => ({
    discoveryPubSubName: 'discovery-pubsub',
    describeAllRelationshipsTopicName: 'describe-all-relationships',
    waitTimeinMs: 0,
}));

describe('describeAllNodesService', () => {
    let logger: winston.Logger;
    let axiosGetMock: jest.Mock;
    let daprPublishMock: jest.Mock;

    const body = {
        url: 'https://sn.instance',
        username: 'user',
        password: 'pass',
        zone_id: 'zone1',
        stack_id: 'stack1',
    };

    const className = 'cmdb_ci';
    const contextId = 'ctx-1';

    const sourceNodeFull = {
        sys_id: 'n1',
        name: 'Node-1',
        sys_class_name: 'cmdb_ci',
        u_id: 'CENTER1',
        category: 'server',
        subcategory: 'linux',
        location: { display_value: 'BLR', value: 'blr' },
        assignment_group: 'AG1',
    };

    const sourceNodeMinimal = {
        sys_id: 'n2',
        name: null,
        sys_class_name: null,
    };

    beforeEach(() => {
        logger = {
            info: jest.fn(),
            error: jest.fn(),
        } as any;

        axiosGetMock = jest.fn();
        daprPublishMock = jest.fn().mockResolvedValue(undefined);

        jest.spyOn(Container, 'get').mockImplementation((key: unknown) => {
            if (key === 'loggerInstance') return logger;
            if (key === 'axiosInstance') return { get: axiosGetMock };
            if (key === 'daprClient')
                return { pubsub: { publish: daprPublishMock } };
            return undefined as any;
        });

        (publishToDIS as jest.Mock).mockResolvedValue(undefined);
        (sleep as jest.Mock).mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should fetch nodes, map them correctly, publish CI nodes, and enqueue relationships job', async () => {
        axiosGetMock.mockResolvedValueOnce({
            status: 200,
            data: {
                result: [sourceNodeFull],
            },
            headers: {},
        });

        await describeAllNodesService(body as any, className, contextId);

        /* Axios */
        expect(axiosGetMock).toHaveBeenCalledTimes(1);
        expect(axiosGetMock).toHaveBeenCalledWith(
            expect.stringContaining(`/api/now/table/${className}`),
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: expect.stringContaining('Basic'),
                }),
            }),
        );

        /* CI publish */
        expect(publishToDIS).toHaveBeenCalledTimes(1);
        expect(publishToDIS).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    id: 'n1',
                    source_name: 'Node-1',
                    zone_id: 'zone1',
                    stack_id: 'stack1',
                    ci_merge_key: 'CENTER1',
                    citype: 'cmdb_ci',
                }),
            ]),
            'ci',
        );

        /* Relationship enqueue */
        expect(daprPublishMock).toHaveBeenCalledTimes(1);
        expect(daprPublishMock).toHaveBeenCalledWith(
            config.discoveryPubSubName,
            config.describeAllRelationshipsTopicName,
            {
                body,
                className: 'cmdb_rel_ci',
                nodeIds: ['n1'],
                contextId,
            },
        );
    });

    it('should safely map nodes when optional fields are missing', async () => {
        axiosGetMock.mockResolvedValueOnce({
            status: 200,
            data: {
                result: [sourceNodeMinimal],
            },
            headers: {},
        });

        await describeAllNodesService(body as any, className, contextId);

        expect(publishToDIS).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    id: 'n2',
                    source_name: 'No Name',
                    location: 'NA',
                    citype: className,
                    label: `CI:${className.toUpperCase()}`,
                    display_type: className,
                    itsm: {},               // important edge case
                }),
            ]),
            'ci',
        );

    });

    it('should include sysparm_query when body.query exists', async () => {
        const bodyWithQuery = { ...body, query: 'active=true' };

        axiosGetMock.mockResolvedValueOnce({
            status: 200,
            data: { result: [] },
            headers: {},
        });

        await describeAllNodesService(bodyWithQuery as any, className, contextId);

        expect(axiosGetMock).toHaveBeenCalledWith(
            expect.stringContaining('sysparm_query=active=true'),
            expect.any(Object),
        );
    });

    it('should follow pagination and clear params for subsequent requests', async () => {
        axiosGetMock
            .mockResolvedValueOnce({
                status: 200,
                data: { result: [sourceNodeFull] },
                headers: {
                    link: '<https://next.page>; rel="next"',
                },
            })
            .mockResolvedValueOnce({
                status: 200,
                data: { result: [sourceNodeFull] },
                headers: {},
            });

        await describeAllNodesService(body as any, className, contextId);

        expect(axiosGetMock).toHaveBeenCalledTimes(2);
        expect(publishToDIS).toHaveBeenCalledTimes(2);
        expect(daprPublishMock).toHaveBeenCalledTimes(2);
    });

    it('should log error when dapr publish fails but continue execution', async () => {
        daprPublishMock.mockRejectedValueOnce(new Error('dapr failure'));

        axiosGetMock.mockResolvedValueOnce({
            status: 200,
            data: { result: [sourceNodeFull] },
            headers: {},
        });

        await describeAllNodesService(body as any, className, contextId);

        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('Cannot publish to describeAllRelationships topic'),
        );

        expect(publishToDIS).toHaveBeenCalledTimes(1);
    });

    it('should log error and stop loop when axios returns non-200', async () => {
        axiosGetMock.mockResolvedValueOnce({
            status: 500,
            data: {},
            headers: {},
        });

        await describeAllNodesService(body as any, className, contextId);

        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('Cannot describe all resources for className'),
        );

        expect(publishToDIS).not.toHaveBeenCalled();
        expect(daprPublishMock).not.toHaveBeenCalled();
    });

    it('should return error when axios throws exception', async () => {
        const err = new Error('network down');

        axiosGetMock.mockRejectedValueOnce(err);

        const result = await describeAllNodesService(
            body as any,
            className,
            contextId,
        );

        expect(result).toBe(err);
        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('Cannot describe all resources for given the className'),
        );

        expect(publishToDIS).not.toHaveBeenCalled();
        expect(daprPublishMock).not.toHaveBeenCalled();
    });
});
