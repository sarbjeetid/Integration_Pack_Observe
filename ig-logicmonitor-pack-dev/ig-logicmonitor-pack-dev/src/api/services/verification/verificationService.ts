import { Container } from "typedi";
import winston from "winston";
import path from "path";
import * as https from 'https';
import { generateAuthHeader } from '../../../utils/generateAuthHeader';
import { auditLog } from '../../../utils/external-apis/core-apis';

const verificationService = async (accessId: any, accessKey: any, accountName: any) => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    try {

        const useMockData = process.env.USE_MOCK_DATA === 'true';

        // Check if environment is set to use mock data
        if (useMockData) {
            try {
                return await verifyWithGoogle();
            } catch (error) {
                loggerInstance.error(`Error while attempting to ping google.com: ${error}`);
                return { verified: false };
            }
        }
        else {
            try {
                // Use actual credentials
                let verified = false;
                // Request Info
                const httpVerb = 'GET';
                const resourcePath = '/device/devices';
                const data = '';

                // Construct URL
                const url = `https://${accountName}.logicmonitor.com/santaba/rest${resourcePath}`;

                const headers = generateAuthHeader(accessId, accessKey, accountName, httpVerb, resourcePath, data);

                // Make request
                const options = {
                    method: 'GET',
                    headers: headers
                };

                // Make request
                let response: any = await new Promise((resolve, reject) => {
                    const req = https.request(url, options, (res) => {
                        let responseData = '';
                        res.on('data', (chunk) => {
                            responseData += chunk;
                        });
                        res.on('end', () => {
                            resolve({ statusCode: res.statusCode, responseData });
                        });
                    });
                    req.on('error', (error) => {
                        reject(error);
                    });
                    req.end();
                });

                // Check response status code
                if (response.statusCode === 200) {
                    verified = true;
                    const auditLogData = {
                        timestamp: new Date().toISOString(),
                        status: 'Success',
                        details: {
                            URL : url,
                            account_name: accountName,
                        }
                    };
                    auditLog(auditLogData, "Verification of Logicmonitor APIs ");
                    return { verified };
                } else if (response.statusCode === 403) {
                    return { verified: false, error: `Error: ${response.statusCode} Authentication succeeded; permission denied.` };
                } else {
                    return { verified: false, error: `Error: ${response.statusCode} Authentication failed.` };
                }
            } catch (error) {
                loggerInstance.error(`Error during API verification: ${error}`);
                const auditLogData = {
                    timestamp: new Date().toISOString(),
                    status: 'Failure',
                    details: {
                        message: `Error during API verification`,
                    }
                };
                auditLog(auditLogData, "Verification of Logicmonitor APIs ");
                return { verified: false, error: 'Error during API verification' };
            }

        }

    } catch (error) {
        loggerInstance.error(`[services::verification::logicmonitor::VerificationService.ts::verificationService]: ${JSON.stringify(error)}`, { path: path.relative(process.cwd(), __filename) });
        return {
            error: 'Error in verification - Not able to authenticate',
            data: error
        };
    }
};

async function verifyWithGoogle(): Promise<{ verified: boolean }> {
    return new Promise<{ verified: boolean }>((resolve, reject) => {
        https.get('https://www.google.com/', (res) => {
            resolve({ verified: res.statusCode === 200 });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

export { verificationService };
