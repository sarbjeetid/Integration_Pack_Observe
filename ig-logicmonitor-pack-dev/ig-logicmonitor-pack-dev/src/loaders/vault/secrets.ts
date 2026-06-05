import axios from 'axios';
import config from '../../config';
import login from './login';
import logger from '../LoggerInstance';
import path from "path";

const BASE_URI = config.vault_uri || '';
const ERROR_MSG = {
  unauthorized: 'Unauthorized: status code 403'
};
const VAULT_ERRORS = {
  403: 'Error: Request failed with status code 403'
};

const sleep = (interval: number | string) => {
  return new Promise((resolve) => {
    setTimeout(
      (r) => {
        r(null);
      },
      parseInt(interval.toString()),
      resolve
    );
  });
};

export class Secrets extends Object {
  _token: string | null;
  _secrets: any;
  _update_secrets_interval: number;
  _retries: number;

  constructor() {
    super();

    this._token = null;
    this._secrets = {};
    this._update_secrets_interval =
      parseInt(config.secrets_update_interval) * 60 * 1000;
    this._retries = 5;

    this._get_token_from_vault = this._get_token_from_vault.bind(this);
    this._fetch_secrets_from_vault = this._fetch_secrets_from_vault.bind(this);
    this._update_config = this._update_config.bind(this);
    this.get_all_secrets = this.get_all_secrets.bind(this);
    this.get_secret = this.get_secret.bind(this);
    this._read_vault_data_at_path = this._read_vault_data_at_path.bind(this);
    this.update_secrets_to_vault = this.update_secrets_to_vault.bind(this);

    this._get_token_from_vault();
    setTimeout((update_config) => update_config(), 10000, this._update_config);
  }

  async _get_token_from_vault() {
    let login_data = await login(config.vault_role_id, config.vault_secret_id);

    this._token = login_data.auth.client_token;
  }

  async _read_vault_data_at_path(secrets_path: string, sub_path: string) {
    if (!this._token) {
      throw new Error('Vault token not found !');
    }

    let options = {
      headers: {
        'X-Vault-Token': this._token
      }
    };

    try {
      var response = await axios.get(
        BASE_URI.concat(`/v1/${secrets_path}/data/${sub_path}`),
        options
      );
    } catch (e: any) {
      if (
        e.toString().indexOf('Error: Request failed with status code 403') !==
        -1
      ) {
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

  async _fetch_secrets_from_vault(secrets_path: string, sub_path: string) {
    const response: any = await this._read_vault_data_at_path(
      secrets_path,
      sub_path
    );

    this._secrets = response.data.data.data;
  }

  async fetch_secrets_from_vault(secrets_path: string, sub_path: string) {
    const response: any = await this._read_vault_data_at_path(
      secrets_path,
      sub_path
    );

    return response.data.data.data;
  }

  async _get_latest_version_from_vault(secrets_path: string, sub_path: string) {
    const response: any = await this._read_vault_data_at_path(
      secrets_path,
      sub_path
    );

    return response.data.data.metadata.version;
  }

  async update_secrets_to_vault(
    secrets_path: string,
    sub_path: string,
    data_: any,
    cas = null,
    retry = true
  ) {
    if (!this._token) {
      throw new Error('Vault token not found !');
    }

    if (!cas) {
      cas = await this._get_latest_version_from_vault(secrets_path, sub_path);
    }
    if (!cas) {
      throw new Error(
        'Latest Version not provided and error in fetching from vault !'
      );
    }

    let options = {
      headers: {
        'Content-Type': 'application/json',
        'X-Vault-Token': this._token
      }
    };

    const data = {
      options: {
        cas: cas
      },
      data: data_
    };

    try {
      var response = await axios.put(
        BASE_URI.concat(`/v1/${secrets_path}/data/${sub_path}`),
        data,
        options
      );
    } catch (e: any) {
      if (e.toString().indexOf(VAULT_ERRORS[403]) !== -1) {
        if (retry) {
          this.update_secrets_to_vault(
            secrets_path,
            sub_path,
            data_,
            cas,
            false
          );
          return;
        }

        throw new Error(ERROR_MSG.unauthorized);
      } else {
        throw e;
      }
    }

    if (response.status !== 200) {
      return false;
    }

    return true;
  }

  async create_secrets_vault(
    secrets_path: string,
    sub_path: string,
    data_: any,
    retry = true
  ) {
    const token = this._token || ''; 
    let options = {
      headers: {
        'Content-Type': 'application/json',
        'X-Vault-Token': token
      }
    };

    const data = {
      data: data_
    };

    try {
      var response = await axios.put(
        BASE_URI.concat(`/v1/${secrets_path}/data/${sub_path}`),
        data,
        options
      );
    } catch (e: any) {
      if (e.toString().indexOf(VAULT_ERRORS[403]) !== -1) {
        if (retry) {
          this.update_secrets_to_vault(
            secrets_path,
            sub_path,
            data_,
            null,
            false
          );
          return;
        }

        throw new Error(ERROR_MSG.unauthorized);
      } else {
        throw e;
      }
    }

    if (response.status !== 200) {
      return false;
    }

    return true;
  }

  async _update_config(recursive = true) {
    try {
      logger.info('Updating secrets from vault', {path: path.relative(process.cwd(), __filename)});
      await this._fetch_secrets_from_vault(
        config.vault_secrets_path,
        config.vault_secrets_sub_path
      );

      for (let secret in this._secrets) {
        config[secret] = this._secrets[secret];
      }
    } catch (err: any) {
      if (err.toString() === ERROR_MSG.unauthorized) {
        logger.warn(''.concat(...['VAULT: ', ERROR_MSG.unauthorized]), {path: path.relative(process.cwd(), __filename)});
      }
      try {
        logger.info('Vault token expired, fetching new', {path: path.relative(process.cwd(), __filename)});
        await this._get_token_from_vault();

      } catch (e: any) {
        logger.error('error in vault', e, {path: path.relative(process.cwd(), __filename)});
      }
    }

    if (recursive) {
      await sleep(this._update_secrets_interval);
      this._update_config();
    }
  }

  get_all_secrets() {
    return this._secrets;
  }

  async get_secret(id: string) {
    let retries = this._retries;
    let secrets = null;
    let refreshed = false;

    for (let i = 0; i < retries; i++) {
      secrets = this.get_all_secrets();

      if (id in secrets) {
        return secrets[id];
      }

      if (!refreshed) {
        if (this._token) {
          refreshed = true;
        }

        try {
          await this._update_config(false);
        } catch (e: any) {
          logger.error(e, {path: path.relative(process.cwd(), __filename)});
        }
      }
    }

    return null;
  }
}

export default Secrets;
