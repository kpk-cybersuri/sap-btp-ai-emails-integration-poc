// srv/lib/secretLoader.js

const getSecret = (envVarName, vcapServiceName = 'my-secrets') => {
    if (process.env[envVarName]) {
        console.log(`[INFO] ${envVarName} found in process.env.`);
        return process.env[envVarName];
    }

    try {
        const vcap = JSON.parse(process.env.VCAP_SERVICES || '{}');
        const service = (vcap['user-provided'] || []).find(s => s.name === vcapServiceName);
        if (service?.credentials?.[envVarName]) {
            console.log(`[INFO] ${envVarName} loaded from VCAP_SERVICES (service: "${vcapServiceName}").`);
            return service.credentials[envVarName];
        }
    } catch (err) {
        console.error(`[ERROR] Failed to parse VCAP_SERVICES while looking for ${envVarName}:`, err.message);
    }

    console.warn(`[WARN] ${envVarName} not found in environment variables or VCAP_SERVICES.`);
    return null;
};

// Store the fetched secrets here
const loadedSecrets = {};

// Export a function to initialize/load secrets
const loadAllSecrets = () => {
    loadedSecrets.AWS_KEY_ID = getSecret('AWS_ACCESS_KEY_ID');
    loadedSecrets.AWS_SAKEY = getSecret('AWS_SECRET_ACCESS_KEY');
    loadedSecrets.AWS_KEY_ID2 = getSecret('AWS_ACCESS_KEY_ID_2');
    loadedSecrets.AWS_SAKEY2 = getSecret('AWS_SECRET_ACCESS_KEY_2');
    loadedSecrets.AWS_FROM_R = getSecret('SES_FROMR');
    loadedSecrets.AWS_FROM_FF = getSecret('SES_FROMFF');
    loadedSecrets.AWS_FROM_F1 = getSecret('SES_FROMF1');
    loadedSecrets.MAILEROO_FROM = getSecret('MAILEROO_FROM_DOMAINMAIL');
    loadedSecrets.MAILEROO_KEY = getSecret('MAILEROO_KEY');
    loadedSecrets.HF_API_TOKEN = getSecret('HF_API_TOKEN');
    // loadedSecrets.TEST_SECRET = getSecret('ATEST_SECRET1');
    loadedSecrets.OAPI_DATA_URL = getSecret('OAPI_DATA_URL');     
    loadedSecrets.OAPI_OAUTH_URL = getSecret('OAPI_OAUTH_URL');
    loadedSecrets.OAPI_CLIENT_ID = getSecret('OAPI_CLIENT_ID');
    loadedSecrets.OAPI_CLIENT_SECRET = getSecret('OAPI_CLIENT_SECRET');
    loadedSecrets.OUTLOOK_APPPW = getSecret('OUTLOOK_APPPW');
    loadedSecrets.GOOGLE_APPPW = getSecret('GOOGLE_APPPW');        

    // You can add more logging here if needed
    console.log('[INFO] All configured secrets attempted to be loaded.');
};

// Export the loadedSecrets object for consumption
module.exports = {
    loadAllSecrets,
    secrets: loadedSecrets // Provide access to the loaded secrets
};

/** 
 * Secret TODOs: Done
 * OAPI_OAUTH_URL,
 * OAPI_CLIENT_ID,
 * OAPI_CLIENT_SECRET,
 * OAPI_DATA_URL
 * 
*/