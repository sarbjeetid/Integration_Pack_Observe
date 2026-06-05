import axios from 'axios';
import config from '../../config';

const BASE_URI = config.vault_uri || '';

const login = async (role_id: string, secret_id: string) => {
  let data = {
    role_id: role_id,
    secret_id: secret_id
  };

  try {
    var response = await axios.post(
      BASE_URI.concat('/v1/auth/approle/login'),
      data
    );
  } catch (e: any) {
    if (
      e.toString().indexOf('Error: Request failed with status code 400') !== -1
    ) {
      throw new Error('Login failed');
    } else {
      throw e;
    }
  }

  if (response.status !== 200) {
    return null;
  }

  return response.data;
};

export default login;
