import { useEffect, useRef, useState } from "react";
import type { Product } from "../types";
import { sendChatMessage } from "../data/apiClient";

interface Message {
  role: "user" | "bot";
  text: string;
  products?: Product[];
}

interface ChatWidgetProps {
  apiUrl: string;
}

export default function ChatWidget({ apiUrl }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: '¡Hola! Soy el bot del rastro. Pregúntame qué hay, por ejemplo: "¿tenéis tocadiscos?" o "algo de decoración".',
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setBusy(true);
    try {
      const res = await sendChatMessage(apiUrl, text);
      setMessages((m) => [...m, { role: "bot", text: res.answer, products: res.products }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: "Ups, no pude consultar el catálogo. Comprueba que la API esté encendida.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button className="chat-fab" onClick={() => setOpen((o) => !o)} aria-label="Abrir chat">
        CHAT
      </button>
      {open && (
        <section className="chat-panel">
          <header>Bot del rastro</header>
          <div className="chat-messages" ref={scrollRef}>
            {messages.map((msg, i) => (
              <div key={i}>
                <div className={`chat-msg ${msg.role}`}>{msg.text}</div>
                {msg.products && msg.products.length > 0 && (
                  <div className="chat-hit">
                    {msg.products.map((p) => (
                      <div key={p.id}>
                        • {p.nombre} — {p.precio.toFixed(2)}€
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && <div className="chat-msg bot">Buscando en el rastro…</div>}
          </div>
          <div className="chat-input-row">
            <input
              type="text"
              placeholder="Escribe tu pregunta…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <button onClick={send} disabled={busy}>
              Enviar
            </button>
          </div>
        </section>
      )}
    </>
  );
}
