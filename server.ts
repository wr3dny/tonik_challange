// written with LLM support

import http from "node:http"
import {Server as IOServer} from "socket.io"
import next from "next";
import {createEngine} from "@/src/server/engine";


const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const PORT = Number(process.env.PORT ?? 3000);

await app.prepare();

const httpServer = http.createServer((req, res) => handle(req, res));
const io = new IOServer(httpServer, { path: "/socket", cors: { origin: true } });

const engine = createEngine();

function emitRound(toSocketId?: string) {
    const payload = engine.getRound();
    if (toSocketId) io.to(toSocketId).emit("round", payload);
    else io.emit("round", payload);
}

function emitPlayers() {
    io.emit("players", { players: engine.getPlayers() });
}

setInterval(() => {
    const roundChanged = engine.tick();
    if (roundChanged) emitRound();
    emitPlayers();
}, 500);

io.on("connection", (socket) => {
    emitRound(socket.id);
    socket.emit("players", { players: engine.getPlayers() });

    socket.on("join", (payload: { name: string; playerId?: string }, ack?: any) => {
        const res = engine.join(socket.id, payload.name, payload.playerId);
        ack?.(res);
        emitPlayers();
    });

    socket.on("progress", (payload: { typed: string }) => {
        engine.progress(socket.id, payload.typed);
    });

    socket.on("disconnect", () => {
        engine.leave(socket.id);
        emitPlayers();
    });
});

httpServer.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
});