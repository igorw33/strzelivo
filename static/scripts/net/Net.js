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
        'init': (data) => {/* inicjalizacja: dane o graczu */
            console.log("init");
        },
        'spawn': (data) => {
            console.log('spawn gracza');
        }
    };

    constructor(url, bus) {
        this.socket = new WebSocket(url);
        this.bus = bus;
        this.setupSocket();
        this.setupBusEvents();
    }

    setupBusEvents = () => {
        this.bus.on("app:init", () => {
            console.log("klasa net gotowa");
        });

        this.bus.on("game:event", (data) => {
            console.log(data);
        });
        // tu ustawiamy wszystkie this.bus.on(event, callbacks)
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
    }

    send = (type, payload = {}) => {
        const msg = JSON.stringify({ type, ...payload });
        this.socket.send(msg);
    }
}