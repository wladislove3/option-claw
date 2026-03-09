// API client for backend communication

const API_BASE_URL = '/api';

/**
 * Make an API request
 * @param {string} endpoint - API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise<any>} - Response data
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const config = { ...defaultOptions, ...options };
  
  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `API error: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Health endpoints
export const healthApi = {
  check: () => apiRequest('/health'),
  metrics: () => fetch('/metrics').then(r => r.text()),
};

// Auth endpoints
export const authApi = {
  register: (data) => apiRequest('/auth/register', { method: 'POST', body: data }),
  login: (data) => apiRequest('/auth/login', { method: 'POST', body: data }),
  refresh: () => apiRequest('/auth/refresh', { method: 'POST' }),
};

// Positions endpoints
export const positionsApi = {
  getReal: () => apiRequest('/positions/real'),
  getVirtual: () => apiRequest('/positions/virtual'),
  createVirtual: (data) => apiRequest('/positions/virtual', { method: 'POST', body: data }),
  updateVirtual: (id, data) => apiRequest(`/positions/virtual?id=${id}`, { method: 'PUT', body: data }),
  deleteVirtual: (id) => apiRequest(`/positions/virtual?id=${id}`, { method: 'DELETE' }),
};

// Greeks endpoints
export const greeksApi = {
  getPortfolio: () => apiRequest('/greeks/portfolio'),
  getPosition: () => apiRequest('/greeks/position'),
};

// Alerts endpoints
export const alertsApi = {
  list: () => apiRequest('/alerts'),
  create: (data) => apiRequest('/alerts', { method: 'POST', body: data }),
  delete: (id) => apiRequest(`/alerts/${id}`, { method: 'DELETE' }),
};
