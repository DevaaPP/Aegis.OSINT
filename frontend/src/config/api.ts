export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Helper to set authorization token in header
export function getHeaders(token?: string) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }
  
  return headers;
}
