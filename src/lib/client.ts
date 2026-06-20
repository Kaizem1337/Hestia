"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Typed fetch wrapper for the app's `{ ok, data, error }` JSON envelope. */
export async function apiFetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    headers:
      options?.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : undefined,
    ...options,
  });
  let json: { ok?: boolean; data?: T; error?: string; details?: unknown } = {};
  try {
    json = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok || json.ok === false) {
    throw new ApiError(
      json.error || `Request failed (${res.status})`,
      res.status,
      json.details
    );
  }
  return json.data as T;
}

interface UseDataState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  refresh: (silent?: boolean) => Promise<void>;
}

/** Minimal data-fetching hook with loading/error/refresh states. */
export function useData<T>(url: string | null): UseDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(url));
  const [refreshing, setRefreshing] = useState(false);
  const urlRef = useRef(url);
  urlRef.current = url;

  const refresh = useCallback(async (silent = false) => {
    const target = urlRef.current;
    if (!target) return;
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<T>(target);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (url) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return { data, error, loading, refreshing, refresh };
}
