import winston from 'winston';
import { Container } from 'typedi';
import { describeAllRelationshipsService } from '../../../src/services/discovery/describeAllRelationshipsService';
import { publishToDIS } from '../../../src/utils/publishToDIS';

jest.mock('../../../src/utils/publishToDIS');

describe('describeAllRelationshipsService', () => {
    let logger: winston.Logger;
    let axiosGetMock: jest.Mock;

    const body = {
        url: 'https://sn.instance',
        username: 'user',
        password: 'pass',
        zone_id: 'zone1',
        stack_id: 'stack1',
    };

    const className = 'cmdb_rel_ci';
    const contextId = 'ctx-1';
    const nodeIds = ['n1', 'n2'];

    const sourceRelationship = {
        parent: { value: 'n1' },
        child: { value: 'n2' },
    };

    beforeEach(() => {
        logger = {
            info: jest.fn(),
            error: jest.fn(),
        } as any;

        axiosGetMock = jest.fn();

        jest.spyOn(Container, 'get').mockImplementation((key: unknown) => {
            if (key === 'loggerInstance') return logger;
            if (key === 'axiosInstance') return { get: axiosGetMock };
            return undefined as any;
        });

        (publishToDIS as jest.Mock).mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should fetch relationships and publish them to DIS', async () => {
        axiosGetMock.mockResolvedValueOnce({
            status: 200,
            data: {
                result: [sourceRelationship],
            },
            headers: {},
        });

        await describeAllRelationshipsService(
            body as any,
            className,
            nodeIds,
            contextId,
        );

        /* Axios call */
        expect(axiosGetMock).toHaveBeenCalledTimes(1);
        expect(axiosGetMock).toHaveBeenCalledWith(
            expect.stringContaining(`/api/now/table/${className}`),
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: expect.stringContaining('Basic'),
                }),
                params: expect.objectContaining({
                    sysparm_query: expect.stringContaining('parent.sys_idIN'),
                }),
            }),
        );

        /* publishToDIS */
        expect(publishToDIS).toHaveBeenCalledTimes(1);
        expect(publishToDIS).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    src_id: 'n1',
                    dest_id: 'n2',
                    label: 'CONNECTS',
                    properties: expect.objectContaining({
                        id: 'n1.CONNECTS.n2',
                        weight: 1,
                        cost: 1,
                    }),
                }),
            ]),
            'relationship',
        );
    });

    it('should follow pagination and publish relationships for each page', async () => {
        axiosGetMock
            .mockResolvedValueOnce({
                status: 200,
                data: {
                    result: [
                        {
                            parent: { value: 'n1' },
                            child: { value: 'n2' },
                        },
                    ],
                },
                headers: {
                    link: '<https://next.page>; rel="next"',
                },
            })
            .mockResolvedValueOnce({
                status: 200,
                data: {
                    result: [
                        {
                            parent: { value: 'n2' },
                            child: { value: 'n3' },
                        },
                    ],
                },
                headers: {},
            });

        await describeAllRelationshipsService(
            body as any,
            className,
            nodeIds,
            contextId,
        );

        expect(axiosGetMock).toHaveBeenCalledTimes(2);
        expect(axiosGetMock).toHaveBeenNthCalledWith(
            1,
            expect.stringContaining(`/api/now/table/${className}`),
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: expect.stringContaining('Basic'),
                }),
                params: expect.objectContaining({
                    sysparm_query: expect.stringContaining('parent.sys_idIN'),
                    sysparm_limit: 100,
                }),
            }),
        );

        expect(axiosGetMock).toHaveBeenNthCalledWith(
            2,
            'https://next.page',
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: expect.stringContaining('Basic'),
                }),
                params: {}, // params must be cleared after pagination
            }),
        );

        expect(publishToDIS).toHaveBeenCalledTimes(2);
        expect(publishToDIS).toHaveBeenNthCalledWith(
            1,
            [
                {
                    src_id: 'n1',
                    dest_id: 'n2',
                    label: 'CONNECTS',
                    properties: expect.objectContaining({
                        id: 'n1.CONNECTS.n2',
                        weight: 1,
                        cost: 1,
                    }),
                },
            ],
            'relationship',
        );

        expect(publishToDIS).toHaveBeenNthCalledWith(
            2,
            [
                {
                    src_id: 'n2',
                    dest_id: 'n3',
                    label: 'CONNECTS',
                    properties: expect.objectContaining({
                        id: 'n2.CONNECTS.n3',
                        weight: 1,
                        cost: 1,
                    }),
                },
            ],
            'relationship',
        );
    });

    it('should log error and stop loop when axios returns non-200', async () => {
        axiosGetMock.mockResolvedValueOnce({
            status: 500,
            data: {},
            headers: {},
        });

        await describeAllRelationshipsService(
            body as any,
            className,
            nodeIds,
            contextId,
        );

        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('Cannot describe all relationships for className'),
        );

        expect(publishToDIS).not.toHaveBeenCalled();
    });

    it('should return error when axios throws exception', async () => {
        const err = new Error('network down');
        axiosGetMock.mockRejectedValueOnce(err);

        const result = await describeAllRelationshipsService(
            body as any,
            className,
            nodeIds,
            contextId,
        );

        expect(result).toBe(err);
        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('Cannot describe all relationships for given the className'),
        );
        expect(publishToDIS).not.toHaveBeenCalled();
    });

    it('should publish empty relationship array when no relationships are found', async () => {
        axiosGetMock.mockResolvedValueOnce({
            status: 200,
            data: { result: [] },
            headers: {},
        });

        await describeAllRelationshipsService(
            body as any,
            className,
            nodeIds,
            contextId,
        );

        expect(publishToDIS).toHaveBeenCalledWith([], 'relationship');
    });
});
