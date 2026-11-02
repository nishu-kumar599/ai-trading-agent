/**
 * Utility helper to automatically inject Authorization: Bearer <token>
 * on frontend API requests to protected server endpoints.
 */

export function getAuthHeaders(customHeaders = {}) {
  const token = localStorage.getItem('aitrader_token');
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

export async function authFetch(url, options = {}) {
  const customHeaders = options.headers || {};
  const headers = getAuthHeaders(customHeaders);
  const hasBody = options.body !== undefined && options.body !== null;
  if (hasBody) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  } else if (!customHeaders['Content-Type']) {
    delete headers['Content-Type'];
  }
  return fetch(url, {
    ...options,
    headers
  });
}
