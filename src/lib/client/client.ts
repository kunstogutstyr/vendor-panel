import Medusa from '@medusajs/js-sdk';

export const backendUrl = __BACKEND_URL__ ?? '/';
export const publishableApiKey = __PUBLISHABLE_API_KEY__ ?? '';

/** Headere for markedsplass-kontekst (multi-marketplace). Bruk VITE_SALES_CHANNEL_ID og VITE_REGION_ID i .env. */
const getMarketplaceHeaders = (): Record<string, string> => {
  const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
  const salesChannelId = (env as { VITE_SALES_CHANNEL_ID?: string }).VITE_SALES_CHANNEL_ID?.trim();
  const regionId = (env as { VITE_REGION_ID?: string }).VITE_REGION_ID?.trim();
  const headers: Record<string, string> = {};
  if (salesChannelId) headers['x-sales-channel-id'] = salesChannelId;
  if (regionId) headers['x-region-id'] = regionId;
  return headers;
};

const getAuthToken = () =>
  typeof window !== 'undefined'
    ? window.localStorage.getItem('medusa_auth_token') || ''
    : '';

const decodeJwt = (token: string) => {
  try {
    const payload = token.split('.')[1];

    return JSON.parse(atob(payload));
  } catch (err) {
    return null;
  }
};

const isTokenExpired = (token: string | null) => {
  if (!token) return true;

  const payload = decodeJwt(token);
  if (!payload?.exp) return true;

  return payload.exp * 1000 < Date.now();
};

export const sdk = new Medusa({
  baseUrl: backendUrl,
  publishableKey: publishableApiKey
});

// useful when you want to call the BE from the console and try things out quickly
if (typeof window !== 'undefined') {
  (window as any).__sdk = sdk;
}

export const importProductsQuery = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  let token = getAuthToken();

  const request = async (bearer: string) =>
    fetch(`${backendUrl}/vendor/products/import`, {
      method: 'POST',
      body: formData,
      headers: {
        authorization: `Bearer ${bearer}`,
        'x-publishable-api-key': publishableApiKey,
        ...getMarketplaceHeaders()
      }
    });

  let response = await request(token);

  if (response.status === 401) {
    const freshToken = getAuthToken();
    if (freshToken && freshToken !== token) {
      token = freshToken;
      response = await request(token);
    }
  }

  if (!response.ok) {
    let errorMessage = 'Import failed';
    try {
      const errorData = await response.json();
      errorMessage = errorData?.message || errorMessage;
    } catch {
      // noop
    }

    if (response.status === 401) {
      localStorage.removeItem('medusa_auth_token');
      window.location.href = '/login?reason=Unauthorized';
      throw new Error('Session expired. Please log in again.');
    }

    throw new Error(errorMessage);
  }

  return response.json();
};

export const uploadFilesQuery = async (files: any[]) => {
  const formData = new FormData();

  for (const { file } of files) {
    formData.append('files', file);
  }

  let token = getAuthToken();

  const request = async (bearer: string) =>
    fetch(`${backendUrl}/vendor/uploads`, {
      method: 'POST',
      body: formData,
      headers: {
        authorization: `Bearer ${bearer}`,
        'x-publishable-api-key': publishableApiKey,
        ...getMarketplaceHeaders()
      }
    });

  let response = await request(token);

  // Retry once with the latest token from storage.
  if (response.status === 401) {
    const freshToken = getAuthToken();
    if (freshToken && freshToken !== token) {
      token = freshToken;
      response = await request(token);
    }
  }

  if (!response.ok) {
    let errorMessage = 'Image upload failed';
    try {
      const errorData = await response.json();
      errorMessage = errorData?.message || errorMessage;
    } catch {
      // noop
    }

    if (response.status === 401) {
      localStorage.removeItem('medusa_auth_token');
      window.location.href = '/login?reason=Unauthorized';
      throw new Error('Session expired. Please log in again.');
    }

    throw new Error(errorMessage);
  }

  const data = await response.json();
  if (!data?.files || !Array.isArray(data.files)) {
    throw new Error('Upload response is invalid');
  }

  return data;
};

export const fetchQuery = async (
  url: string,
  {
    method,
    body,
    query,
    headers
  }: {
    method: 'GET' | 'POST' | 'DELETE';
    body?: object;
    query?: Record<string, string | number | object>;
    headers?: { [key: string]: string };
  }
) => {
  const bearer = getAuthToken();
  const params = Object.entries(query || {}).reduce((acc, [key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value)) {
        // Send arrays as multiple query parameters with bracket notation
        // This allows backends to parse them as arrays: status[]=draft&status[]=published
        const arrayParams = value
          .map(item => `${encodeURIComponent(key)}[]=${encodeURIComponent(item)}`)
          .join('&');
        if (acc) {
          acc += '&' + arrayParams;
        } else {
          acc = arrayParams;
        }
      } else {
        const separator = acc ? '&' : '';
        const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value;
        acc += `${separator}${encodeURIComponent(key)}=${encodeURIComponent(serializedValue)}`;
      }
    }
    return acc;
  }, '');
  const response = await fetch(`${backendUrl}${url}${params && `?${params}`}`, {
    method: method,
    headers: {
      authorization: `Bearer ${bearer}`,
      'Content-Type': 'application/json',
      'x-publishable-api-key': publishableApiKey,
      ...getMarketplaceHeaders(),
      ...headers
    },
    body: body ? JSON.stringify(body) : null
  });

  if (!response.ok) {
    const errorData = await response.json();

    if (response.status === 401) {
      if (isTokenExpired(bearer)) {
        localStorage.removeItem('medusa_auth_token');
        window.location.href = '/login?reason=Unauthorized';
        return;
      }

      throw {
        type: 'NO_PERMISSION',
        message: errorData.message || 'Unauthorized'
      };
    }

    const error = new Error(errorData.message || 'Server error');
    (error as Error & { status: number }).status = response.status;
    throw error;
  }

  return response.json();
};
