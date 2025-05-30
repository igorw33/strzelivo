export default class Net {
    socket;
    bus;
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
            // zachowanie id gracza na wypadek rozłączenia
            console.log(data);

            localStorage.setItem('playerID', data.player.id);

            this.bus.emit(`net:${data.type}`, data);
        },

        'login-failed': (data) => {
            this.bus.emit(`net:${data.type}`, data);
        },

        'user-joined': (data) => {
            console.log(data);
        },

        'reconnect-failed': (data) => {
            console.log('nieudana próba ponownego połączenia: przekroczono czas');

            localStorage.removeItem('playerID');
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

        this.bus.on("app:init", () => {
            console.log("klasa net gotowa");
        });

        // ui emituje username nowego gracza
        // tutaj wysyłamy dane na serwer
        this.bus.on("ui:login", (data) => {
            this.send("login", data);
        });

        this.bus.on("game:sendPosition", (data) => {
            this.send("sendPosition", data);
        });
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
            const id = localStorage.getItem('playerID');


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