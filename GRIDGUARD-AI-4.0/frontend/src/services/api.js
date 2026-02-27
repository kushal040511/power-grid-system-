import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

const api = axios.create({ baseURL });
const plain = axios.create({ baseURL });

const clearSessionAndRedirect = () => {
  localStorage.removeItem("gg_token");
  localStorage.removeItem("gg_refresh");
  localStorage.removeItem("gg_role");
  if (typeof window !== "undefined" && !["/login", "/signup"].includes(window.location.pathname)) {
    window.location.assign("/login");
  }
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("gg_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (!original || original._retry) throw error;

    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem("gg_refresh");
      if (!refreshToken) {
        clearSessionAndRedirect();
        throw error;
      }

      original._retry = true;
      try {
        const refreshRes = await plain.post("/auth/refresh", { refreshToken });
        const token = refreshRes.data?.token;
        if (!token) throw error;
        localStorage.setItem("gg_token", token);
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch (refreshErr) {
        clearSessionAndRedirect();
        throw refreshErr;
      }
    }

    throw error;
  }
);

export default api;
