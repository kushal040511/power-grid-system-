import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("gg_token", res.data.token);
      localStorage.setItem("gg_refresh", res.data.refreshToken || "");
      localStorage.setItem("gg_role", res.data.role);
      navigate("/dashboard");
    } catch (err) {
      setError("Login failed. Check credentials.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="glass rounded-2xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-display font-semibold">GRIDGUARD AI 4.0</h1>
        <p className="text-white/60 mt-1">Secure access to national grid intelligence.</p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <input
            className="w-full rounded-lg bg-ink/60 border border-white/10"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
          />
          <input
            type="password"
            className="w-full rounded-lg bg-ink/60 border border-white/10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
          {error && <div className="text-ember text-sm">{error}</div>}
          <button className="w-full py-2 rounded-lg bg-teal text-ink font-semibold">Sign In</button>
        </form>
        <button onClick={() => navigate("/signup")} className="mt-4 text-sm text-teal underline">
          Create a new account
        </button>
      </div>
    </div>
  );
}
