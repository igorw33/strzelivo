export default class Net {
    socket;
    bus;
    MIN_STATS_REQUEST_TIME = 1000;
    // na serwerze jest ruter, tu będzie odwrotność
    // jeżeli klient wysyła dane:
    // używa metody send(TYP!!!, dane) -> dane lecą na serwer -> tam są odbierane, wykonywana jest metoda z handlers(data.type)

    // jeżeli serwer wysyła dane:
    // dane będą broadcastowane do wszystkich -> klienci dostosowują grafikę do danych

    // dla płynności, część kolizji może być obliczana u klienta w sumie, ale serwer wydaje ostateczną decyzję


    socketHandlers = {
        'init': (data) => {
            console.log(data);
            /* this.bus.emit(`net:${data.type}`)... */
        },

        'login-success': (data) => {
            // data => {type, player, other};
            // zachowanie id gracza na wypadek rozłączenia
            sessionStorage.setItem('playerID', data.player.id);
            console.log('połączono z serwerem');

            this.bus.emit(`net:${data.type}`, data);
        },

        'login-failed': (data) => {
            this.bus.emit(`net:${data.type}`, data);
            sessionStorage.removeItem('playerID');
        },

        'user-joined': (data) => {
            this.bus.emit('net:userJoined', data);
        },

        'user-disconnect': (data) => {
            // console.log(data);
            this.bus.emit('net:userDisconnect', data);
        },

        'stats-success': (data) => {
            this.lastStats = data;
            this.bus.emit('net:showStats', data);
        },

        'reconnect-failed': (data) => {
            console.log('nieudana próba ponownego połączenia: przekroczono czas');

            sessionStorage.removeItem('playerID');
        },

        // odebranie pozycji graczy
        'player-positions': (data) => {
            // dane mają format: data = {type:string, playerPositions:[{username, position}...]}

            // Wysyłamy do GAME'a dane:
            // [{username,position},...];
            // ale tylko te poza samym sobą
            const playerID = sessionStorage.getItem('playerID');
            const playersPositions = data.playersPositions.filter(p => p.id != playerID);

            this.bus.emit('net:updatePositions', playersPositions);
        },

        // Jakiś gracz się nie połączył po 10 sekundach, całkowite usunięcie go
        'user-remove': (data) => {
            this.bus.emit('net:playerRemove', data);
        }
    };

    constructor(url, bus) {
        this.socket = new WebSocket(url);
        this.bus = bus;
        this.setupSocket();
        this.setupBusEvents();
    }

    setupBusEvents = () => {
        // tu wszystkie this.bus.on(event, callbacks)
        let lastStatsFetch = 0;

        this.bus.on("app:init", () => {
            console.log("klasa net gotowa");
        });

        // ui emituje username nowego gracza
        // tutaj wysyłamy dane na serwer
        this.bus.on("ui:login", (data) => {
            // zapis username'a na potrzeby różne
            this.username = data.username;
            this.send("login", data);
        });

        this.bus.on("game:sendPosition", (data) => {
            // Dane w formacie:
            // data = {position: {x,y,z}, rotation: {x,y,z}};
            const id = sessionStorage.getItem('playerID');

            // jeśli niezalogowany, wypad
            if (id == null) return;

            // Wysyłamy pozycję do serwera
            const position = { position: data.position, id: id, rotation: data.rotation };
            this.send("sendPosition", position);
        });

        this.bus.on("movementController:showStats", () => {
            const now = Date.now();

            // żeby nie szło zbyt dużo zapytań do serwera, to:
            if (now - lastStatsFetch > this.MIN_STATS_REQUEST_TIME || !this.lastStats) {
                this.send("showStats");
                lastStatsFetch = now;
            } else {
                this.bus.emit('net:showStats', this.lastStats);
            }
        });

        this.bus.on("game:shoot", (data) => {
            if (!data.targetPlayer) return;

            this.send('shoot', data);
        })
    }

    setupSocket = () => {
        this.socket.addEventListener("message", (event) => {
            let data = JSON.parse(event.data);
            if (this.socketHandlers[data.type]) {
                this.socketHandlers[data.type](data);
            } else {
                console.warn("Nieznany typ wiadomości:", data.type);
            }
        })

        this.socket.addEventListener("open", (event) => {
            // wychodzi na to, że socket potrzebuje mniej więcej 300ms od otwarcia strony, żeby się połączyć
            // console.log("czas połączenia:", event.timeStamp);
            console.log("socket się połączył");
            const id = sessionStorage.getItem('playerID');


            if (id != 'undefined' && id != undefined) {
                console.log('próba ponownego łączenia...');
                this.send("reconnect", { playerID: id });
            }
        })
    }

    send = (type, payload = {}) => {
        const msg = JSON.stringify({ type, ...payload });
        this.socket.send(msg);
    }
}