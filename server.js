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

// mapa <część ciała, hp>
const bodyPartToHP = new Map();
bodyPartToHP.set('head', 100);
bodyPartToHP.set('body', 20);
bodyPartToHP.set('legs', 10);

// mapa socketów graczy: <playerID, socket>
const sockets = new Map();
// mapa odwrotna: <socket,id>
const ids = new Map();

const MAX_USERNAME_LENGTH = 30;
const MAX_DISCONNECT_TIME = 10000; // ms
const POSITION_UPDATE_INTERVAL = 50; //ms
const MAX_PLAYERS_COUNT = 30;
const RESPAWN_TIME = 1000; //ms

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

    if (Players.getAllPlayers().length >= MAX_PLAYERS_COUNT) {
        return socket.send(JSON.stringify({
            type: 'login-failed',
            reason: `Maksymalna liczba graczy na serwerze`,
        }));
    }

    const playerData = {
        id: generatePlayerID(),
        username: data.username || generateAnonName(),
        position: generatePlayerPosition() || { x: 4, y: 1009, z: 1232 }, // to drugie to środek mapy, jest też w spawnpointach
        rotation: { x: 0, y: 0, z: 0 },
        stats: { kills: 0, deaths: 0, assists: 0 },
        connected: true,
        isAlive: true,
        hp: 100,
        attackers: [],
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
            hp: o.hp,
            attackers: o.attackers
        }
    })

    socket.send(JSON.stringify({
        type: 'login-success',
        player: playerData,
        othersFiltered
    }));

    broadcastExcept(socket, { type: 'user-joined', player: playerData.username, position: playerData.position, id: playerData.id, rotation: playerData.rotation }, wss);
})

bus.on('disconnect', (ws) => {
    const id = ids.get(ws);
    if (!id) return;

    const player = Players.getPlayer(id);
    if (!player) return;

    player.connected = false;

    console.log(`Gracz ${player.username} rozłączył się`);
    // console.log(Players.getAllPlayers());


    player.disconnectTimeout = setTimeout(() => {
        const stillDisconnected = !player.connected;
        if (stillDisconnected || !player) {
            Players.deletePlayer(id);
            // usunięcie powiązania socket-id
            ids.forEach((pid, s) => { if (pid === id) ids.delete(s); });
            // ids.delete(ws);
            sockets.delete(id);
            console.log(`Gracz ${player.username} usunięty po braku reconnect`);

            const allSockets = Array.from(sockets.values());
            broadcast({ type: 'user-remove', id: id }, allSockets);
        }
    }, MAX_DISCONNECT_TIME);

    broadcastExcept(ws, { type: 'user-disconnect', player: player.username, id: player.id }, { clients: Array.from(sockets.values()) });
})

bus.on('reconnect', (data, ws, wss) => {
    const player = Players.getPlayer(data.playerID);

    if (!player) {
        ws.send(JSON.stringify({
            type: 'reconnect-failed',
            reason: `Przekroczono limit czasu ponownego połączenia`,
        }));

        // broadcastExcept(ws, {
        //     type: 'player-remove',
        //     id: data.playerID,
        // }, wss);

        return;
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
            hp: o.hp,
            attackers: o.attackers
            // pomijamy setinterval, bo generuje problemy cirkulacji XD
        }
    })

    ws.send(JSON.stringify({
        type: 'login-success',
        player: player,
        othersFiltered
    }));

    broadcastExcept(ws, { type: 'user-joined', player: player.username, position: player.position, id: player.id, rotation: player.rotation }, wss);
})

bus.on('showStats', (data, socket, wss) => {
    const stats = Players.getAllPlayers().map((player) => {
        return { username: player.username, stats: player.stats };
    });

    stats.sort((a, b) => b.stats.kills - a.stats.kills);

    // console.log(stats);

    socket.send(JSON.stringify({
        type: 'stats-success',
        stats
    }))
});

bus.on('sendPosition', (data, socket, wss) => {
    // data => {id, position:{x,y,z}}
    const id = data.id;
    const player = Players.getPlayer(id);
    // console.log("nowa pozycja gracza:", data.position);
    // console.log("stara pozycja gracza", player.position);

    // tu ewentualnie sprawdzanie, czy gracz nie chodzi zbyt szybko

    player.position = data.position;
    player.rotation = data.rotation;
});


// wysyłanie pozycji wszystkich graczy co POSITION_UPDATE_INTERVAL milisekund
const positionInterval = setInterval(() => {
    // robimy tablicę socketów
    const wss = Array.from(sockets.values());

    // wyciągamy potrzebne dane
    const playersPositions = Players.getAllPlayers().map((p) => {
        return { username: p.username, position: p.position, id: p.id, rotation: p.rotation, isAlive: p.isAlive };
    });

    // ewentualnie tutaj jakieś filtrowanie pozycji, które nie powinny być wysyłane (bo są za daleko i niemożliwe do zobaczenia)
    // ale na razie nie :(

    broadcast({ type: 'player-positions', playersPositions }, wss);
}, POSITION_UPDATE_INTERVAL);

