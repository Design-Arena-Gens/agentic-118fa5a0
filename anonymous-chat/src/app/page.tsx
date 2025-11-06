"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  text: string;
  alias: string;
  color: string;
  sentAt: string;
};

type ServerEvent =
  | { type: "history"; messages: ChatMessage[] }
  | { type: "message"; message: ChatMessage }
  | { type: "presence"; count: number };

const adjectives = [
  "Brave",
  "Calm",
  "Curious",
  "Gentle",
  "Bold",
  "Clever",
  "Happy",
  "Kind",
  "Mellow",
  "Quick",
  "Quiet",
  "Swift",
  "Witty",
];

const animals = [
  "Otter",
  "Fox",
  "Fawn",
  "Robin",
  "Lynx",
  "Swan",
  "Panda",
  "Hare",
  "Koala",
  "Owl",
  "Wolf",
  "Seal",
  "Koi",
];

const palette = [
  "bg-blue-100 text-blue-900",
  "bg-emerald-100 text-emerald-900",
  "bg-amber-100 text-amber-900",
  "bg-purple-100 text-purple-900",
  "bg-rose-100 text-rose-900",
  "bg-slate-100 text-slate-900",
  "bg-teal-100 text-teal-900",
];

function buildAlias(seed: number) {
  const adjective = adjectives[seed % adjectives.length];
  const animal = animals[seed % animals.length];
  return `${adjective} ${animal}`;
}

function buildColor(seed: number) {
  return palette[seed % palette.length];
}

function randomSeed() {
  return Math.floor(Math.random() * 10_000);
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [pending, setPending] = useState(false);
  const [socketReady, setSocketReady] = useState(false);
  const [input, setInput] = useState("");
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const persona = useMemo(() => {
    const seed = randomSeed();
    return {
      alias: buildAlias(seed),
      colorClass: buildColor(seed),
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${protocol}://${window.location.host}/api/socket`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.addEventListener("open", () => {
      setSocketReady(true);
    });

    ws.addEventListener("message", (event) => {
      try {
        const payload: ServerEvent = JSON.parse(event.data as string);

        if (payload.type === "history") {
          setMessages(payload.messages);
        }

        if (payload.type === "message") {
          setMessages((prev) => [...prev, payload.message]);
        }

        if (payload.type === "presence") {
          setOnlineCount(payload.count);
        }
      } catch (error) {
        console.error("Failed to parse server event", error);
      }
    });

    ws.addEventListener("close", () => {
      setSocketReady(false);
      setOnlineCount(0);
    });

    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    if (!messageEndRef.current) {
      return;
    }
    messageEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!input.trim()) {
      return;
    }

    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const payload = {
      type: "message",
      text: input.trim().slice(0, 480),
      alias: persona.alias,
      color: persona.colorClass,
    };

    try {
      setPending(true);
      ws.send(JSON.stringify(payload));
      setInput("");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Whisperwind
            </h1>
            <p className="text-sm text-slate-400">
              Anonymous messages ripple instantly to everyone online.
            </p>
          </div>
          <div className="flex flex-col items-start gap-1 text-sm sm:items-end">
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 font-medium text-emerald-300">
              You are {persona.alias}
            </span>
            <span className="text-xs text-slate-500">
              {socketReady
                ? `${onlineCount} ${onlineCount === 1 ? "person" : "people"} connected`
                : "Connecting…"}
            </span>
          </div>
        </div>
      </header>

      <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
        <section className="flex-1 overflow-hidden rounded-3xl border border-white/10 bg-black/30 shadow-lg">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-4 text-sm text-slate-400">
              <span>Live feed</span>
              <span className="rounded-full border border-white/10 px-3 py-1 font-medium text-slate-300">
                {messages.length} message{messages.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
                  <p className="text-base font-medium">The room is quiet.</p>
                  <p className="text-sm">Say something to start the ripple.</p>
                </div>
              ) : (
                messages.map((message) => (
                  <article key={message.id} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-medium ${message.color}`}
                      >
                        {message.alias}
                      </span>
                      <span>{new Date(message.sentAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-base leading-relaxed text-slate-100">
                      {message.text}
                    </p>
                  </article>
                ))
              )}
              <div ref={messageEndRef} />
            </div>
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="sticky bottom-8 flex flex-col gap-3 rounded-3xl border border-white/10 bg-black/60 p-6 shadow-2xl backdrop-blur md:flex-row md:items-center"
        >
          <label className="flex-1" htmlFor="message">
            <span className="sr-only">Send a message</span>
            <textarea
              id="message"
              name="message"
              required
              maxLength={480}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Send a ripple to everyone…"
              className="h-24 w-full resize-none rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-base text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/40 md:h-16"
            />
          </label>
          <button
            type="submit"
            disabled={!socketReady || pending || !input.trim()}
            className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-5 py-3 text-base font-semibold text-emerald-950 shadow-lg transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-400/40 disabled:text-emerald-900/50"
          >
            {pending ? "Sending…" : "Send to all"}
          </button>
        </form>
      </main>
    </div>
  );
}
