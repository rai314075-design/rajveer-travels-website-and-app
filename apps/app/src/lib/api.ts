import * as SecureStore from 'expo-secure-store';
import { buildApiUrl, parseApiData } from '@rajveer/shared';
import { API_URL } from './config';

const TOKEN_KEY = 'rajveer_travels_token';
let memoryToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export async function loadToken(): Promise<string | null> {
  memoryToken = await SecureStore.getItemAsync(TOKEN_KEY);
  return memoryToken;
}

export async function setToken(token: string | null): Promise<void> {
  memoryToken = token;
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// The API returns { error: string } or, for zod failures, { error: { formErrors, fieldErrors } }.
function errorMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object' || !('error' in data)) return null;
  const err = (data as { error: unknown }).error;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const e = err as { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
    const parts = [...(e.formErrors ?? []), ...Object.values(e.fieldErrors ?? {}).flat()];
    if (parts.length) return parts.join('. ');
  }
  return null;
}

interface Options<T> {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  schema?: { parse(data: unknown): T };
}

export async function api<T>(path: string, { method = 'GET', body, schema }: Options<T> = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (memoryToken) headers.Authorization = `Bearer ${memoryToken}`;

  let res: Response;
  try {
    res = await fetch(buildApiUrl(API_URL, path), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      // Never use the native cookie jar: auth is the Bearer token only, so logging out
      // really logs out even if the server also sets a web session cookie.
      credentials: 'omit',
    });
  } catch {
    throw new ApiError(
      `Can't connect to ${API_URL}. Start the website with "pnpm dev" from the workspace root. On a phone, use your computer's Wi-Fi IP in EXPO_PUBLIC_API_URL, not localhost.`,
      0,
    );
  }

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && memoryToken) onUnauthorized?.();
    throw new ApiError(errorMessage(data) ?? `Something went wrong (${res.status}).`, res.status);
  }
  return schema ? parseApiData(data, schema) : (data as T);
}



