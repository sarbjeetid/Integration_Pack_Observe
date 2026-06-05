import { updateIncident } from '../../../src/services/incident/updateIncidentService';
import { Container } from 'typedi';
import winston from 'winston';
import { AxiosInstance } from 'axios';
import { CustomerConfig } from '../../../src/interfaces/scenario';
import { executeWithRetry } from '../../../src/utils/retry-apis/retryExecutor';



import {
    getSysIdAndPriorityForIncident,
    validateAuthHeader,
    formatIncidentDescription,
    buildEndpointUrl,
    buildUpdateIncidentBody,
    createScheduleInObserve,
    getFieldMappingForOperation,
} from '../../../src/services/incident/incidentUtils';

import { getMiddlewareHeaders } from '../../../src/services/authentication/authService';
import { auditLogApi } from '../../../src/utils/external-apis/core-apis';
import { sendServicenowFailureAlertToTeams } from '../../../src/utils/teams-notification/sendServicenowFailureAlertToTeams';
import { UpdateIncidentError } from '../../../src/utils/errorHandling';
import {
    getReassignmentScheduleId,
    registerReassignmentSchedule,
} from '../../../src/utils/reassignmentScheduleRegistry';

jest.mock('../../../src/services/incident/incidentUtils');
jest.mock('../../../src/services/authentication/authService');
jest.mock('../../../src/utils/external-apis/core-apis');
jest.mock('../../../src/utils/teams-notification/sendServicenowFailureAlertToTeams');
jest.mock('../../../src/utils/reassignmentScheduleRegistry', () => ({
    getReassignmentScheduleId: jest.fn().mockResolvedValue(null),
    registerReassignmentSchedule: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../src/utils/retry-apis/retryExecutor', () => ({
    executeWithRetry: jest.fn(),
}));

const mockLogger: Partial<winston.Logger> = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
};

const mockAxiosInstance: Partial<AxiosInstance> = {
    put: jest.fn(),
};

beforeEach(() => {
    jest.clearAllMocks();

  (executeWithRetry as jest.Mock).mockImplementation(
    async (fn: any) => fn()   // ⭐ THIS IS THE FIX
  );

  jest.spyOn(Container, 'get').mockImplementation((key: any) => {
    if (key === 'loggerInstance') return mockLogger as any;
    if (key === 'axiosInstance') return mockAxiosInstance as any;
    return null as any;
  });

  (getFieldMappingForOperation as jest.Mock).mockImplementation((method: string, config: any) => config?.fieldMapping || {});
  (getReassignmentScheduleId as jest.Mock).mockResolvedValue(null);
  (registerReassignmentSchedule as jest.Mock).mockResolvedValue(undefined);
});

const baseIncident = {
    incidentId: 'INC100',
    scenario_id: 'SCN1',
    tenant_id: 'TENANT1',
    base_url: 'https://sn.instance',
};

const baseSysData = {
    sys_id: 'SYS1',
    priority: 3,
    description: 'OLD_DESC',
    short_description: 'SHORT',
};

const baseCustomerConfig = {
    name: 'TENANT1',
    apiType: 'servicenow',
    baseUrl: 'https://sn.instance',
    fieldMapping: {},
    endpoints: {
        PUT: { type: 'table', table: 'incident' },
    },
} as unknown as CustomerConfig;


