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
        position: generatePlayerPosition() || { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        socket,
        connected: true,
        isAlive: true,
        hp: 100,
    }

    Players.addPlayer(playerData.id, playerData);
    console.log(`Gracz ${playerData.username} połączył się`);

    socket.send(JSON.stringify({
        type: 'login-success',
        player: playerData,
        others: Players.getAllPlayers().filter(p => p.socket !== socket)
    }));

    broadcastExcept(socket, { type: 'user-joined', player: playerData.username }, wss);
})

bus.on('disconnect', (ws) => {
    const player = Players.getAllPlayers().filter(p => p.socket == ws)[0];
    player.connected = false;

    console.log(`Gracz ${player.username} rozłączył się`);

    player.disconnectTimeout = setTimeout(() => {
        const stillDisconnected = !player.connected;
        if (stillDisconnected || !player) {
            Players.deletePlayer(player.id);
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

    player.socket = ws;
    player.connected = true;
    console.log(`Gracz ${player.username} połączył się ponownie`);

    ws.send(JSON.stringify({
        type: 'login-success',
        player: player,
        others: Players.getAllPlayers().filter(p => p.socket !== ws)
    }));

    broadcastExcept(ws, { type: 'user-joined', player: player.username }, wss);
})

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
    return null;
}