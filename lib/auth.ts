const TOKEN_KEY = "token";
const USER_KEY = "user";
const USER_TYPE_KEY = "userType_mybakery";
const ORDER_MODE_KEY = "orderMode";
const TABLE_NO_KEY = "tableNo";

//ดึง JWT token จาก localStorage
export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

// User

export interface AuthUser {
  email: string;
  fullname?: string;
  profileImage?: string;
  role?: string;
}

export const getUser = (): AuthUser | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setUser = (user: AuthUser): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const removeUser = (): void => {
  localStorage.removeItem(USER_KEY);
};

// User Type (ลูกค้า / พนักงาน)

export const getUserType = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_TYPE_KEY);
};

export const setUserType = (type: string): void => {
  localStorage.setItem(USER_TYPE_KEY, type);
};

// Order Mode (dine-in / online)

export const getOrderMode = (): string => {
  if (typeof window === "undefined") return "online";
  return localStorage.getItem(ORDER_MODE_KEY) || "online";
};

export const setOrderMode = (mode: string): void => {
  localStorage.setItem(ORDER_MODE_KEY, mode);
};

export const getTableNo = (): string => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TABLE_NO_KEY) || "";
};

export const setTableNo = (table: string): void => {
  localStorage.setItem(TABLE_NO_KEY, table);
};

// Logout

export const logout = (): void => {
  removeToken();
  removeUser();
  localStorage.removeItem(USER_TYPE_KEY);
  localStorage.removeItem(ORDER_MODE_KEY);
  localStorage.removeItem(TABLE_NO_KEY);
};

// ตรวจว่ามี token อยู่ไหม
export const isLoggedIn = (): boolean => !!getToken();