describe('updateIncident', () => {

    it('updates incident successfully with all fields and schedule', async () => {
        const updatedIncidentData = {
            ...baseIncident,
            interface: 'eth0',
            affected_ci_names: ['CI1'],
            work_notes: 'work note',
            impact: 2,
            urgency: 2,
            priority: 2,
            reassignment_action_id: 'RA1',
            first_execution: 'delayed',
            transient_time: 5,
            edge_id: 'EDGE1',
            assignment_group: 'AG1',
        };

        (getSysIdAndPriorityForIncident as jest.Mock).mockResolvedValue({
            ...baseSysData,
            priority: 3,
        });

        (formatIncidentDescription as jest.Mock).mockResolvedValue('NEW_DESC');
        (buildUpdateIncidentBody as jest.Mock).mockImplementation(v => v);
        (buildEndpointUrl as jest.Mock).mockReturnValue('https://sn/api/incident');
        (validateAuthHeader as jest.Mock).mockReturnValue({ Authorization: 'Bearer' });

        (mockAxiosInstance.put as jest.Mock).mockResolvedValue({
            data: { updated: true },
        });
        (getReassignmentScheduleId as jest.Mock).mockResolvedValue('SCH_EXISTING');
        (createScheduleInObserve as jest.Mock).mockResolvedValue({ _id: 'SCH_EXISTING' });

        const result = await updateIncident(
            updatedIncidentData,
            'Bearer',
            'vault',
            baseCustomerConfig
        );

        expect(getSysIdAndPriorityForIncident).toHaveBeenCalledWith(
            'INC100',
            'Bearer',
            updatedIncidentData,
            baseCustomerConfig,
            'vault'
        );

        expect(formatIncidentDescription).toHaveBeenCalledWith(
            'OLD_DESC',
            ['CI1']
        );

        expect(buildUpdateIncidentBody).toHaveBeenCalledWith(
            expect.objectContaining({
                short_description: 'SHORT | eth0',
                description: 'NEW_DESC',
                work_notes: 'work note',
                impact: 2,
                urgency: 2,
            }),
            {}
        );

        expect(mockAxiosInstance.put).toHaveBeenCalledWith(
            'https://sn/api/incident/SYS1',
            expect.any(Object),
            expect.objectContaining({
                headers: { Authorization: 'Bearer' },
                timeout: 45000,
            })
        );


        expect(createScheduleInObserve).toHaveBeenCalledWith(
            expect.objectContaining({
                schedule_id: 'SCH_EXISTING',
                reassignment_action_id: 'RA1',
                ticket_no: 'INC100',
                interval_value: 5,
            })
        );
        expect(registerReassignmentSchedule).toHaveBeenCalledWith('SCN1', 'SCH_EXISTING');

        expect(auditLogApi).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'Success' }),
            'Update ServiceNow Incident INC100'
        );

        expect(sendServicenowFailureAlertToTeams).not.toHaveBeenCalled();
        expect(result).toEqual({ updated: true });
    });

    /*  INTERFACE BRANCH */
    it('adds interface to short_description when interface is present', async () => {
        (getSysIdAndPriorityForIncident as jest.Mock).mockResolvedValue(baseSysData);
        (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
        (buildUpdateIncidentBody as jest.Mock).mockImplementation(v => v);
        (validateAuthHeader as jest.Mock).mockReturnValue({});
        (mockAxiosInstance.put as jest.Mock).mockResolvedValue({ data: {} });

        await updateIncident(
            { ...baseIncident, interface: 'eth0' },
            'Bearer',
            'vault',
            baseCustomerConfig
        );

        expect(buildUpdateIncidentBody).toHaveBeenCalledWith(
            expect.objectContaining({
                short_description: 'SHORT | eth0',
            }),
            {}
        );
    });

    it('does NOT touch short_description when interface missing', async () => {
        (getSysIdAndPriorityForIncident as jest.Mock).mockResolvedValue(baseSysData);
        (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
        (buildUpdateIncidentBody as jest.Mock).mockImplementation(v => v);
        (validateAuthHeader as jest.Mock).mockReturnValue({});
        (mockAxiosInstance.put as jest.Mock).mockResolvedValue({ data: {} });

        await updateIncident(baseIncident, 'Bearer', 'vault', baseCustomerConfig);

        expect(buildUpdateIncidentBody).not.toHaveBeenCalledWith(
            expect.objectContaining({ short_description: expect.any(String) }),
            {}
        );
    });

    /*  AFFECTED CI DESCRIPTION  */
    it('updates description when affected_ci_names changes description', async () => {
        (getSysIdAndPriorityForIncident as jest.Mock).mockResolvedValue(baseSysData);
        (formatIncidentDescription as jest.Mock).mockResolvedValue('NEW_DESC');
        (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
        (buildUpdateIncidentBody as jest.Mock).mockImplementation(v => v);
        (validateAuthHeader as jest.Mock).mockReturnValue({});
        (mockAxiosInstance.put as jest.Mock).mockResolvedValue({ data: {} });

        await updateIncident(
            { ...baseIncident, affected_ci_names: ['CI1'] },
            'Bearer',
            'vault',
            baseCustomerConfig
        );

        expect(formatIncidentDescription).toHaveBeenCalledWith('OLD_DESC', ['CI1']);
        expect(buildUpdateIncidentBody).toHaveBeenCalledWith(
            expect.objectContaining({ description: 'NEW_DESC' }),
            {}
        );
    });

    it('does NOT update description when formatted description is same', async () => {
        (getSysIdAndPriorityForIncident as jest.Mock).mockResolvedValue(baseSysData);
        (formatIncidentDescription as jest.Mock).mockResolvedValue('OLD_DESC');
        (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
        (buildUpdateIncidentBody as jest.Mock).mockImplementation(v => v);
        (validateAuthHeader as jest.Mock).mockReturnValue({});
        (mockAxiosInstance.put as jest.Mock).mockResolvedValue({ data: {} });

        await updateIncident(
            { ...baseIncident, affected_ci_names: ['CI1'] },
            'Bearer',
            'vault',
            baseCustomerConfig
        );

        expect(buildUpdateIncidentBody).not.toHaveBeenCalledWith(
            expect.objectContaining({ description: 'OLD_DESC' }),
            {}
        );
    });

    /*  WORK NOTES */
    it('adds work_notes when present', async () => {
        (getSysIdAndPriorityForIncident as jest.Mock).mockResolvedValue(baseSysData);
        (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
        (buildUpdateIncidentBody as jest.Mock).mockImplementation(v => v);
        (validateAuthHeader as jest.Mock).mockReturnValue({});
        (mockAxiosInstance.put as jest.Mock).mockResolvedValue({ data: {} });

        await updateIncident(
            { ...baseIncident, work_notes: 'NOTE' },
            'Bearer',
            'vault',
            baseCustomerConfig
        );

        expect(buildUpdateIncidentBody).toHaveBeenCalledWith(
            expect.objectContaining({ work_notes: 'NOTE' }),
            {}
        );
    });

    /*  PRIORITY DOWNGRADE LOGIC  */
    it('updates impact & urgency ONLY when new priority is lower', async () => {
        (getSysIdAndPriorityForIncident as jest.Mock).mockResolvedValue({
            ...baseSysData,
            priority: 4,
        });
        (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
        (buildUpdateIncidentBody as jest.Mock).mockImplementation(v => v);
        (validateAuthHeader as jest.Mock).mockReturnValue({});
        (mockAxiosInstance.put as jest.Mock).mockResolvedValue({ data: {} });

        await updateIncident(
            {
                ...baseIncident,
                impact: 1,
                urgency: 1,
                priority: 2,
            },
            'Bearer',
            'vault',
            baseCustomerConfig
        );

        expect(buildUpdateIncidentBody).toHaveBeenCalledWith(
            expect.objectContaining({ impact: 1, urgency: 1 }),
            {}
        );
    });

    it('does NOT update impact/urgency when priority not lower', async () => {
        (getSysIdAndPriorityForIncident as jest.Mock).mockResolvedValue(baseSysData);
        (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
        (buildUpdateIncidentBody as jest.Mock).mockImplementation(v => v);
        (validateAuthHeader as jest.Mock).mockReturnValue({});
        (mockAxiosInstance.put as jest.Mock).mockResolvedValue({ data: {} });

        await updateIncident(
            { ...baseIncident, impact: 1, urgency: 1, priority: 3 },
            'Bearer',
            'vault',
            baseCustomerConfig
        );

        expect(buildUpdateIncidentBody).not.toHaveBeenCalledWith(
            expect.objectContaining({ impact: 1, urgency: 1 }),
            {}
        );
    });

    /*  SCHEDULE CREATION  */
    it('forces transient_time = 1 when first_execution is immediate', async () => {
        (getSysIdAndPriorityForIncident as jest.Mock).mockResolvedValue(baseSysData);
        (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
        (buildUpdateIncidentBody as jest.Mock).mockImplementation(v => v);
        (validateAuthHeader as jest.Mock).mockReturnValue({});
        (mockAxiosInstance.put as jest.Mock).mockResolvedValue({ data: {} });
        (getReassignmentScheduleId as jest.Mock).mockResolvedValue('SCH_IMMEDIATE');
        (createScheduleInObserve as jest.Mock).mockResolvedValue({ _id: 'SCH_IMMEDIATE' });

        const data = {
            ...baseIncident,
            reassignment_action_id: 'RA1',
            first_execution: 'immediate',
            transient_time: 0,
        };

        await updateIncident(data, 'Bearer', 'vault', baseCustomerConfig);

        expect(createScheduleInObserve).toHaveBeenCalledWith(
            expect.objectContaining({
                interval_value: 1,
                schedule_id: 'SCH_IMMEDIATE',
            })
        );
    });

    it('does NOT call createScheduleInObserve when reassignment_action_id missing', async () => {
        (getSysIdAndPriorityForIncident as jest.Mock).mockResolvedValue(baseSysData);
        (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
        (buildUpdateIncidentBody as jest.Mock).mockImplementation(v => v);
        (validateAuthHeader as jest.Mock).mockReturnValue({});
        (mockAxiosInstance.put as jest.Mock).mockResolvedValue({ data: {} });

        await updateIncident(baseIncident, 'Bearer', 'vault', baseCustomerConfig);

        expect(createScheduleInObserve).not.toHaveBeenCalled();
    });

    /* MIDDLEWARE AUTH  */
    it('uses getMiddlewareHeaders when apiType is middleware', async () => {
        const cfg = { ...baseCustomerConfig, apiType: 'middleware' } as CustomerConfig;

        (getSysIdAndPriorityForIncident as jest.Mock).mockResolvedValue(baseSysData);
        (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
        (buildUpdateIncidentBody as jest.Mock).mockImplementation(v => v);
        (getMiddlewareHeaders as jest.Mock).mockResolvedValue({ MW: 'HEADER' });
        (mockAxiosInstance.put as jest.Mock).mockResolvedValue({ data: {} });

        await updateIncident(baseIncident, 'Bearer', 'vault', cfg);

        expect(getMiddlewareHeaders).toHaveBeenCalledWith('vault', 'Bearer');
        expect(validateAuthHeader).not.toHaveBeenCalled();
    });


    it('throws UpdateIncidentError when PUT fails', async () => {
        (getSysIdAndPriorityForIncident as jest.Mock).mockResolvedValue(baseSysData);
        (buildEndpointUrl as jest.Mock).mockReturnValue('ENDPOINT');
        (buildUpdateIncidentBody as jest.Mock).mockImplementation(v => v);
        (validateAuthHeader as jest.Mock).mockReturnValue({});

        (executeWithRetry as jest.Mock).mockRejectedValue(
            new Error('PUT FAIL')
        );

        await expect(
            updateIncident(baseIncident, 'Bearer', 'vault', baseCustomerConfig)
        ).rejects.toBeInstanceOf(UpdateIncidentError);

        expect(sendServicenowFailureAlertToTeams).toHaveBeenCalledWith(
            expect.objectContaining({
                incidentId: 'INC100',
                failureType: 'update',
            })
        );
    });


    /* SYS_ID NOT FOUND  */
    it('fails when sys_id not found', async () => {
        (getSysIdAndPriorityForIncident as jest.Mock).mockResolvedValue(null);

        await expect(
            updateIncident(baseIncident, 'Bearer', 'vault', baseCustomerConfig)
        ).rejects.toThrow('Incident with ID INC100 not found');

        expect(auditLogApi).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'Failure' }),
            'Update ServiceNow Incident INC100'
        );
    });
});
