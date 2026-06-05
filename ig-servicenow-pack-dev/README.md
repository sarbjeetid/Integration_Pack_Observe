# ig-servicenow-pack

## ServiceNow Integration

ServiceNow is a powerful platform for IT service management (ITSM) and automating various business processes.  

## ServiceNow Integration Using API

### Obtain API Credentials: 

We'll need to obtain the necessary API credentials from our ServiceNow instance. This typically includes a username, password, or a combination of these. 

### Authentication: 

ServiceNow uses basic authentication for API authentication. We'll need to include the appropriate authentication headers in your API requests. 

### Make API Requests: 

We will use HTTP methods (GET, POST, PUT, PATCH) to interact with ServiceNow resources. Here are some common tasks you can perform: 

* **Create Incident**: Using a POST request to create a new incident in a ServiceNow table (can link a CI while creating an incident if needed) 
* **Update Incident**: Using a PUT request to update an existing incident. 
* **Resolve Incident**: Using a PUT request to resolve an incident from a table. 
* **Close Incident**: Using a PATCH request to close an incident from a table. 

Not Required right now: 

* **Delete Incident**: Using a DELETE request to delete an incident from a table. 
* **Read Incident**: Using a GET request to retrieve incident from a ServiceNow table.  

## User Stories

   * As an admin, I should be able to create an incident. 
   * As an admin, I should be able to update an incident. 
   * As an admin, I should be able to resolve an incident. 
   * As an admin, I should be able to close an incident. 

## Dependency

## Technical Specifications

### Repository

[ig-servicenow-pack](https://gitlab.com/intelligeni-core/ig-servicenow-pack)


### API List

| **Api**                 | **Description**        |
| --------                | -----------------      |
| Method: Post            |                        |
| /api/incident/create    | To create an incident  |
| Method: Put             |                        |
| /api/incident/update    | To update an incident  |
| Method: Put             |                        |
| /api/incident/close     | To close an incident   |

### Authentication & Authorization 

Basic Auth is used for authorization – **username and password** 

### Schema

No schema for now 

### Application logs 

**Format** 

````
{ 
     "timestamp": "2020-04-12T23:26:32.013Z", 
      "level": "WARN",  
      "message": "More than 1 zone id found for incoming token", 
      "meta":  
      { 
         "source": "azureResourceChanges" 
         "service": "ig-core-api" 
         "path": " server\controllers\alerts.controller.js " 
         "caller": "" 
      }
}   
````   

Please refer to the logs documents for further details 

### Error Messages

**sys_id validation when giving incident_id as input:** 
Error fetching sys_id for incident 

**When ci_id is not validated:** 
Error associating CI with incident 

**Creating Incident:** 
Error creating incident 
 
**Sys_id not found** 
Incident with ID ${incidentId} not found. 

**Updating incident:** 
Error updating incident 

**Resolving Incident:** 
Error resolving incident 

**Closing an Incident** 
Error closing incident 

**Auth validation failed**
Authorization header is missing. 