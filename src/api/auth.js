import api, { setToken, removeToken } from './client';

export const auth = {
  // Register a new buyer or seller
  register: async (name, email, password, role = 'buyer') => {
    const data = await api.post('/auth/register', { name, email, password, role });
    if (data.token) {
      await setToken(data.token);
    }
    return data;
  },

  // Log in an existing user
  login: async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    if (data.token) {
      await setToken(data.token);
    }
    return data;
  },

  // Get current user profile (resolves details like verified status and roles)
  getMe: async () => {
    return await api.get('/auth/me');
  },

  // Submit National ID front/back + selfie for seller verification
  submitIdVerification: async (idFrontUri, idBackUri, selfieUri) => {
    const formData = new FormData();
    
    // Helper to format file upload entry
    const appendFile = (form, key, uri) => {
      if (!uri) return;
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : 'image';
      form.append(key, { uri, name: filename, type });
    };

    appendFile(formData, 'id_front', idFrontUri);
    appendFile(formData, 'id_back', idBackUri);
    appendFile(formData, 'selfie', selfieUri);

    return await api.upload('/id-verification', formData);
  },

  // Log out the active session
  logout: async () => {
    await removeToken();
  },
};

export default auth;
