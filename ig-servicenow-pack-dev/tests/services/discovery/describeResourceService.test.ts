import winston from 'winston';
import { Container } from 'typedi';
import { describeResourceService } from '../../../src/services/discovery/describeResourceService';
import { publishToDIS } from '../../../src/utils/publishToDIS';
import config from '../../../src/config';

jest.mock('p-limit', () => {
    return () => (fn: any) => fn();
});

jest.mock('../../../src/utils/publishToDIS');

jest.mock('../../../src/config', () => ({
    allowedAssignmentGroups: 'AG1,AG2',
    enableRelationshipDiscovery: true,
    instance: '',
}));

describe('describeResourceService', () => {
    let logger: winston.Logger;
    let axiosGetMock: jest.Mock;

    const body = {
        url: 'https://sn.instance',
        username: 'user',
        password: 'pass',
        zone_id: 'zone1',
        stack_id: 'stack1',
    };

    const className = 'cmdb_ci';
    const resourceId = 'res1';
    const contextId = 'ctx1';

    const validAttributes = {
        sys_id: 'res1',
        name: 'Server-1',
        sys_class_name: 'cmdb_ci',
        u_id: 'AG1',
        u_it_support_team: '924',
        install_status: 1,
        model_id: 'server',
        support_group: { display_value: 'NETWORK-LAN-GLB' },
        location: { display_value: 'BLR', value: 'blr' },
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
        (config as any).enableRelationshipDiscovery = true;
        (config as any).instance = '';
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should publish CI node and relationships with correct payloads', async () => {
        axiosGetMock
            .mockResolvedValueOnce({
                status: 200,
                data: {
                    result: {
                        attributes: validAttributes,
                        outbound_relations: [
                            {
                                target: { value: 'r2' },
                                type: { display_value: 'DependsOn' },
                            },
                        ],
                        inbound_relations: [
                            {
                                target: { value: 'r3' },
                                type: { display_value: 'HostedOn' },
                            },
                        ],
                    },
                },
            })
            .mockResolvedValueOnce({
                data: { result: { attributes: validAttributes } },
            })
            .mockResolvedValueOnce({
                data: { result: { attributes: validAttributes } },
            });

        await describeResourceService(body as any, className, resourceId, contextId);

        /* CI publish */
        expect(publishToDIS).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                id: 'res1',
                source_name: 'Server-1',
                zone_id: 'zone1',
                stack_id: 'stack1',
                citype: 'cmdb_ci',
            }),
            'ci',
        );

        /* Relationship publish */
        expect(publishToDIS).toHaveBeenNthCalledWith(
            2,
            expect.arrayContaining([
                expect.objectContaining({
                    src_id: 'res1',
                    dest_id: 'r2',
                }),
                expect.objectContaining({
                    src_id: 'r3',
                    dest_id: 'res1',
                }),
            ]),
            'relationship',
        );

        expect(publishToDIS).toHaveBeenCalledTimes(2);
        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining('Unique relationship types'),
        );
    });

    it('should skip node when assignment group is not allowed', async () => {
        axiosGetMock.mockResolvedValueOnce({
            status: 200,
            data: {
                result: {
                    attributes: { ...validAttributes, u_id: 'AG99' },
                    outbound_relations: [],
                    inbound_relations: [],
                },
            },
        });

        await describeResourceService(body as any, className, resourceId, contextId);

        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining('Device skipped due to unmatched assignment group'),
        );
        expect(publishToDIS).not.toHaveBeenCalled();
    });

    it('should exclude related nodes failing isNodeValid rules', async () => {
        axiosGetMock
            .mockResolvedValueOnce({
                status: 200,
                data: {
                    result: {
                        attributes: validAttributes,
                        outbound_relations: [{ target: { value: 'badNode' } }],
                        inbound_relations: [],
                    },
                },
            })
            .mockResolvedValueOnce({
                data: {
                    result: {
                        attributes: {
                            ...validAttributes,
                            model_id: 'AP-45', // invalid by isNodeValid
                        },
                    },
                },
            });

        await describeResourceService(body as any, className, resourceId, contextId);

        expect(publishToDIS).toHaveBeenCalledTimes(2);

        expect(publishToDIS).toHaveBeenNthCalledWith(
            1,
            expect.any(Object),
            'ci',
        );

        expect(publishToDIS).toHaveBeenNthCalledWith(
            2,
            expect.any(Array),
            'relationship',
        );
    });

    it('should skip related nodes returning 404 and log info', async () => {
        axiosGetMock
            .mockResolvedValueOnce({
                status: 200,
                data: {
                    result: {
                        attributes: validAttributes,
                        outbound_relations: [{ target: { value: '404node' } }],
                        inbound_relations: [],
                    },
                },
            })
            .mockRejectedValueOnce({
                response: { status: 404 },
            });

        await describeResourceService(body as any, className, resourceId, contextId);

        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining('Skipped 1 related nodes'),
        );
    });

    it('should log error when related node fetch fails with non-404', async () => {
        axiosGetMock
            .mockResolvedValueOnce({
                status: 200,
                data: {
                    result: {
                        attributes: validAttributes,
                        outbound_relations: [{ target: { value: 'badnode' } }],
                        inbound_relations: [],
                    },
                },
            })
            .mockRejectedValueOnce(new Error('boom'));

        await describeResourceService(body as any, className, resourceId, contextId);

        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('Failed to fetch related node'),
        );
    });

    it('should not publish relationships when discovery is disabled', async () => {
        (config as any).enableRelationshipDiscovery = false;

        axiosGetMock.mockResolvedValueOnce({
            status: 200,
            data: {
                result: {
                    attributes: validAttributes,
                    outbound_relations: [],
                    inbound_relations: [],
                },
            },
        });

        await describeResourceService(body as any, className, resourceId, contextId);

        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining('Relationship discovery is DISABLED'),
        );
        expect(publishToDIS).toHaveBeenCalledTimes(1);
        expect(publishToDIS).toHaveBeenCalledWith(expect.any(Object), 'ci');
    });

    it('should filter relationships when instance is LILLY', async () => {
        (config as any).instance = 'LILLY';

        axiosGetMock
            .mockResolvedValueOnce({
                status: 200,
                data: {
                    result: {
                        attributes: validAttributes,
                        outbound_relations: [{ target: { value: 'r2' } }],
                        inbound_relations: [],
                    },
                },
            })
            .mockResolvedValueOnce({
                data: { result: { attributes: validAttributes } },
            });

        await describeResourceService(body as any, className, resourceId, contextId);

        expect(publishToDIS).toHaveBeenCalledWith(expect.any(Array), 'relationship');
    });

    it('should return Error when axios returns non-200', async () => {
        axiosGetMock.mockResolvedValueOnce({
            status: 500,
            data: { error: { detail: 'failed' } },
        });

        const result = await describeResourceService(
            body as any,
            className,
            resourceId,
            contextId,
        );

        expect(result).toBeInstanceOf(Error);
        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('Cannot describe resource'),
        );
    });

    it('should return error when axios throws', async () => {
        const err = new Error('network down');
        axiosGetMock.mockRejectedValueOnce(err);

        const result = await describeResourceService(
            body as any,
            className,
            resourceId,
            contextId,
        );

        expect(result).toBe(err);
        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('Cannot describe resource for given resource ID'),
        );
    });
});
