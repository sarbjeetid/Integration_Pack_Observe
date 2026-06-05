import { createIncident } from '../../../src/services/incident/createIncidentService';
import { CustomerConfig } from '../../../src/interfaces/scenario';
import { Container } from 'typedi';
import { AxiosInstance } from 'axios';
import winston from 'winston';

import {
    buildCreateIncidentBody,
    validateAuthHeader,
    associateCIWithIncident,
    buildEndpointUrl,
    createScheduleInObserve,
    getFieldMappingForOperation,
} from '../../../src/services/incident/incidentUtils';

import { getMiddlewareHeaders } from '../../../src/services/authentication/authService';
import { auditLogApi } from '../../../src/utils/external-apis/core-apis';
import { sendServicenowFailureAlertToTeams } from '../../../src/utils/teams-notification/sendServicenowFailureAlertToTeams';
import { CreateIncidentError } from '../../../src/utils/errorHandling';
import config from '../../../src/config';
import { registerReassignmentSchedule } from '../../../src/utils/reassignmentScheduleRegistry';

jest.mock('../../../src/services/incident/incidentUtils');
jest.mock('../../../src/services/authentication/authService');
jest.mock('../../../src/utils/external-apis/core-apis');
jest.mock('../../../src/utils/teams-notification/sendServicenowFailureAlertToTeams');
jest.mock('../../../src/utils/reassignmentScheduleRegistry', () => ({
    registerReassignmentSchedule: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../src/config', () => ({
    externalApiUrl: 'https://observe.api',
}));
jest.mock('../../../src/utils/incidentRegistry', () => ({
    getRegisteredIncident: jest.fn().mockResolvedValue(null),
    isIncidentPending: jest.fn().mockResolvedValue(false),
    markIncidentPending: jest.fn().mockResolvedValue(undefined),
    clearIncidentPending: jest.fn().mockResolvedValue(undefined),
    registerIncident: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../src/utils/incidentLock', () => ({
    acquireIncidentLock: jest.fn().mockResolvedValue(true),
    releaseIncidentLock: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../src/utils/retry-apis/retryExecutor', () => ({
    executeWithRetry: jest.fn((fn) => fn()),
}));



const mockLogger: Partial<winston.Logger> = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
};

const mockAxiosInstance: Partial<AxiosInstance> = {
    post: jest.fn(),
};

beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(Container, 'get').mockImplementation((key: any) => {
        if (key === 'loggerInstance') return mockLogger as any;
        if (key === 'axiosInstance') return mockAxiosInstance as any;
        return null as any;
    });

    (getFieldMappingForOperation as jest.Mock).mockImplementation((method: string, config: any) => config?.fieldMapping || {});
});

/* BASE DATA  */
const baseIncidentData: any = {
    incidentId: 'INC_INTERNAL',
    scenario_id: 'SCN1',
    tenant_id: 'TENANT1',
    base_url: 'https://sn.instance',
};

const baseCustomerConfig: any = {
    name: 'TENANT1',
    apiType: 'servicenow',
    baseUrl: 'https://sn.instance',
    fieldMapping: {},
    linkCI: true,
    endpoints: {
        POST: { type: 'table', table: 'incident' },
    },
};

const authHeader = 'Bearer token';
const vaultPath = 'vault/path';

