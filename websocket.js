const WebSocket = require('ws');

// prosty routing socketowy
const handlers = {
    'init': (ws, data) => {
        /* tu wstaw funkcję, która waliduje dane gracza i rejestruje go w bazie */
        console.log(data);
        // data = {
        //     type: 'spawn',
        //     player: 'dxddd'
        // }
        // ws.send(JSON.stringify(data));
    },

    'position': (ws, data) => {/* tu wstaw funkcję, która update'uje pozycję gracza */
        console.log(data);
    },
}

const setupWebSocket = (server) => {
    const wss = new WebSocket.Server({ server });
    wss.on('connection', (ws) => {
        ws.on('message', (msg) => {
            // msg jest buforem hexowym, trzeba go sparsować do json-a
            const data = JSON.parse(msg);
            handlers[data.type](ws, data);
        })
    })
    /*
    data.type to mniej więcej to samo co endpoint w REST API
    
    1. każdy klient przesyła info o swojej pozycji, przydałoby się co 50ms pewnie
    data.type = 'position'
    2. 
    */
}

module.exports = { setupWebSocket };