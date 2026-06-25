const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("access_token");

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && token) {
    // access token 过期，尝试刷新
    const refreshed = await refreshToken();
    if (refreshed) {
      return apiRequest<T>(path, options);
    }
    // 刷新失败，清除登录状态
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Request failed");
  }

  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

async function refreshToken(): Promise<boolean> {
  const refresh = localStorage.getItem("refresh_token");
  if (!refresh) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    const newToken = data.access_token || data.accessToken;
    if (!newToken) return false;
    localStorage.setItem("access_token", newToken);
    return true;
  } catch {
    return false;
  }
}
