const BACKEND_ORIGIN_ENV = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const DEFAULT_BACKEND_ORIGIN = 'http://localhost:8080';

function normalizeOrigin(origin: string): string {
  return origin.endsWith('/') ? origin.slice(0, -1) : origin;
}

export function getBackendHttpOrigin(): string {
  if (BACKEND_ORIGIN_ENV) {
    return normalizeOrigin(BACKEND_ORIGIN_ENV);
  }

  return DEFAULT_BACKEND_ORIGIN;
}

export function getBackendHttpUrl(path: string): string {
  return `${getBackendHttpOrigin()}${path}`;
}

export function getBackendWebSocketUrl(path: string): string {
  const origin = getBackendHttpOrigin();

  if (origin.startsWith('https://')) {
    return `wss://${origin.slice('https://'.length)}${path}`;
  }

  if (origin.startsWith('http://')) {
    return `ws://${origin.slice('http://'.length)}${path}`;
  }

  return `${origin}${path}`;
}
