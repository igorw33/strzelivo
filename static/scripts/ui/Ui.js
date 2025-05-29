export default class Ui {
    bus;

    constructor(bus) {
        this.bus = bus;
        this.setBusEvents();
    }

    setBusEvents = () => {
        this.bus.on("app:init", () => {
            console.log("klasa ui gotowa");
        })
    }
}