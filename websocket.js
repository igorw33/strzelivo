const WebSocket = require('ws');

// moduł z EventBusem
const { bus } = require("./EventBus");

// prosty routing socketowy
// w zasadzie jest niepotrzebny, bo w każdym przypadku odpala event, który leci do serwera :)
// ale może dla przejrzystości...
const handlers = {
    'login': (wss, ws, data) => {
        bus.emit(data.type, data, ws, wss);
    },

    'reconnect': (wss, ws, data) => {
        console.log(data);
        bus.emit(data.type, data, ws, wss);
    },

    'sendPosition': (wss, ws, data) => {
        bus.emit(data.type, data, ws, wss);
    },
}

const setupWebSocket = (server) => {
    const wss = new WebSocket.Server({ server });
    wss.on('connection', (ws) => {
        ws.on('message', (msg) => {
            // msg jest buforem hexowym, trzeba go sparsować do json-a
            const data = JSON.parse(msg);
            handlers[data.type](wss, ws, data);

            // UWAGA! Poniższa linia załatwia sprawę bez handlerów
            // bus.emit(data.type, data, ws, wss);
        })

        ws.on('close', () => {
            bus.emit('disconnect', ws);
        })
    })
}
module.exports = { setupWebSocket };