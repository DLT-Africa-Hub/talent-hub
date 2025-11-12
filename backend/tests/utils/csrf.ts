import type { Agent } from 'supertest';

export interface CsrfDetails {
  token: string;
  headerName: string;
}

export const fetchCsrfToken = async (agent: Agent): Promise<CsrfDetails> => {
  const response = await agent.get('/api/v1/csrf-token');
  const { token, headerName } = response.body.data ?? response.body;

  if (!token || !headerName) {
    throw new Error('Failed to retrieve CSRF token from response');
  }

  return { token, headerName };
};



