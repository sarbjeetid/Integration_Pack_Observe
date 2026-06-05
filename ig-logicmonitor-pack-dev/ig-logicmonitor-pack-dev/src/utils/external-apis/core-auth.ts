import axios from 'axios';
import qs from 'qs';
import config from '../../config';

const axiosInstance = axios.create({
    baseURL: config.externalApiUrl,
    paramsSerializer: (params) => {
        return qs.stringify(params, { arrayFormat: 'repeat' });
    }
});

const attachApiKey = async () => {
    const API_KEY = config.apiKey;
    axiosInstance.interceptors.request.use((reqConfig) => {
        reqConfig.baseURL = config.externalApiUrl;
        // Ensure headers is defined before assigning values
        if (!reqConfig.headers) {
            reqConfig.headers = {};
        }
        reqConfig.headers['x-api-key'] = API_KEY;
        reqConfig.headers['Content-Type'] = 'application/json';
        return reqConfig;
    });
};

attachApiKey();

export { axiosInstance };
