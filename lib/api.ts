import { getToken, removeToken } from "./auth";

//Base URL (แก้ตรงนี้ที่เดียวตอน deploy)
const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "${process.env.NEXT_PUBLIC_API_URL}";

// Types

interface ApiOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** ถ้า true จะไม่ใส่ Authorization header */
  noAuth?: boolean;
}

interface ApiError {
  status: number;
  message: string;
}

// Core fetch function

async function request<T>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<T> {
  const { body, noAuth, headers: customHeaders, ...restOptions } = options;

  // สร้าง headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(customHeaders as Record<string, string>),
  };

  // ใส่ token อัตโนมัติ (ถ้ามี)
  if (!noAuth) {
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...restOptions,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // จัดการ 401: token หมดอายุ
  if (response.status === 401) {
    removeToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw { status: 401, message: "Token expired" } as ApiError;
  }

  // จัดการ error อื่น
  if (!response.ok) {
    let message = `API Error: ${response.status}`;
    try {
      const errorData = await response.json();
      message = errorData.message || message;
    } catch {
      // response ไม่ใช่ JSON
    }
    throw { status: response.status, message } as ApiError;
  }

  // response ที่ไม่มี body (204 No Content)
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Shorthand methods

export const api = {
  get: <T>(endpoint: string, options?: ApiOptions) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body?: unknown, options?: ApiOptions) =>
    request<T>(endpoint, { ...options, method: "POST", body }),

  put: <T>(endpoint: string, body?: unknown, options?: ApiOptions) =>
    request<T>(endpoint, { ...options, method: "PUT", body }),

  patch: <T>(endpoint: string, body?: unknown, options?: ApiOptions) =>
    request<T>(endpoint, { ...options, method: "PATCH", body }),

  delete: <T>(endpoint: string, options?: ApiOptions) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),

  // สำหรับ upload file (ไม่ใส่ Content-Type ให้ browser จัดการ boundary)
  upload: async <T>(endpoint: string, formData: FormData): Promise<T> => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (response.status === 401) {
      removeToken();
      if (typeof window !== "undefined") window.location.href = "/login";
      throw { status: 401, message: "Token expired" } as ApiError;
    }

    if (!response.ok) {
      throw {
        status: response.status,
        message: `Upload failed: ${response.status}`,
      } as ApiError;
    }

    return response.json();
  },
};

// Export BASE_URL สำหรับกรณีพิเศษ (เช่น image src)
export { BASE_URL };
