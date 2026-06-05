import axios from 'axios';
import config from '../../config';
import logger from '../LoggerInstance';

const BASE_URI = config.edge_vault_uri || '';
const ERROR_MSG = {
  unauthorized: 'Unauthorized: status code 403'
};
const VAULT_ERRORS = {
  403: 'Error: Request failed with status code 403'
};

export class EdgeSecrets extends Object {
  _secrets: any;

  constructor() {
    super();
    this._secrets = {};
    this._read_edge_vault_data_at_path = this._read_edge_vault_data_at_path.bind(this);
    this._fetch_secrets_from_edge_vault = this._fetch_secrets_from_edge_vault.bind(this);
  }

  async _read_edge_vault_data_at_path(requestBody: any) {
    try {
      var response = await axios.post(
        BASE_URI.concat('/vault/read'),
        requestBody,
      );
    } catch (e: any) {
      if (e.toString().indexOf(VAULT_ERRORS[403]) !== -1) {
        throw new Error(ERROR_MSG.unauthorized);
      } else {
        throw e;
      }
    }

    if (response.status !== 200) {
      return;
    }
    return response;
  }

  async _fetch_secrets_from_edge_vault(secrets_path: string) {
    const requestBody = { 
      vault_obj: { 
        path: secrets_path 
      } 
    };
    const response: any = await this._read_edge_vault_data_at_path(requestBody);
    this._secrets = response.data.data.data;
  }

  async fetch_secrets_from_edge_vault(secrets_path: string) {
    try{
      const requestBody = { 
        vault_obj: { 
          path: secrets_path 
        } 
      };
      const response: any = await this._read_edge_vault_data_at_path(requestBody);
      return response.data.message;
    } catch (error){
      logger.error('No secrets in edge vault');
      return null;
    }
  }
}

export default EdgeSecrets;
