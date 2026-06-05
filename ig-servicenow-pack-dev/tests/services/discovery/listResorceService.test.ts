import winston from 'winston';
import { Container } from 'typedi';
import { listResourcesService } from '../../../src/services/discovery/listResourcesService';
import sleep from '../../../src/utils/sleep';
import config from '../../../src/config';

jest.mock('../../../src/config', () => ({
  discoveryPubSubName: 'discovery-pubsub',
  describeResourceTopicName: 'describe-resource-topic',
  describeAllResourcesTopicName: 'describe-all-resources-topic',
  waitTimeinMs: 0,
  maxResourceDiscoveryCount: undefined,
}));

jest.mock('../../../src/utils/sleep');

describe('listResourcesService', () => {
  let logger: winston.Logger;
  let axiosGetMock: jest.Mock;
  let publishMock: jest.Mock;

  const bodyBase = {
    url: 'https://sn.instance',
    username: 'user',
    password: 'pass',
    zone_id: 'zone1',
    stack_id: 'stack1',
  };

  const className = 'cmdb_ci';
  const contextId = 'ctx-1';

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      error: jest.fn(),
    } as any;

    axiosGetMock = jest.fn();
    publishMock = jest.fn().mockResolvedValue(undefined);

    jest.spyOn(Container, 'get').mockImplementation((key: unknown) => {
      if (key === 'loggerInstance') return logger;
      if (key === 'axiosInstance') return { get: axiosGetMock };
      if (key === 'daprClient') return { pubsub: { publish: publishMock } };
      return undefined as any;
    });

    (sleep as jest.Mock).mockResolvedValue(undefined);

    // default: no discovery limit
    (config as any).maxResourceDiscoveryCount = undefined;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should construct URL with query when body.query exists', async () => {
    const body = { ...bodyBase, query: 'active=true' };

    axiosGetMock.mockResolvedValueOnce({
      status: 200,
      data: { result: [] },
      headers: {},
    });

    await listResourcesService(body as any, className, contextId);

    expect(axiosGetMock).toHaveBeenCalledWith(
      expect.stringContaining('sysparm_query=active=true'),
      expect.any(Object),
    );
  });

  it('should construct URL without query when body.query does not exist', async () => {
    axiosGetMock.mockResolvedValueOnce({
      status: 200,
      data: { result: [] },
      headers: {},
    });

    await listResourcesService(bodyBase as any, className, contextId);

    expect(axiosGetMock).toHaveBeenCalledWith(
      expect.not.stringContaining('sysparm_query'),
      expect.any(Object),
    );
  });

  it('should list resources and publish describeResource messages', async () => {
    axiosGetMock.mockResolvedValueOnce({
      status: 200,
      data: {
        result: [
          { sys_id: 'r1', name: 'res1' },
          { sys_id: 'r2', name: 'res2' },
        ],
      },
      headers: {},
    });

    await listResourcesService(bodyBase as any, className, contextId);

    expect(publishMock).toHaveBeenCalledTimes(2);
    expect(publishMock).toHaveBeenNthCalledWith(
      1,
      config.discoveryPubSubName,
      config.describeResourceTopicName,
      {
        body: bodyBase,
        className,
        resourceId: 'r1',
        contextId,
      },
    );
  });

  it('should follow pagination via link header', async () => {
    axiosGetMock
      .mockResolvedValueOnce({
        status: 200,
        data: { result: [{ sys_id: 'r1', name: 'res1' }] },
        headers: {
          link: '<https://next.page>; rel="next"',
        },
      })
      .mockResolvedValueOnce({
        status: 200,
        data: { result: [{ sys_id: 'r2', name: 'res2' }] },
        headers: {},
      });

    await listResourcesService(bodyBase as any, className, contextId);

    expect(axiosGetMock).toHaveBeenCalledTimes(2);
    expect(publishMock).toHaveBeenCalledTimes(2);
  });

  it('should stop processing when max discovery limit is reached', async () => {
    (config as any).maxResourceDiscoveryCount = 1;

    axiosGetMock.mockResolvedValueOnce({
      status: 200,
      data: {
        result: [
          { sys_id: 'r1', name: 'res1' },
          { sys_id: 'r2', name: 'res2' },
        ],
      },
      headers: {},
    });

    await listResourcesService(bodyBase as any, className, contextId);

    expect(publishMock).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Discovery limit of 1 reached'),
    );
  });

  it('should log error and continue when publish fails', async () => {
    publishMock.mockRejectedValueOnce(new Error('publish failed'));

    axiosGetMock.mockResolvedValueOnce({
      status: 200,
      data: { result: [{ sys_id: 'r1', name: 'res1' }] },
      headers: {},
    });

    await listResourcesService(bodyBase as any, className, contextId);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Cannot publish to describe resource topic'),
    );
  });

  it('should return Error when axios returns non-200', async () => {
    axiosGetMock.mockResolvedValueOnce({
      status: 500,
      data: { error: { message: 'server error' } },
      headers: {},
    });

    const result = await listResourcesService(bodyBase as any, className, contextId);

    expect(result).toBeInstanceOf(Error);
    expect(logger.error).toHaveBeenCalled();
  });

  it('should publish describeAllResources on 4xx axios error', async () => {
    axiosGetMock.mockRejectedValueOnce({
      response: { status: 403 },
    });

    await listResourcesService(bodyBase as any, className, contextId);

    expect(publishMock).toHaveBeenCalledWith(
      config.discoveryPubSubName,
      config.describeAllResourcesTopicName,
      {
        body: bodyBase,
        className,
        contextId,
      },
    );
  });

  it('should log error if describeAllResources publish fails', async () => {
    axiosGetMock.mockRejectedValueOnce({
      response: { status: 404 },
    });

    publishMock.mockRejectedValueOnce(new Error('fallback failed'));

    await listResourcesService(bodyBase as any, className, contextId);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Cannot publish to describeAllResources topic'),
    );
  });

  it('should return error on non-4xx axios error', async () => {
    const err = new Error('network down');

    axiosGetMock.mockRejectedValueOnce(err);

    const result = await listResourcesService(bodyBase as any, className, contextId);

    expect(result).toBe(err);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Cannot list resources for the given className'),
    );
  });
});
