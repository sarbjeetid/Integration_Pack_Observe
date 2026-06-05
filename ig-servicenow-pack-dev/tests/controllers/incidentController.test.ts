import { createIncidentController, updateIncidentController, resolveIncidentController, closeIncidentController, fetchIncidentDataController, reassignIncidentController  } from "../../src/controllers/incidentController";

import * as incidentService from "../../src/services/incident";
import * as authService from "../../src/services/authentication/authService";
import * as incidentUtils from "../../src/services/incident/incidentUtils";
import * as errorHandler from "../../src/utils/errorHandling";

jest.mock("../../src/services/incident");
jest.mock("../../src/services/authentication/authService");
jest.mock("../../src/services/incident/incidentUtils");
jest.mock("../../src/utils/errorHandling");

const mockCustomerConfig = {
  customer: "test_customer",
};

const mockAuthHeader = {
  Authorization: "Bearer test-token",
};

const validBody = {
  tenant_id: "tenant-123",
  vault_path: "/vault/path",
  base_url: "https://sn.instance",
};

const mockRes = () => {
  const res: any = {};
  res.json = jest.fn();
  return res;
};

describe("createIncidentController", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (incidentUtils.fetchCustomerConfig as jest.Mock)
      .mockResolvedValue(mockCustomerConfig);

    (authService.getAuthHeader as jest.Mock)
      .mockResolvedValue(mockAuthHeader);
  });

  /*SUCCESS*/
  it("should create incident successfully ", async () => {
    const serviceResponse = { sys_id: "INC001" };

    (incidentService.createIncident as jest.Mock)
      .mockResolvedValue(serviceResponse);

    const req: any = { body: validBody };
    const res = mockRes();

    await createIncidentController(req, res);

    expect(incidentUtils.fetchCustomerConfig)
      .toHaveBeenCalledWith(validBody.tenant_id);

    expect(authService.getAuthHeader)
      .toHaveBeenCalledWith(
        expect.any(String), 
        validBody.vault_path,
        validBody.base_url,
        mockCustomerConfig
      );

    expect(incidentService.createIncident)
      .toHaveBeenCalledWith(
        validBody,
        mockAuthHeader,
        expect.any(String), 
        validBody.vault_path,
        mockCustomerConfig
      );

    expect(res.json).toHaveBeenCalledWith(serviceResponse);
  });

  /*VALIDATION*/
  it("should not call downstream services when tenant_id is missing", async () => {
    const req: any = { body: {} };
    const res = mockRes();

    await createIncidentController(req, res);

    expect(incidentUtils.fetchCustomerConfig).not.toHaveBeenCalled();
    expect(authService.getAuthHeader).not.toHaveBeenCalled();
    expect(incidentService.createIncident).not.toHaveBeenCalled();

    expect(errorHandler.handleControllerError)
      .toHaveBeenCalledWith(
        expect.any(Error),
        res,
        "Create Incident"
      );
  });

  /* CUSTOMER CONFIG */
  it("should not call auth or service when customer config is not found", async () => {
    (incidentUtils.fetchCustomerConfig as jest.Mock)
      .mockResolvedValue(null);

    const req: any = { body: validBody };
    const res = mockRes();

    await createIncidentController(req, res);

    expect(incidentUtils.fetchCustomerConfig)
      .toHaveBeenCalledWith(validBody.tenant_id);

    expect(authService.getAuthHeader).not.toHaveBeenCalled();
    expect(incidentService.createIncident).not.toHaveBeenCalled();

    expect(errorHandler.handleControllerError)
      .toHaveBeenCalledWith(
        expect.any(Error),
        res,
        "Create Incident"
      );
  });

  /* AUTH FAILURE */
  it("should not call createIncident when getAuthHeader fails", async () => {
    (authService.getAuthHeader as jest.Mock)
      .mockRejectedValue(new Error("Auth failure"));

    const req: any = { body: validBody };
    const res = mockRes();

    await createIncidentController(req, res);

    expect(authService.getAuthHeader)
      .toHaveBeenCalledWith(
        expect.any(String),
        validBody.vault_path,
        validBody.base_url,
        mockCustomerConfig
      );

    expect(incidentService.createIncident).not.toHaveBeenCalled();

    expect(errorHandler.handleControllerError)
      .toHaveBeenCalledWith(
        expect.any(Error),
        res,
        "Create Incident"
      );
  });

  /* SERVICE FAILURE*/
  it("should call error handler when createIncident throws error", async () => {
    (incidentService.createIncident as jest.Mock)
      .mockRejectedValue(new Error("ServiceNow error"));

    const req: any = { body: validBody };
    const res = mockRes();

    await createIncidentController(req, res);

    expect(incidentService.createIncident)
      .toHaveBeenCalledWith(
        validBody,
        mockAuthHeader,
        expect.any(String),
        validBody.vault_path,
        mockCustomerConfig
      );

    expect(errorHandler.handleControllerError)
      .toHaveBeenCalledWith(
        expect.any(Error),
        res,
        "Create Incident"
      );
  });
});

