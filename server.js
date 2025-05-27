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