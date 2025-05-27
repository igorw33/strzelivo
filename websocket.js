const WebSocket = require('ws');

// prosty routing socketowy
const handlers = {

}

const setupWebSocket = (server) => {
    const wss = new WebSocket.Server({ server });
    wss.on('connection', (ws) => {
        // console.log("new connection:", ws);

        ws.on('message', (msg) => {
            // msg jest buforem hexowym, trzeba go sparsować do json-a
            const data = JSON.parse(msg);
            console.log(data);
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