describe("updateIncidentController", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (incidentUtils.fetchCustomerConfig as jest.Mock)
      .mockResolvedValue(mockCustomerConfig);

    (authService.getAuthHeader as jest.Mock)
      .mockResolvedValue(mockAuthHeader);
  });

  /* SUCCESS  */

  it("should update incident successfully with correct arguments", async () => {
    const serviceResponse = { updated: true };

    (incidentService.updateIncident as jest.Mock)
      .mockResolvedValue(serviceResponse);

    const req: any = { body: validBody };
    const res = mockRes();

    await updateIncidentController(req, res);

    expect(incidentUtils.fetchCustomerConfig)
      .toHaveBeenCalledWith(validBody.tenant_id);

    expect(authService.getAuthHeader)
      .toHaveBeenCalledWith(
        expect.any(String), 
        validBody.vault_path,
        validBody.base_url,
        mockCustomerConfig
      );

    expect(incidentService.updateIncident)
      .toHaveBeenCalledWith(
        validBody,
        mockAuthHeader,
        validBody.vault_path,
        mockCustomerConfig
      );

    expect(res.json).toHaveBeenCalledWith(serviceResponse);
  });

  /*VALIDATION */

  it("should not call downstream services when tenant_id is missing", async () => {
    const req: any = { body: {} };
    const res = mockRes();

    await updateIncidentController(req, res);

    expect(incidentUtils.fetchCustomerConfig).not.toHaveBeenCalled();
    expect(authService.getAuthHeader).not.toHaveBeenCalled();
    expect(incidentService.updateIncident).not.toHaveBeenCalled();

    expect(errorHandler.handleControllerError)
      .toHaveBeenCalledWith(
        expect.any(Error),
        res,
        "Update Incident"
      );
  });

  /* CUSTOMER CONFIG  */

  it("should not call auth or service when customer config is not found", async () => {
    (incidentUtils.fetchCustomerConfig as jest.Mock)
      .mockResolvedValue(null);

    const req: any = { body: validBody };
    const res = mockRes();

    await updateIncidentController(req, res);

    expect(incidentUtils.fetchCustomerConfig)
      .toHaveBeenCalledWith(validBody.tenant_id);

    expect(authService.getAuthHeader).not.toHaveBeenCalled();
    expect(incidentService.updateIncident).not.toHaveBeenCalled();

    expect(errorHandler.handleControllerError)
      .toHaveBeenCalledWith(
        expect.any(Error),
        res,
        "Update Incident"
      );
  });

  /* AUTH FAILURE  */

  it("should not call updateIncident when getAuthHeader fails", async () => {
    (authService.getAuthHeader as jest.Mock)
      .mockRejectedValue(new Error("Auth failure"));

    const req: any = { body: validBody };
    const res = mockRes();

    await updateIncidentController(req, res);

    expect(authService.getAuthHeader)
      .toHaveBeenCalledWith(
        expect.any(String),
        validBody.vault_path,
        validBody.base_url,
        mockCustomerConfig
      );

    expect(incidentService.updateIncident).not.toHaveBeenCalled();

    expect(errorHandler.handleControllerError)
      .toHaveBeenCalledWith(
        expect.any(Error),
        res,
        "Update Incident"
      );
  });

  /*  SERVICE FAILURE  */

  it("should call error handler when updateIncident throws error", async () => {
    (incidentService.updateIncident as jest.Mock)
      .mockRejectedValue(new Error("ServiceNow error"));

    const req: any = { body: validBody };
    const res = mockRes();

    await updateIncidentController(req, res);

    expect(incidentService.updateIncident)
      .toHaveBeenCalledWith(
        validBody,
        mockAuthHeader,
        validBody.vault_path,
        mockCustomerConfig
      );

    expect(errorHandler.handleControllerError)
      .toHaveBeenCalledWith(
        expect.any(Error),
        res,
        "Update Incident"
      );
  });
});

