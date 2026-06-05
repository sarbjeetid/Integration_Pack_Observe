import * as crypto from 'crypto';

const generateAuthHeader = (accessId: string | undefined, accessKey: any, accountName: string | undefined, httpVerb: any, resourcePath: string, data: any) => {
    
    // Get the current time in milliseconds
    const epochTimeInMilliseconds = Date.now();

    // Concatenate Request details
    const requestVars = `${httpVerb}${epochTimeInMilliseconds}${data}${resourcePath}`;

    // Construct signature
    const hmac = crypto.createHmac('sha256', accessKey);
    hmac.update(requestVars);

    const hmac1 = hmac.digest('hex');

    // Encode to Base64
    const signature = Buffer.from(hmac1).toString('base64');

    // Construct headers
    const auth = `LMv1 ${accessId}:${signature}:${epochTimeInMilliseconds}`;

    // return the header
    return {
        'Content-Type': 'application/json',
        'Authorization': auth
    };
}

export { generateAuthHeader };