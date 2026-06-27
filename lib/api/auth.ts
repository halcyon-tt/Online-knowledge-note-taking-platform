const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

interface UserProfile {
  sub: number;
  email: string;
  username: string;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  username: string
) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, username }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "注册失败");
  }

  const data = await res.json();
  const accessToken = data.access_token || data.accessToken;
  const refreshToken = data.refresh_token || data.refreshToken;

  if (!accessToken) {
    console.error("注册响应缺少 token:", data);
    throw new Error("注册成功但未返回登录凭证");
  }

  localStorage.setItem("access_token", accessToken);
  if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "登录失败");
  }

  const data = await res.json();
  const accessToken = data.access_token || data.accessToken;
  const refreshToken = data.refresh_token || data.refreshToken;

  if (!accessToken) {
    console.error("登录响应缺少 token:", data);
    throw new Error("登录成功但未返回登录凭证");
  }

  localStorage.setItem("access_token", accessToken);
  if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
  return data;
}

function decodeToken(token: string): UserProfile | null {
  try {
    const base64url = token.split(".")[1];
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }
    return {
      sub: payload.sub,
      email: payload.email,
      username: payload.username,
    };
  } catch {
    return null;
  }
}

/** 尝试用 refresh_token 换取新的 access_token */
async function tryRefresh(): Promise<string | null> {
  const refresh = localStorage.getItem("refresh_token");
  if (!refresh) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const newToken = data.access_token || data.accessToken;
    if (newToken) {
      localStorage.setItem("access_token", newToken);
      return newToken;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 获取当前用户：
 * 1. 先尝试解码当前 access_token
 * 2. 如果过期，尝试 refresh
 * 3. refresh 成功后解码新 token
 * 4. 都失败则返回 null
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  const token = localStorage.getItem("access_token");
  if (!token) return null;

  // 尝试解码当前 token
  const user = decodeToken(token);
  if (user) return user;

  // token 过期，尝试刷新
  const newToken = await tryRefresh();
  if (newToken) return decodeToken(newToken);

  // 刷新失败，清理登录态
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  return null;
}

export async function signOut() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}