describe("resolveIncidentController", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (incidentUtils.fetchCustomerConfig as jest.Mock)
      .mockResolvedValue(mockCustomerConfig);

    (authService.getAuthHeader as jest.Mock)
      .mockResolvedValue(mockAuthHeader);
  });

  /* SUCCESS  */

  it("should resolve incident successfully with correct arguments", async () => {
    const serviceResponse = { state: "resolved" };

    (incidentService.resolveIncident as jest.Mock)
      .mockResolvedValue(serviceResponse);

    const req: any = { body: validBody };
    const res = mockRes();

    await resolveIncidentController(req, res);

    expect(incidentUtils.fetchCustomerConfig)
      .toHaveBeenCalledWith(validBody.tenant_id);

    expect(authService.getAuthHeader)
      .toHaveBeenCalledWith(
        expect.any(String), 
        validBody.vault_path,
        validBody.base_url,
        mockCustomerConfig
      );

    expect(incidentService.resolveIncident)
      .toHaveBeenCalledWith(
        validBody,
        mockAuthHeader,
        expect.any(String), 
        validBody.vault_path,
        mockCustomerConfig
      );

    expect(res.json).toHaveBeenCalledWith(serviceResponse);
  });

  /*  VALIDATION */

  it("should not call downstream services when tenant_id is missing", async () => {
    const req: any = { body: {} };
    const res = mockRes();

    await resolveIncidentController(req, res);

    expect(incidentUtils.fetchCustomerConfig).not.toHaveBeenCalled();
    expect(authService.getAuthHeader).not.toHaveBeenCalled();
    expect(incidentService.resolveIncident).not.toHaveBeenCalled();

    expect(errorHandler.handleControllerError)
      .toHaveBeenCalledWith(
        expect.any(Error),
        res,
        "Resolve Incident"
      );
  });

  /*  CUSTOMER CONFIG */

  it("should not call auth or service when customer config is not found", async () => {
    (incidentUtils.fetchCustomerConfig as jest.Mock)
      .mockResolvedValue(null);

    const req: any = { body: validBody };
    const res = mockRes();

    await resolveIncidentController(req, res);

    expect(incidentUtils.fetchCustomerConfig)
      .toHaveBeenCalledWith(validBody.tenant_id);

    expect(authService.getAuthHeader).not.toHaveBeenCalled();
    expect(incidentService.resolveIncident).not.toHaveBeenCalled();

    expect(errorHandler.handleControllerError)
      .toHaveBeenCalledWith(
        expect.any(Error),
        res,
        "Resolve Incident"
      );
  });

  /*AUTH FAILURE */

  it("should not call resolveIncident when getAuthHeader fails", async () => {
    (authService.getAuthHeader as jest.Mock)
      .mockRejectedValue(new Error("Auth failure"));

    const req: any = { body: validBody };
    const res = mockRes();

    await resolveIncidentController(req, res);

    expect(authService.getAuthHeader)
      .toHaveBeenCalledWith(
        expect.any(String),
        validBody.vault_path,
        validBody.base_url,
        mockCustomerConfig
      );

    expect(incidentService.resolveIncident).not.toHaveBeenCalled();

    expect(errorHandler.handleControllerError)
      .toHaveBeenCalledWith(
        expect.any(Error),
        res,
        "Resolve Incident"
      );
  });

  /*  SERVICE FAILURE */

  it("should call error handler when resolveIncident throws error", async () => {
    (incidentService.resolveIncident as jest.Mock)
      .mockRejectedValue(new Error("ServiceNow error"));

    const req: any = { body: validBody };
    const res = mockRes();

    await resolveIncidentController(req, res);

    expect(incidentService.resolveIncident)
      .toHaveBeenCalledWith(
        validBody,
        mockAuthHeader,
        expect.any(String),
        validBody.vault_path,
        mockCustomerConfig
      );

    expect(errorHandler.handleControllerError)
      .toHaveBeenCalledWith(
        expect.any(Error),
        res,
        "Resolve Incident"
      );
  });
});

