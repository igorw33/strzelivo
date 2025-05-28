export default class Net {
    socket;
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

    constructor(url) {
        this.socket = new WebSocket(url);
        this.setupSocket();
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