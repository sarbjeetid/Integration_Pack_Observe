import axios from 'axios';
import https from 'https';
import config from '../config';

// Create an HTTPS agent with keepAlive enabled
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 10, // Adjust as needed
  timeout: 30000, // socket-level timeout in milliseconds
});

const axiosInstance = axios.create({
  baseURL: config.baseURL,
  httpsAgent,
  timeout: 15000, // Request timeout
  headers: {
    'Content-Type': 'application/json',
  }
});

// simple retry on TLS/network-related errors
axiosInstance.interceptors.response.use(undefined, error => {
  const isRecoverable =
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT' ||
    error.message?.includes('TLS') ||
    error.message?.includes('socket');

  if (isRecoverable) {
    console.warn(`Retrying due to recoverable network error: ${error.message}`);
    return axiosInstance.request(error.config);
  }

  return Promise.reject(error);
});

export default axiosInstance;