describe("closeIncidentController", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (incidentUtils.fetchCustomerConfig as jest.Mock)
      .mockResolvedValue(mockCustomerConfig);

    (authService.getAuthHeader as jest.Mock)
      .mockResolvedValue(mockAuthHeader);
  });

  /*  SUCCESS  */

  it("should close incident successfully with correct arguments", async () => {
    const serviceResponse = { state: "closed" };

    (incidentService.closeIncident as jest.Mock)
      .mockResolvedValue(serviceResponse);

    const req: any = { body: validBody };
    const res = mockRes();

    await closeIncidentController(req, res);

    expect(incidentUtils.fetchCustomerConfig)
      .toHaveBeenCalledWith(validBody.tenant_id);

    expect(authService.getAuthHeader)
      .toHaveBeenCalledWith(
        expect.any(String), 
        validBody.vault_path,
        validBody.base_url,
        mockCustomerConfig
      );

    expect(incidentService.closeIncident)
      .toHaveBeenCalledWith(
        validBody,
        mockAuthHeader,
        validBody.vault_path,
        mockCustomerConfig
      );

    expect(res.json).toHaveBeenCalledWith(serviceResponse);
  });

  /*VALIDATION*/

  it("should not call downstream services when tenant_id is missing", async () => {
    const req: any = { body: {} };
    const res = mockRes();

    await closeIncidentController(req, res);

    expect(incidentUtils.fetchCustomerConfig).not.toHaveBeenCalled();
    expect(authService.getAuthHeader).not.toHaveBeenCalled();
    expect(incidentService.closeIncident).not.toHaveBeenCalled();

    expect(errorHandler.handleControllerError)
      .toHaveBeenCalledWith(
        expect.any(Error),
        res,
        "Close Incident"
      );
  });

  /*CUSTOMER CONFIG */

  it("should not call auth or service when customer config is not found", async () => {
    (incidentUtils.fetchCustomerConfig as jest.Mock)
      .mockResolvedValue(null);

    const req: any = { body: validBody };
    const res = mockRes();

    await closeIncidentController(req, res);

    expect(incidentUtils.fetchCustomerConfig)
      .toHaveBeenCalledWith(validBody.tenant_id);

    expect(authService.getAuthHeader).not.toHaveBeenCalled();
    expect(incidentService.closeIncident).not.toHaveBeenCalled();

    expect(errorHandler.handleControllerError)
      .toHaveBeenCalledWith(
        expect.any(Error),
        res,
        "Close Incident"
      );
  });

  /* AUTH FAILURE */

  it("should not call closeIncident when getAuthHeader fails", async () => {
    (authService.getAuthHeader as jest.Mock)
      .mockRejectedValue(new Error("Auth failure"));

    const req: any = { body: validBody };
    const res = mockRes();

    await closeIncidentController(req, res);

    expect(authService.getAuthHeader)
      .toHaveBeenCalledWith(
        expect.any(String),
        validBody.vault_path,
        validBody.base_url,
        mockCustomerConfig
      );

    expect(incidentService.closeIncident).not.toHaveBeenCalled();

    expect(errorHandler.handleControllerError)
      .toHaveBeenCalledWith(
        expect.any(Error),
        res,
        "Close Incident"
      );
  });

  /*SERVICE FAILURE  */

  it("should call error handler when closeIncident throws error", async () => {
    (incidentService.closeIncident as jest.Mock)
      .mockRejectedValue(new Error("ServiceNow error"));

    const req: any = { body: validBody };
    const res = mockRes();

    await closeIncidentController(req, res);

    expect(incidentService.closeIncident)
      .toHaveBeenCalledWith(
        validBody,
        mockAuthHeader,
        validBody.vault_path,
        mockCustomerConfig
      );

    expect(errorHandler.handleControllerError)
      .toHaveBeenCalledWith(
        expect.any(Error),
        res,
        "Close Incident"
      );
  });
});