describe('createIncident', () => {

    it('creates incident, links CI, updates Observe, creates schedule successfully', async () => {
        const incidentData = {
            incidentId: 'INC_INTERNAL_HAPPY',
            scenario_id: 'SCN_HAPPY',
            tenant_id: 'TENANT1',
            base_url: 'https://sn.instance',
            sys_ci_id: 'CI_HAPPY',
            reassignment_action_id: 'RA_HAPPY',
            first_execution: 'delayed',
            transient_time: 5,
            edge_id: 'EDGE1',
            assignment_group: 'AG1',
        };

        const customerConfig = {
            name: 'TENANT1',
            apiType: 'servicenow',
            baseUrl: 'https://sn.instance',
            fieldMapping: {},
            linkCI: true,
            endpoints: {
                POST: { type: 'table', table: 'incident' },
            },
        } as unknown as CustomerConfig;

        /* Mocks */

        (buildCreateIncidentBody as jest.Mock).mockReturnValue({
            short_description: 'test incident',
        });

        (buildEndpointUrl as jest.Mock).mockReturnValue(
            'https://sn.instance/api/now/table/incident'
        );

        (validateAuthHeader as jest.Mock).mockReturnValue({
            Authorization: 'Bearer token',
        });

        (associateCIWithIncident as jest.Mock).mockResolvedValue({
            linked: true,
        });

        (createScheduleInObserve as jest.Mock).mockResolvedValue({
            _id: 'SCH1',
        });

        (mockAxiosInstance.post as jest.Mock)
            .mockResolvedValueOnce({
                data: {
                    result: {
                        sys_id: 'SYS_HAPPY',
                        number: 'INC_HAPPY',
                    },
                },
            })
            .mockResolvedValueOnce({});

        const response = await createIncident(
            incidentData,
            'Bearer token',
            undefined,
            'vault/path',
            customerConfig
        );

        expect(buildCreateIncidentBody).toHaveBeenCalledWith(
            incidentData,
            customerConfig.fieldMapping,
            undefined,
            undefined
        );

        expect(buildEndpointUrl).toHaveBeenCalledWith(
            'POST',
            baseCustomerConfig.baseUrl,
            customerConfig
        );




        expect(associateCIWithIncident).toHaveBeenCalledWith(
            'SYS_HAPPY',
            'CI_HAPPY',
            'Bearer token',
            incidentData,
            customerConfig,
            'vault/path'
        );

        expect(mockAxiosInstance.post).toHaveBeenNthCalledWith(
            2,
            'https://observe.api/api/scenario/updateTicketInfo',
            expect.any(Object),
            expect.any(Object)
        );



        expect(createScheduleInObserve).toHaveBeenCalledWith(
            expect.objectContaining({
                reassignment_action_id: 'RA_HAPPY',
                ticket_no: 'INC_HAPPY',
                interval_value: 5,
            })
        );
        expect(registerReassignmentSchedule).toHaveBeenCalledWith('SCN_HAPPY', 'SCH1');

        expect(auditLogApi).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'Success',
            }),
            'Create ServiceNow Incident INC_HAPPY'
        );

        expect(sendServicenowFailureAlertToTeams).not.toHaveBeenCalled();
        expect(response).toBeDefined();
    });

    /* INCIDENT CREATION */
    it('uses incidentData.base_url over customerConfig.baseUrl', async () => {
        const incidentData = { ...baseIncidentData, base_url: 'https://override.url' };

        (buildCreateIncidentBody as jest.Mock).mockReturnValue({});
        (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT_OVERRIDE');
        (validateAuthHeader as jest.Mock).mockReturnValue({ Authorization: authHeader });

        (mockAxiosInstance.post as jest.Mock)
            .mockResolvedValueOnce({ data: { result: { sys_id: 'SYS1', number: 'INC1' } } })
            .mockResolvedValueOnce({});

        await createIncident(
            incidentData,
            authHeader,
            undefined,
            vaultPath,
            baseCustomerConfig
        );

        expect(buildEndpointUrl).toHaveBeenCalledWith(
            'POST',
            baseCustomerConfig.baseUrl,
            baseCustomerConfig
        );
    });

    it('falls back to customerConfig.baseUrl when incidentData.base_url missing', async () => {
        const incidentData = { ...baseIncidentData };
        delete incidentData.base_url;

        (buildCreateIncidentBody as jest.Mock).mockReturnValue({});
        (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT_FALLBACK');
        (validateAuthHeader as jest.Mock).mockReturnValue({});

        (mockAxiosInstance.post as jest.Mock)
            .mockResolvedValueOnce({ data: { result: { sys_id: 'SYS2', number: 'INC2' } } })
            .mockResolvedValueOnce({});

        await createIncident(
            incidentData,
            authHeader,
            undefined,
            vaultPath,
            baseCustomerConfig
        );

        expect(buildEndpointUrl).toHaveBeenCalledWith(
            'POST',
            baseCustomerConfig.baseUrl,
            baseCustomerConfig
        );
    });

    /*  AUTH HEADER PATHS  */
    it('uses validateAuthHeader when apiType !== middleware', async () => {
        (buildCreateIncidentBody as jest.Mock).mockReturnValue({});
        (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
        (validateAuthHeader as jest.Mock).mockReturnValue({ H: 'AUTH' });

        (mockAxiosInstance.post as jest.Mock)
            .mockResolvedValueOnce({ data: { result: { sys_id: 'SYS3', number: 'INC3' } } })
            .mockResolvedValueOnce({});

        await createIncident(
            baseIncidentData,
            authHeader,
            undefined,
            vaultPath,
            baseCustomerConfig
        );

        expect(validateAuthHeader).toHaveBeenCalledWith(authHeader);
        expect(getMiddlewareHeaders).not.toHaveBeenCalled();
    });

    it('uses getMiddlewareHeaders when apiType === middleware', async () => {
        const customerConfig = { ...baseCustomerConfig, apiType: 'middleware' };

        (buildCreateIncidentBody as jest.Mock).mockReturnValue({});
        (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
        (getMiddlewareHeaders as jest.Mock).mockResolvedValue({ MW: 'HEADER' });

        (mockAxiosInstance.post as jest.Mock)
            .mockResolvedValueOnce({ data: { result: { sys_id: 'SYS4', number: 'INC4' } } })
            .mockResolvedValueOnce({});

        await createIncident(
            baseIncidentData,
            authHeader,
            undefined,
            vaultPath,
            customerConfig
        );

        expect(getMiddlewareHeaders).toHaveBeenCalledWith(vaultPath, authHeader);
    });

    /* CI ASSOCIATION */

    it('associates CI only when sys_ci_id AND linkCI=true', async () => {
        const incidentData = { ...baseIncidentData, sys_ci_id: 'CI1' };

        (buildCreateIncidentBody as jest.Mock).mockReturnValue({});
        (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
        (validateAuthHeader as jest.Mock).mockReturnValue({});

        (mockAxiosInstance.post as jest.Mock)
            .mockResolvedValueOnce({ data: { result: { sys_id: 'SYS5', number: 'INC5' } } })
            .mockResolvedValueOnce({});

        await createIncident(
            incidentData,
            authHeader,
            undefined,
            vaultPath,
            baseCustomerConfig
        );

        expect(associateCIWithIncident).toHaveBeenCalledWith(
            'SYS5',
            'CI1',
            authHeader,
            incidentData,
            baseCustomerConfig,
            vaultPath
        );
    });

    it('skips CI association when linkCI=false', async () => {
        const incidentData = { ...baseIncidentData, sys_ci_id: 'CI2' };
        const customerConfig = { ...baseCustomerConfig, linkCI: false };

        (buildCreateIncidentBody as jest.Mock).mockReturnValue({});
        (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
        (validateAuthHeader as jest.Mock).mockReturnValue({});

        (mockAxiosInstance.post as jest.Mock)
            .mockResolvedValueOnce({ data: { result: { sys_id: 'SYS6', number: 'INC6' } } })
            .mockResolvedValueOnce({});

        await createIncident(
            incidentData,
            authHeader,
            undefined,
            vaultPath,
            customerConfig
        );

        expect(associateCIWithIncident).not.toHaveBeenCalled();
    });

    /* OBSERVE UPDATE  */

    it('uses apikey in Observe URL when apiKeyToken present', async () => {
        (buildCreateIncidentBody as jest.Mock).mockReturnValue({});
        (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
        (validateAuthHeader as jest.Mock).mockReturnValue({});

        (mockAxiosInstance.post as jest.Mock)
            .mockResolvedValueOnce({ data: { result: { sys_id: 'SYS7', number: 'INC7' } } })
            .mockResolvedValueOnce({});

        await createIncident(
            baseIncidentData,
            authHeader,
            'APIKEY123',
            vaultPath,
            baseCustomerConfig
        );

        expect(mockAxiosInstance.post).toHaveBeenNthCalledWith(
            2,
            'https://observe.api/api/scenario/updateTicketInfo?apikey=APIKEY123',
            expect.any(Object),
            expect.any(Object)
        );

    });

    it('Observe failure does NOT throw and sends Teams alert', async () => {
        (buildCreateIncidentBody as jest.Mock).mockReturnValue({});
        (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
        (validateAuthHeader as jest.Mock).mockReturnValue({});

        (mockAxiosInstance.post as jest.Mock)
            .mockResolvedValueOnce({ data: { result: { sys_id: 'SYS8', number: 'INC8' } } })
            .mockRejectedValueOnce({ message: 'Observe fail' });

        await createIncident(
            baseIncidentData,
            authHeader,
            undefined,
            vaultPath,
            baseCustomerConfig
        );

        expect(sendServicenowFailureAlertToTeams).toHaveBeenCalled();
    });

    /* SCHEDULE CREATION  */

    it('forces transient_time=1 when first_execution=immediate', async () => {
        const incidentData = {
            ...baseIncidentData,
            reassignment_action_id: 'RA1',
            first_execution: 'immediate',
            transient_time: 0,
        };

        (buildCreateIncidentBody as jest.Mock).mockReturnValue({});
        (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
        (validateAuthHeader as jest.Mock).mockReturnValue({});

        (mockAxiosInstance.post as jest.Mock)
            .mockResolvedValueOnce({ data: { result: { sys_id: 'SYS9', number: 'INC9' } } })
            .mockResolvedValueOnce({});

        await createIncident(
            incidentData,
            authHeader,
            undefined,
            vaultPath,
            baseCustomerConfig
        );

        expect(createScheduleInObserve).toHaveBeenCalledWith(
            expect.objectContaining({ interval_value: 1 })
        );
    });

    it('schedule creation failure does not throw but sends Teams alert', async () => {
        const incidentData = {
            ...baseIncidentData,
            reassignment_action_id: 'RA2',
        };

        (buildCreateIncidentBody as jest.Mock).mockReturnValue({});
        (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
        (validateAuthHeader as jest.Mock).mockReturnValue({});

        (mockAxiosInstance.post as jest.Mock)
            .mockResolvedValueOnce({ data: { result: { sys_id: 'SYS10', number: 'INC10' } } })
            .mockResolvedValueOnce({});

        (createScheduleInObserve as jest.Mock).mockRejectedValue(
            new Error('Schedule fail')
        );

        await createIncident(
            incidentData,
            authHeader,
            undefined,
            vaultPath,
            baseCustomerConfig
        );

        expect(sendServicenowFailureAlertToTeams).toHaveBeenCalled();
    });

    /* HARD FAILURES  */

    it('throws CreateIncidentError when ServiceNow returns no sys_id', async () => {
        (buildCreateIncidentBody as jest.Mock).mockReturnValue({});
        (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
        (validateAuthHeader as jest.Mock).mockReturnValue({});

        (mockAxiosInstance.post as jest.Mock).mockResolvedValueOnce({
            data: { result: {} },
        });

        await expect(
            createIncident(
                baseIncidentData,
                authHeader,
                undefined,
                vaultPath,
                baseCustomerConfig
            )
        ).rejects.toBeInstanceOf(CreateIncidentError);
    });

    it('global catch sends Teams alert + audit log and rethrows', async () => {
        (buildCreateIncidentBody as jest.Mock).mockImplementation(() => {
            throw new Error('Fatal');
        });

        await expect(
            createIncident(
                baseIncidentData,
                authHeader,
                undefined,
                vaultPath,
                baseCustomerConfig
            )
        ).rejects.toThrow('Fatal');

        expect(sendServicenowFailureAlertToTeams).toHaveBeenCalledWith(
            expect.objectContaining({ failureType: 'create' })
        );

        expect(auditLogApi).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'Failure' }),
            expect.stringContaining('Create ServiceNow Incident')
        );
    });
});
