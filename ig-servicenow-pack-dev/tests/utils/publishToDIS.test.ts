import axios from 'axios';
import Container from 'typedi';
import winston from 'winston';
import config from '../../src/config';
import { publishToDIS } from '../../src/utils/publishToDIS';

jest.mock('axios');

jest.mock('../../src/config', () => ({
  apiKey: 'test-api-key',
  dis_api_url: 'https://dis.test',
}));

describe('publishToDIS', () => {
  let logger: jest.Mocked<winston.Logger>;

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    jest.spyOn(Container, 'get').mockImplementation((key: any) => {
      if (key === 'loggerInstance') return logger;
      return undefined;
    });

    jest.clearAllMocks();
  });

  it('should publish document successfully when response status is 201', async () => {
    (axios.post as jest.Mock).mockResolvedValue({
      status: 201,
    });

    const doc = { id: '1' };

    await publishToDIS(doc, 'ci');

    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.post).toHaveBeenCalledWith(
      'https://dis.test/ci?apikey=test-api-key',
      doc,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should log error when response status is not 201', async () => {
    (axios.post as jest.Mock).mockResolvedValue({
      status: 400,
    });

    const doc = { id: '2' };

    await publishToDIS(doc, 'relationship');

    expect(axios.post).toHaveBeenCalledTimes(1);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('CANNOT Publish document to data ingestion service'),
    );

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('relationship'),
    );
  });

  it('should log error when axios throws exception', async () => {
    (axios.post as jest.Mock).mockRejectedValue(new Error('Network failure'));

    const doc = { id: '3' };

    await publishToDIS(doc, 'scenario');

    expect(axios.post).toHaveBeenCalledTimes(1);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error in publishing document to core'),
    );
  });

  it('should not throw even when axios fails', async () => {
    (axios.post as jest.Mock).mockRejectedValue(new Error('Timeout'));

    await expect(
      publishToDIS({ id: '4' }, 'alert'),
    ).resolves.toBeUndefined();
  });
});