describe("fetchIncidentDataController", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (incidentUtils.fetchCustomerConfig as jest.Mock)
      .mockResolvedValue(mockCustomerConfig);

    (authService.getAuthHeader as jest.Mock)
      .mockResolvedValue(mockAuthHeader);
  });

  /*  SUCCESS  */

  it("should fetch incident data successfully with correct arguments", async () => {
    const serviceResponse = { number: "INC001" };

    (incidentService.fetchIncidentData as jest.Mock)
      .mockResolvedValue(serviceResponse);

    const req: any = { body: validBody };
    const res = mockRes();

    await fetchIncidentDataController(req, res);

    expect(incidentUtils.fetchCustomerConfig)
      .toHaveBeenCalledWith(validBody.tenant_id);

    expect(authService.getAuthHeader)
      .toHaveBeenCalledWith(
        expect.any(String), 
        validBody.vault_path,
        validBody.base_url,
        mockCustomerConfig
      );

    expect(incidentService.fetchIncidentData)
      .toHaveBeenCalledWith(
        validBody,
        mockAuthHeader,
        validBody.vault_path,
        mockCustomerConfig
      );

    expect(res.json).toHaveBeenCalledWith(serviceResponse);
  });

  /* VALIDATION */

  it("should not call downstream services when tenant_id is missing", async () => {
    const req: any = { body: {} };
    const res = mockRes();

    await fetchIncidentDataController(req, res);

    expect(incidentUtils.fetchCustomerConfig).not.toHaveBeenCalled();
    expect(authService.getAuthHeader).not.toHaveBeenCalled();
    expect(incidentService.fetchIncidentData).not.toHaveBeenCalled();

    expect(errorHandler.handleControllerError)
      .toHaveBeenCalledWith(
        expect.any(Error),
        res,
        "Fetch Incident"
      );
  });

  /*  CUSTOMER CONFIG */

  it("should not call auth or service when customer config is not found", async () => {
    (incidentUtils.fetchCustomerConfig as jest.Mock)
      .mockResolvedValue(null);

    const req: any = { body: validBody };
    const res = mockRes();

    await fetchIncidentDataController(req, res);

    expect(incidentUtils.fetchCustomerConfig)
      .toHaveBeenCalledWith(validBody.tenant_id);

    expect(authService.getAuthHeader).not.toHaveBeenCalled();
    expect(incidentService.fetchIncidentData).not.toHaveBeenCalled();

    expect(errorHandler.handleControllerError)
      .toHaveBeenCalledWith(
        expect.any(Error),
        res,
        "Fetch Incident"
      );
  });

  /*AUTH FAILURE  */

  it("should not call fetchIncidentData when getAuthHeader fails", async () => {
    (authService.getAuthHeader as jest.Mock)
      .mockRejectedValue(new Error("Auth failure"));

    const req: any = { body: validBody };
    const res = mockRes();

    await fetchIncidentDataController(req, res);

    expect(authService.getAuthHeader)
      .toHaveBeenCalledWith(
        expect.any(String),
        validBody.vault_path,
        validBody.base_url,
        mockCustomerConfig
      );

    expect(incidentService.fetchIncidentData).not.toHaveBeenCalled();

    expect(errorHandler.handleControllerError)
      .toHaveBeenCalledWith(
        expect.any(Error),
        res,
        "Fetch Incident"
      );
  });

  /*SERVICE FAILURE */

  it("should call error handler when fetchIncidentData throws error", async () => {
    (incidentService.fetchIncidentData as jest.Mock)
      .mockRejectedValue(new Error("ServiceNow error"));

    const req: any = { body: validBody };
    const res = mockRes();

    await fetchIncidentDataController(req, res);

    expect(incidentService.fetchIncidentData)
      .toHaveBeenCalledWith(
        validBody,
        mockAuthHeader,
        validBody.vault_path,
        mockCustomerConfig
      );

    expect(errorHandler.handleControllerError)
      .toHaveBeenCalledWith(
        expect.any(Error),
        res,
        "Fetch Incident"
      );
  });
});

