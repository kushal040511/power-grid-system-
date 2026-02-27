import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [regionId, setRegionId] = useState("");
  const [regions, setRegions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadRegions = async () => {
      try {
        const regionRes = await api.get("/auth/regions");
        setRegions(regionRes.data || []);
      } catch (err) {
        setRegions([]);
      }
    };

    loadRegions();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/register", {
        name,
        email,
        password,
        role: "analyst",
        region_id: regionId || null
      });
      navigate("/login");
    } catch (err) {
      setError(err?.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="glass rounded-2xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-display font-semibold">Create GRIDGUARD Account</h1>
        <p className="text-white/60 mt-1">Sign up for analyst access.</p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <input
            className="w-full rounded-lg bg-ink/60 border border-white/10"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            required
          />
          <input
            className="w-full rounded-lg bg-ink/60 border border-white/10"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            required
          />
          <input
            type="password"
            className="w-full rounded-lg bg-ink/60 border border-white/10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 chars)"
            required
          />
          <select
            className="w-full rounded-lg bg-ink/60 border border-white/10"
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
          >
            <option value="">Select region (optional)</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          {error && <div className="text-ember text-sm">{error}</div>}
          <button disabled={loading} className="w-full py-2 rounded-lg bg-teal text-ink font-semibold">
            {loading ? "Creating..." : "Sign Up"}
          </button>
        </form>
        <button onClick={() => navigate("/login")} className="mt-4 text-sm text-teal underline">
          Back to Login
        </button>
      </div>
    </div>
  );
}
