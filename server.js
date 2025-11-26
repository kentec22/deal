// Simple WebSocket relay server for pairing remote + board

const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8080 });

let pairs = {}; // { code: { host: ws, remote: ws } }

function createPairCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

wss.on("connection", ws => {
    ws.on("message", message => {
        let msg = {};
        try { msg = JSON.parse(message); } catch (_) {}

        // Host requests new pairing code
        if (msg.type === "createPair") {
            let code = createPairCode();
            pairs[code] = { host: ws, remote: null };
            ws.send(JSON.stringify({ type: "pairCreated", code }));
        }

        // Remote enters pair code
        if (msg.type === "joinPair") {
            const pair = pairs[msg.code];
            if (!pair) return ws.send(JSON.stringify({ type: "pairError" }));

            pair.remote = ws;
            ws.send(JSON.stringify({ type: "pairJoined" }));
            pair.host.send(JSON.stringify({ type: "remoteConnected" }));
        }

        // Relay remote → host
        if (msg.type === "remoteCommand") {
            for (const code in pairs) {
                const p = pairs[code];
                if (p.remote === ws && p.host)
                    p.host.send(JSON.stringify(msg));
            }
        }

        // Relay host → remote
        if (msg.type === "hostCommand") {
            for (const code in pairs) {
                const p = pairs[code];
                if (p.host === ws && p.remote)
                    p.remote.send(JSON.stringify(msg));
            }
        }
    });
});
