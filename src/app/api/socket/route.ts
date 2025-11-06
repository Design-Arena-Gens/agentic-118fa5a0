export const runtime = "edge";

type ClientMessage = {
  type: "message";
  text?: string;
  alias?: string;
  color?: string;
};

type ChatMessage = {
  id: string;
  text: string;
  alias: string;
  color: string;
  sentAt: string;
};

type Connection = {
  id: string;
  socket: WebSocket;
};

const connections = new Map<string, Connection>();
let history: ChatMessage[] = [];

function broadcast(data: unknown, options?: { exclude?: string }) {
  const payload = JSON.stringify(data);
  for (const connection of connections.values()) {
    if (options?.exclude && connection.id === options.exclude) {
      continue;
    }

    try {
      connection.socket.send(payload);
    } catch (error) {
      console.error("Broadcast failed", error);
    }
  }
}

function registerPresence() {
  broadcast({ type: "presence", count: connections.size });
}

function pruneHistory() {
  if (history.length > 200) {
    history = history.slice(-200);
  }
}

export async function GET(request: Request) {
  if (!request.headers.get("upgrade")) {
    return new Response("Expected Upgrade: websocket", { status: 426 });
  }

  const { 0: client, 1: server } = new WebSocketPair();
  const connectionId = crypto.randomUUID();

  server.accept();

  const connection: Connection = { id: connectionId, socket: server };
  connections.set(connectionId, connection);

  try {
    server.send(
      JSON.stringify({
        type: "history",
        messages: history,
      }),
    );
  } catch (error) {
    console.error("Failed to send history", error);
  }

  registerPresence();

  server.addEventListener("message", (event) => {
    if (typeof event.data !== "string") {
      return;
    }

    let data: ClientMessage;
    try {
      data = JSON.parse(event.data);
    } catch (error) {
      console.error("Invalid payload", error);
      return;
    }

    if (data.type !== "message" || !data.text) {
      return;
    }

    const trimmed = data.text.trim();
    if (!trimmed) {
      return;
    }

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      text: trimmed.slice(0, 480),
      alias: data.alias?.slice(0, 48) || "Anonymous",
      color: data.color?.slice(0, 64) || "bg-slate-100 text-slate-900",
      sentAt: new Date().toISOString(),
    };

    history = [...history, message];
    pruneHistory();

    broadcast({ type: "message", message });
  });

  const cleanup = () => {
    connections.delete(connectionId);
    registerPresence();
  };

  server.addEventListener("close", cleanup);
  server.addEventListener("error", cleanup);

  return new Response(null, {
    status: 101,
    webSocket: client,
  } as any);
}
