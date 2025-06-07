export default class MovementController {
    bus;

    constructor(bus) {
        this.bus = bus;
        this.setBusEvents();

        // Inicjacja zmiennych, w których przechowywany jest stan naciśnięcia przycisków oraz położenia myszy
        this.moveForward = false;
        this.moveLeft = false;
        this.moveBackward = false;
        this.moveRight = false;
        this.mouseLeftClick = false;
        this.mouseRightClick = false;
        this.tabPressed = false;
        this.jumped = false;

        // Mapowanie przycisków do nazw zmiennych
        this.keyMap = {
            w: 'moveForward',
            a: 'moveLeft',
            s: 'moveBackward',
            d: 'moveRight',
            escape: 'release',
            p: 'lock',
            tab: 'stats',
            ' ': 'jump'
        };
    }

    setBusEvents = () => {

        this.bus.on("app:init", () => {
            console.log("klasa movementController gotowa");

            // Listenery kolejno wykrywające naciśnięcie przycisku i jego zwolnienie
            document.addEventListener('keydown', (event) => {
                const action = this.keyMap[event.key.toLowerCase()];

                if (action == "stats") {
                    this.tabPressed = true;
                    this.bus.emit('movementController:showStats');
                    event.preventDefault();
                    return;
                }
                if (action == "jump" && this.jumped == false) {
                    this.jumped = true;
                    this.bus.emit('movementController:jump');
                    return;
                }

                if (action) {
                    // Blokowanie kursora przy naciśnięcu klawisza p, odblokowanie przy naciśnięciu escape
                    if (action == "release") {
                        document.exitPointerLock();
                    } else if (action == "lock") {
                        document.body.requestPointerLock();
                    } else {
                        this[action] = true;

                        const data = {
                            moveForward: this.moveForward,
                            moveLeft: this.moveLeft,
                            moveRight: this.moveRight,
                            moveBackward: this.moveBackward
                        };
                        // Wysłanie info o przyciskach do Game.js
                        this.bus.emit("movementController:keyPress", data);
                    }
                };
            });

            document.addEventListener('keyup', (event) => {
                const action = this.keyMap[event.key.toLowerCase()];

                if (action == "stats") {
                    this.tabPressed = false;
                    this.bus.emit("movementController:hideStats");
                    event.preventDefault();
                    return;
                }

                if (action == "jump" && this.jumped == true) {
                    this.jumped = false;
                    return;
                }

                if (action) {
                    this[action] = false;

                    const data = {
                        moveForward: this.moveForward,
                        moveLeft: this.moveLeft,
                        moveRight: this.moveRight,
                        moveBackward: this.moveBackward
                    };
                    // Wysłanie info o przyciskach do Game.js
                    this.bus.emit("movementController:keyPress", data);
                }
            });

            // Śledzenie ruchów kursora (konieczne do obracania kamerą)
            document.addEventListener("mousemove", (event) => {
                if (document.pointerLockElement) {
                    const data = { movementX: event.movementX, movementY: event.movementY };
                    this.bus.emit("movementController:mouseMove", data);
                }
            });

            // Wykrywanie LPM i PPMs
            document.addEventListener("mousedown", (event) => {
                if (event.button == 0) {
                    this.mouseLeftClick = true;
                    const data = { mouseLeft: this.mouseLeftClick, mouseRight: this.mouseRightClick };
                    this.bus.emit("movementController:mouseClick", data);
                } else if (event.button == 2) {
                    this.mouseRightClick = true;
                    const data = { mouseLeft: this.mouseLeftClick, mouseRight: this.mouseRightClick };
                    this.bus.emit("movementController:mouseClick", data);
                }
            });

            document.addEventListener("mouseup", (event) => {
                if (event.button == 0) {
                    this.mouseLeftClick = false;
                    const data = { mouseLeft: this.mouseLeftClick, mouseRight: this.mouseRightClick };
                    this.bus.emit("movementController:mouseClick", data);
                } else if (event.button == 2) {
                    this.mouseRightClick = false;
                    const data = { mouseLeft: this.mouseLeftClick, mouseRight: this.mouseRightClick };
                    this.bus.emit("movementController:mouseClick", data);
                }
            });

            // Blokowanie menu dla PPM
            document.addEventListener("contextmenu", (event) => {
                event.preventDefault();
            })


        })
    }
}