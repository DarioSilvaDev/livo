type RequestTarget = "server" | "client";

const PUBLIC_API_BASE =
  import.meta.env.VITE_API_URL ?? "http://localhost:5000";
const SERVER_API_BASE =
  import.meta.env.VITE_INTERNAL_API_URL ?? PUBLIC_API_BASE;

export interface ApiFetchOptions extends RequestInit {
  target?: RequestTarget;
}

export function getApiBase(target?: RequestTarget) {
  if (target) {
    return target === "server" ? SERVER_API_BASE : PUBLIC_API_BASE;
  }

  return PUBLIC_API_BASE;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { target, headers, cache, ...rest } = options;
  const response = await fetch(`${getApiBase(target)}${path}`, {
    cache: cache ?? "no-store",
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `API request failed (${response.status}): ${
        message || response.statusText
      }`
    );
  }

  return (await response.json()) as T;
}
