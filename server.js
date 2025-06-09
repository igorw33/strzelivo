var express = require("express")
var app = express()
const PORT = 3000;
app.use(express.static('static'))

// przekazanie logiki socketów do pliku websocket.js
const { setupWebSocket } = require('./websocket');

const http = require('http');
const server = http.createServer(app);
setupWebSocket(server);


// server.listen umożliwia podpięcie socketów
server.listen(PORT, function () {
    console.log("start serwera na porcie " + PORT)
})

// moduł z EventBusem
const { bus } = require("./EventBus");
// moduł z hashmapą <socket,player>
const Players = require('./players');
const spawnpoints = require('./spawnpoints');
const { connected } = require("process");

// mapa socketów graczy: <playerID, socket>
const sockets = new Map();
// mapa odwrotna: <socket,id>
const ids = new Map();

const MAX_USERNAME_LENGTH = 30;
const MAX_DISCONNECT_TIME = 10000; // ms

bus.on('login', (data, socket, wss) => {
    // data = {username:username}
    const username = data.username;

    if (typeof username !== 'string') {
        return socket.send(JSON.stringify({
            type: 'login-failed',
            reason: 'Username is not type of string',
        }));
    }

    if (username.length > MAX_USERNAME_LENGTH) {
        return socket.send(JSON.stringify({
            type: 'login-failed',
            reason: `Username is too long: max ${MAX_USERNAME_LENGTH} characters`,
        }));
    }

    const playerData = {
        id: generatePlayerID(),
        username: data.username || 'Anon',
        position: generatePlayerPosition() || { x: 4, y: 1009, z: 1232 }, // to drugie to środek mapy, jest też w spawnpointach
        rotation: { x: 0, y: 0, z: 0 },
        stats: { kills: 0, deaths: 0, assists: 0 },
        connected: true,
        isAlive: true,
        hp: 100,
    }

    ids.set(socket, playerData.id);
    sockets.set(playerData.id, socket);
    Players.addPlayer(playerData.id, playerData);

    console.log(`Gracz ${playerData.username} połączył się`);

    const others = Players.getAllPlayers().filter(p => p.id !== playerData.id);
    const othersFiltered = others.map((o) => {
        return {
            id: o.id,
            username: o.username,
            position: o.position,
            rotation: o.rotation,
            stats: o.stats,
            connected: o.connected,
            isAlive: o.isAlive,
            hp: o.hp
        }
    })

    socket.send(JSON.stringify({
        type: 'login-success',
        player: playerData,
        othersFiltered
    }));

    broadcastExcept(socket, { type: 'user-joined', player: playerData.username }, wss);
})

bus.on('disconnect', (ws) => {
    const id = ids.get(ws);
    if (!id) return;

    const player = Players.getPlayer(id);
    if (!player) return;

    player.connected = false;

    console.log(`Gracz ${player.username} rozłączył się`);
    console.log(Players.getAllPlayers());


    player.disconnectTimeout = setTimeout(() => {
        const stillDisconnected = !player.connected;
        if (stillDisconnected || !player) {
            Players.deletePlayer(id);
            // usunięcie powiązania socket-id
            ids.forEach((pid, s) => { if (pid === id) ids.delete(s); });
            // ids.delete(ws);
            sockets.delete(id);
            console.log(`Gracz ${player.username} usunięty po braku reconnect`);
        }
    }, MAX_DISCONNECT_TIME);
})

bus.on('reconnect', (data, ws, wss) => {
    const player = Players.getPlayer(data.playerID);

    if (!player) {
        return ws.send(JSON.stringify({
            type: 'reconnect-failed',
            reason: `Przekroczono limit czasu ponownego połączenia`,
        }));
    }

    if (player.disconnectTimeout) {
        clearTimeout(player.disconnectTimeout);
        player.disconnectTimeout = null;
    }

    player.connected = true;
    console.log(`Gracz ${player.username} połączył się ponownie`);
    ids.set(ws, player.id);
    sockets.set(player.id, ws);

    const others = Players.getAllPlayers().filter(p => p.id !== ids.get(ws));
    const othersFiltered = others.map((o) => {
        return {
            id: o.id,
            username: o.username,
            position: o.position,
            rotation: o.rotation,
            stats: o.stats,
            connected: o.connected,
            isAlive: o.isAlive,
            hp: o.hp
            // pomijamy setinterval
        }
    })

    ws.send(JSON.stringify({
        type: 'login-success',
        player: player,
        othersFiltered
    }));

    broadcastExcept(ws, { type: 'user-joined', player: player.username }, wss);
})

bus.on('showStats', (data, socket, wss) => {
    const stats = Players.getAllPlayers().map((player) => {
        return { username: player.username, stats: player.stats };
    });

    stats.sort((a, b) => b.stats.kills - a.stats.kills);

    console.log(stats);

    socket.send(JSON.stringify({
        type: 'stats-success',
        stats
    }))
});

bus.on('socket:sendPosition', (data, socket, wss) => {
    // pass
});

function broadcastExcept(excluded, msg, wss) {
    for (const client of wss.clients) {
        if (client !== excluded && client.readyState === 1) {
            client.send(JSON.stringify(msg));
        }
    }
}

function generatePlayerID() {
    return 'p' + Math.random().toString(36).slice(2, 11);
}

function generatePlayerPosition() {
    return spawnpoints.list[Math.floor(Math.random() * spawnpoints.list.length)];
}