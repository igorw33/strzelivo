import Ui from '../ui/Ui.js';
import Net from '../net/Net.js';
import Game from '../game/Game.js';
import EventBus from './EventBus.js';
import MovementController from '../game/MovementController.js';
import ModelController from '../game/ModelController.js';

export default class App {
    game;
    net;
    ui;
    bus;

    constructor() {
        this.bus = new EventBus();

        this.modelController = new ModelController(this.bus);
        this.game = new Game(this.bus);
        this.ui = new Ui(this.bus);
        this.movementController = new MovementController(this.bus);
        const host = window.location.hostname;
        this.net = new Net(`ws://${host}:3000`, this.bus);

        // wysyłamy zdarzenie do innych klas, 
        // każda klasa może na nie odpowiedzieć, jeśli ustawi event this.bus.on("app:init", callback)
        this.bus.emit("app:init");

        // const data = { type: "xd" };
        // this.bus.emit("game:event", data);
    }
}