bus.on('shoot', (data, socket, wss) => {
    const targetPlayer = Players.getPlayer(data.targetPlayer);
    const attacker = Players.getPlayer(data.id);

    // targetPlayer.hp -= bodyPartToHP.get(data.bodyPart) - Math.random() * 5;
    targetPlayer.hp -= bodyPartToHP.get(data.bodyPart);

    const assists = targetPlayer.attackers;

    // jeśli nie ma w liście asystujących, dodaj asystującego
    if (!assists.find(p => p == attacker.id)) {
        assists.push(attacker.id);
    }

    if (targetPlayer.hp <= 0) {
        targetPlayer.hp = 0;
        targetPlayer.stats.deaths++;
        targetPlayer.isAlive = false;

        attacker.stats.kills++;

        let assistantName = null;
        if (assists.length > 1) {
            // asysta to pierwszy gracz z assists, który nie jest zabójcą
            const assistantId = assists.find(a => a !== attacker.id);
            if (assistantId) {
                const assistant = Players.getPlayer(assistantId);
                if (assistant) {
                    assistant.stats.assists++;
                    assistantName = assistant.username;
                }
            }
        }

        // czyszczenie pamięci asystujących
        targetPlayer.attackers = [];

        // dwa broadcasty jeden cel XD
        broadcast({
            type: 'player-killed',
            attacker: attacker.username,
            killed: targetPlayer.username,
            killed_id: targetPlayer.id,
            attacker_id: attacker.id,
            assistants: assists
        }, wss.clients);

        // POWIADOMIENIE O ZABÓJSTWIE
        broadcast({
            type: 'kill-feed',
            killer: attacker.username,
            victim: targetPlayer.username,
            assist: assistantName // string lub null
        }, Array.from(sockets.values()));

        setTimeout(() => {
            // Resetowanie wartości gracza
            targetPlayer.hp = 100;
            targetPlayer.isAlive = true;
            targetPlayer.position = generatePlayerPosition() || { x: 4, y: 1009, z: 1232 };
            targetPlayer.rotation = { x: 0, y: 0, z: 0 };

            broadcast({
                type: 'player-respawned',
                id: targetPlayer.id,
                username: targetPlayer.username,
                hp: targetPlayer.hp,
                newPosition: targetPlayer.position
            }, wss.clients);
        }, RESPAWN_TIME);

    }

    sockets.get(data.targetPlayer).send(JSON.stringify({
        type: 'hp',
        hp: targetPlayer.hp
    }))

})

bus.on('footstep', (data, socket, wss) => {
    // console.log('footstep from', data.id, 'at', data.position);

    const senderId = data.id;
    const senderPlayer = Players.getPlayer(senderId);
    if (!senderPlayer) return;

    // Wyślij tylko do graczy w zasięgu 20 jednostek
    Players.getAllPlayers().forEach(player => {
        if (player.id === senderId) return; // nie wysyłaj do siebie

        // Oblicz dystans
        const dx = player.position.x - data.position.x;
        const dy = player.position.y - data.position.y;
        const dz = player.position.z - data.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist <= 8) {
            const targetSocket = sockets.get(player.id);
            if (targetSocket && targetSocket.readyState === 1) {
                targetSocket.send(JSON.stringify({
                    type: 'footstep',
                    id: senderId,
                    position: data.position
                }));
            }
        }
    });
});

bus.on('shoot-sound', (data, socket, wss) => {
    const senderId = data.id;
    const senderPlayer = Players.getPlayer(senderId);
    if (!senderPlayer) return;

    Players.getAllPlayers().forEach(player => {
        if (player.id === senderId) return; // nie wysyłaj do siebie

        const dx = player.position.x - data.position.x;
        const dy = player.position.y - data.position.y;
        const dz = player.position.z - data.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist <= 15) { 
            const targetSocket = sockets.get(player.id);
            if (targetSocket && targetSocket.readyState === 1) {
                targetSocket.send(JSON.stringify({
                    type: 'shoot-sound',
                    id: senderId,
                    position: data.position
                }));
            }
        }
    });
});


function broadcastExcept(excluded, msg, wss) {
    for (const client of wss.clients) {
        if (client !== excluded && client.readyState === 1) {
            client.send(JSON.stringify(msg));
        }
    }
}

function broadcast(msg, wss) {
    // if (wss.length < 2) {
    // nie ma sensu broadcastować dla single playera
    // return;
    // }

    for (const client of wss) {
        client.send(JSON.stringify(msg));
    }
}

function generatePlayerID() {
    return 'p' + Math.random().toString(36).slice(2, 11);
}

function generateAnonName() {
    return 'Anon' + Math.random().toString(36).slice(2, 11);
}

function generatePlayerPosition() {
    const players = Players.getAllPlayers();
    const spawns = spawnpoints.list;

    // jeśli 0 graczy, losowy spawnpoint
    if (players.length === 0) {
        return spawns[Math.floor(Math.random() * spawns.length)];
    }

    // jeśli więcej graczy:
    // wybieranie spawnpointu, w okolicy którego jest najmniej graczy
    // liczymy sumę odległości graczy od spawna
    // wybieramy spawn o największej sumie
    let mostDistant = spawns[0];
    let maxDistance = 0;
    for (const spawn of spawns) {
        let distance = 0;

        // Obliczanie sumy dystansów spawnpoint-players
        for (const player of players) {
            const playerPosition = player.position;
            distance += Math.sqrt(Math.pow((playerPosition.x - spawn.x), 2) + Math.pow((playerPosition.y - spawn.y), 2) + Math.pow((playerPosition.z - spawn.z), 2));
        }

        // Aktualizacja najdalszego spawna
        if (maxDistance < distance) {
            maxDistance = distance;
            mostDistant = spawn;
        }
    }

    return mostDistant;
}