describe("reassignIncidentController", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (incidentUtils.fetchCustomerConfig as jest.Mock)
      .mockResolvedValue(mockCustomerConfig);

    (authService.getAuthHeader as jest.Mock)
      .mockResolvedValue(mockAuthHeader);
  });

  /*  SUCCESS */

  it("should reassign incident successfully when service returns response", async () => {
    const serviceResponse = { assigned_to: "user1" };

    (incidentService.reassignIncident as jest.Mock)
      .mockResolvedValue(serviceResponse);

    const req: any = { body: validBody };
    const res = mockRes();

    await reassignIncidentController(req, res);

    expect(incidentUtils.fetchCustomerConfig)
      .toHaveBeenCalledWith(validBody.tenant_id);

    expect(authService.getAuthHeader)
      .toHaveBeenCalledWith(
        expect.any(String), 
        validBody.vault_path,
        validBody.base_url,
        mockCustomerConfig
      );

    expect(incidentService.reassignIncident)
      .toHaveBeenCalledWith(
        validBody,
        mockAuthHeader,
        validBody.vault_path,
        mockCustomerConfig
      );

    expect(res.json).toHaveBeenCalledWith(serviceResponse);
  });

  /*NULL RESPONSE  */

  it("should return error response when reassignIncident returns null", async () => {
    (incidentService.reassignIncident as jest.Mock)
      .mockResolvedValue(null);

    const req: any = { body: validBody };
    const res = mockRes();

    await reassignIncidentController(req, res);

    expect(incidentService.reassignIncident)
      .toHaveBeenCalledWith(
        validBody,
        mockAuthHeader,
        validBody.vault_path,
        mockCustomerConfig
      );

    expect(res.json).toHaveBeenCalledWith({
      error: "could not reassign ticket",
    });
  });

  /*VALIDATION  */

  it("should not call downstream services when tenant_id is missing", async () => {
    const req: any = { body: {} };
    const res = mockRes();

    await reassignIncidentController(req, res);

    expect(incidentUtils.fetchCustomerConfig).not.toHaveBeenCalled();
    expect(authService.getAuthHeader).not.toHaveBeenCalled();
    expect(incidentService.reassignIncident).not.toHaveBeenCalled();

    expect(errorHandler.handleControllerError)
      .toHaveBeenCalledWith(
        expect.any(Error),
        res,
        "Reassign Incident"
      );
  });

  /*CUSTOMER CONFIG */

  it("should not call auth or service when customer config is not found", async () => {
    (incidentUtils.fetchCustomerConfig as jest.Mock)
      .mockResolvedValue(null);

    const req: any = { body: validBody };
    const res = mockRes();

    await reassignIncidentController(req, res);

    expect(incidentUtils.fetchCustomerConfig)
      .toHaveBeenCalledWith(validBody.tenant_id);

    expect(authService.getAuthHeader).not.toHaveBeenCalled();
    expect(incidentService.reassignIncident).not.toHaveBeenCalled();

    expect(errorHandler.handleControllerError)
      .toHaveBeenCalledWith(
        expect.any(Error),
        res,
        "Reassign Incident"
      );
  });

  /*  AUTH FAILURE  */

  it("should not call reassignIncident when getAuthHeader fails", async () => {
    (authService.getAuthHeader as jest.Mock)
      .mockRejectedValue(new Error("Auth failure"));

    const req: any = { body: validBody };
    const res = mockRes();

    await reassignIncidentController(req, res);

    expect(authService.getAuthHeader)
      .toHaveBeenCalledWith(
        expect.any(String),
        validBody.vault_path,
        validBody.base_url,
        mockCustomerConfig
      );

    expect(incidentService.reassignIncident).not.toHaveBeenCalled();

    expect(errorHandler.handleControllerError)
      .toHaveBeenCalledWith(
        expect.any(Error),
        res,
        "Reassign Incident"
      );
  });

  /* SERVICE FAILURE */

  it("should call error handler when reassignIncident throws error", async () => {
    (incidentService.reassignIncident as jest.Mock)
      .mockRejectedValue(new Error("ServiceNow error"));

    const req: any = { body: validBody };
    const res = mockRes();

    await reassignIncidentController(req, res);

    expect(incidentService.reassignIncident)
      .toHaveBeenCalledWith(
        validBody,
        mockAuthHeader,
        validBody.vault_path,
        mockCustomerConfig
      );

    expect(errorHandler.handleControllerError)
      .toHaveBeenCalledWith(
        expect.any(Error),
        res,
        "Reassign Incident"
      );
  });
});