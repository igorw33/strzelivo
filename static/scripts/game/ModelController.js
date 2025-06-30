import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export default class ModelController {
    bus;

    constructor(bus) {
        this.bus = bus;
        this.setBusEvents();
        this.collisionMeshes = [];
        this.playerCollisionMeshes = [];
    }

    setBusEvents = () => {
        this.bus.on("app:init", () => {
            console.log("Klasa ModelController gotowa");
        })

        this.bus.on("game:loadMap", (data) => {
            this.mapLoad(data);
        })

        this.bus.on("game:loadModel", (data) => {
            this.modelLoad(data);
        })
    }

    mapLoad = (data) => {
        const loader = new GLTFLoader();

        loader.load(
            '../models/dust2_map.glb',
            (glb) => {
                // console.log(glb);
                // czynnik skali, do zastanowienia, czy w ogóle
                // może lepiej zmniejszyć wszystko pozostałe
                const scaleFactor = 1;
                this.model = glb.scene;

                // 1008 i 1232 to współrzędne mapy XD tak jakoś dziwnie ten model jest
                // Zostawmy linijkę tą zakomentowaną i działajmy na tych dziwnych kordach
                // Nie umiem zrobić żeby meshe działały na zmienionych kordach
                // this.model.position.set(0, scaleFactor * -1008, scaleFactor * -1232);
                this.model.scale.set(scaleFactor, scaleFactor, scaleFactor);

                // załadowanie ścian modelu mapy?
                glb.scene.traverse((child) => {
                    if (child.isMesh) {
                        this.collisionMeshes.push(child);
                        // (Opcjonalnie) wyłącz cienie lub inne efekty
                    }
                });

                data.scene.add(this.model);

                const dataToSend = {
                    collisionMeshes: this.collisionMeshes
                };
                this.bus.emit('modelController:sendMeshes', dataToSend);
            },
            function (xhr) {
                console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
            },
            function (error) {
                console.log("An error happened:", error);
            }
        )
    }

    modelLoad = (data) => {
        const loader = new GLTFLoader();

        loader.load(
            '../models/pd.glb',
            (glb) => {
                console.log(data)
                this.model = glb.scene;
                const scaleFactor = 0.15;

                this.model.scale.set(scaleFactor, scaleFactor, scaleFactor);
                this.model.position.set(data.playerData.position.x, data.playerData.position.y - 0.8, data.playerData.position.z);
                // console.log(this.camera.position, this.model.position);

                glb.scene.traverse((child) => {
                    if (child.isMesh) {
                        child.playerId = data.playerData.id;
                        // child.position.x = data.playerData.position.x;
                        // child.position.y = data.playerData.position.y - 0.8;
                        // child.position.z = data.playerData.position.z;
                        this.playerCollisionMeshes.push(child);
                    }

                });

                data.scene.add(this.model);

                console.log(this.playerCollisionMeshes.forEach(m => {
                    console.log(m);
                }))
                const dataToSend = {
                    collisionMeshes: this.playerCollisionMeshes
                };
                this.bus.emit('modelController:sendPlayerMeshes', dataToSend);
            },
            function (xhr) {
                console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
            },
            function (error) {
                console.log("An error happened:", error);
            }
        )

    }
}