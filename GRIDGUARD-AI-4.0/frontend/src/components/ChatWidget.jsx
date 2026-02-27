import { useState } from "react";
import api from "../services/api";

const formatAssistantReply = (response) => {
  const payload = response?.data ?? response?.reply ?? response?.text;
  if (typeof payload === "string") return payload;

  if (Array.isArray(payload)) {
    return payload.map((item, i) => `${i + 1}. ${JSON.stringify(item)}`).join("\n");
  }

  if (payload && typeof payload === "object") {
    if (payload.projected_loss_percent !== undefined) {
      return `Projected next-week loss: ${Math.round(Number(payload.projected_loss_percent || 0))}%`;
    }
    return JSON.stringify(payload, null, 2);
  }

  return "AI Assistant: I am processing your request.";
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: "assistant", content: "Hello! Ask me about grid risks." }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    const newMessages = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await api.post("/llm/chat", { question: userMessage });
      const reply = formatAssistantReply(res.data);
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (err) {
      const msg = err?.response?.data?.message || "AI chat failed. Please try again.";
      setMessages([...newMessages, { role: "assistant", content: msg }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-3 w-80 glass rounded-2xl p-4">
          <div className="text-sm font-semibold mb-2">AI Assistant</div>
          <div className="h-48 overflow-auto space-y-2 text-sm">
            {messages.map((m, idx) => (
              <div key={idx} className={m.role === "assistant" ? "text-teal" : "text-white/80"}>
                {m.content}
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              className="flex-1 rounded-lg bg-ink/70 border border-white/10 text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              placeholder="Ask about Maharashtra risk"
            />
            <button
              onClick={send}
              disabled={loading}
              className="px-3 rounded-lg bg-teal text-ink text-sm disabled:opacity-60"
            >
              {loading ? "..." : "Send"}
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="px-4 py-3 rounded-full bg-teal text-ink font-semibold shadow-glow"
      >
        {open ? "Close" : "AI Chat"}
      </button>
    </div>
  );
}
