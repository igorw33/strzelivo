export default class Ui {
    bus;

    constructor(bus) {
        this.bus = bus;
        this.setBusEvents();
        this.createLoginScreen();
        this.displayLoginScreen();
    }

    setBusEvents = () => {
        // odpowiedzi na zdarzenia z różnych klas

        this.bus.on("app:init", () => {
            console.log("klasa ui gotowa");
        });

        this.bus.on("net:login-success", (data) => {
            this.createHUD(data);

            this.hideLoginScreen();

            // emit do odpalenia kontroli kamery
            this.bus.emit("ui:hideLogin");
        });


        this.bus.on("net:login-failed", (data) => {
            this.displayLoginFailReason(data.reason);
        });
    }

    // LOGIN SCREEN
    hideLoginScreen = () => {
        this.container.classList.remove('login-container');
        this.container.classList.add('login-container-off');
    }

    displayLoginScreen = () => {
        this.container.classList.remove('login-container-off');
        this.container.classList.add('login-container');
    }

    createLoginScreen = () => {
        this.container = document.createElement("div");
        this.container.id = 'login-container';

        const input = document.createElement('input');
        input.id = "username-input";
        input.type = "text";
        input.placeholder = 'username';
        input.classList.add('username-input');
        this.container.append(input);

        this.container.addEventListener("keydown", (event) => {
            if (event.key.toLowerCase() == 'enter') {
                this.bus.emit('ui:login', { username: input.value })
            }
        })

        document.body.appendChild(this.container);
    }

    sendUserData = () => {
        const input = document.getElementById("username-input");
        const username = input.value;
        this.bus.emit("ui:login", { username: username });
    }

    displayLoginFailReason = (reason) => {
        const reasonElement = document.createElement("div");
        reasonElement.innerHTML = reason;
        this.container.appendChild(reasonElement);
    }

    // HUD
    createHUD = (playerData) => {
        // pasek górny: username
        // pasek dolny: hp, minimapa?


        // trzymasz tab -> staty
    }


    // STATY
}