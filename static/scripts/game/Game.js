import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export default class Game {
    bus;

    constructor(bus) {
        this.bus = bus;
        this.setBusEvents();
        this.clock = new THREE.Clock();

        this.rotationSpeed = Math.PI / 1080;
        // Współrzędna Y kamery, potrzebna do ruchu WASD (jak na razie na sztywno ustawiony ground level, potem będziemy jakoś to zmieniać dynamicznie)
        this.cameraHeight = 10;

        // Wysokość, o jaką gracz może maksymalnie skoczyć (do ustalenia)
        this.jumpHeight = 10;
    }

    setBusEvents = () => {
        this.bus.on("app:init", () => {
            console.log("klasa game gotowa");
            this.generateScene();
        })

        // Odbiór informacji o wciśniętym bądź zwolnionym przycisku
        this.bus.on("movementController:keyPress", (data) => {
            this.moveForward = data.moveForward;
            this.moveLeft = data.moveLeft;
            this.moveBackward = data.moveBackward;
            this.moveRight = data.moveRight;
        })

        // Odbiór informacji o ruchu myszką i zmiana ustawienia kamery poprzez zastosowanie kwaternionu
        this.bus.on("movementController:mouseMove", (data) => {
            this.euler.y -= data.movementX * this.rotationSpeed;
            this.euler.x -= data.movementY * this.rotationSpeed;
            this.euler.x = Math.min(Math.max(this.euler.x, -1.57079633), 1.57079633);
            // console.log(this.euler.x, this.euler.y)

            this.camera.quaternion.setFromEuler(this.euler);
        })

        // Odbiór informacji o kliknięciu lub zwolnieniu lewego lub prawego przycisku myszy
        this.bus.on("movementController:mouseClick", (data) => {
            this.mouseLeft = data.mouseLeft;
            this.mouseRight = data.mouseRight;
        })

        // Odbiór informacji o skoku
        this.bus.on("movementController:jump", () => {
            this.jumpHandle(true);
        })
    }

    // Generowanie sceny
    generateScene = () => {
        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(
            45,    // kąt patrzenia kamery (FOV - field of view)
            screen.width / screen.height,    // proporcje widoku, powinny odpowiadać proporcjom ekranu przeglądarki użytkownika
            0.1,    // minimalna renderowana odległość
            10000    // maksymalna renderowana odległość od kamery
        );
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setClearColor(0x0066ff);
        this.renderer.setSize(screen.width, screen.height);
        document.getElementById("root").append(this.renderer.domElement);
        // this.camera.position.x = -200;
        // this.camera.position.y = 200;
        // this.camera.position.z = 200;
        this.camera.position.set(0, this.cameraHeight, 60);

        // nakierowanie kamery na punkt (0,0,0) w przestrzeni (zakładamy, że istnieje już scena)
        this.camera.lookAt(this.scene.position);

        this.euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');

        const ambientLight = new THREE.AmbientLight(0xffffff, 1);
        this.scene.add(ambientLight);

        // Generowanie przykładowego elementu
        // Geometria: szerokość, wysokość, głębokość
        this.geometry = new THREE.BoxGeometry(100, 10, 20);
        this.material = new THREE.MeshBasicMaterial({ color: 0x00ff00, });
        this.cube = new THREE.Mesh(this.geometry, this.material);
        // this.scene.add(this.cube);


        // Poniżej wczytanie mapy i modelu gracza
        // Przenieś to sobie, Igor

        // this.collisionMeshes = [];

        // const loader = new GLTFLoader();
        // loader.load(
        //     '../models/dust2_map.glb',
        //     (glb) => {
        //         console.log(glb);
        //         // czynnik skali, do zastanowienia, czy w ogóle
        //         // może lepiej zmniejszyć wszystko pozostałe
        //         const scaleFactor = 1;
        //         this.model = glb.scene;

        //         // 1008 i 1232 to współrzędne mapy XD tak jakoś dziwnie ten model jest 
        //         this.model.position.set(0, scaleFactor * -1008, scaleFactor * -1232);
        //         this.model.scale.set(scaleFactor, scaleFactor, scaleFactor);
        //         console.log(this.camera.position, this.model.position);

        //         // załadowanie ścian modelu mapy?
        //         glb.scene.traverse((child) => {
        //             if (child.isMesh) {
        //                 this.collisionMeshes.push(child);
        //                 // (Opcjonalnie) wyłącz cienie lub inne efekty
        //             }
        //         });

        //         this.scene.add(this.model);
        //     },
        //     function (xhr) {
        //         console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
        //     },
        //     function (error) {
        //         console.log("An error happened:", error);
        //     }
        // )

        // loader.load(
        //     '../models/player.glb',
        //     (glb) => {
        //         console.log(glb);
        //         this.model = glb.scene;
        //         console.log(this.camera.position, this.model.position);

        //         glb.scene.traverse((child) => {
        //             if (child.isMesh) {
        //                 this.collisionMeshes.push(child);
        //                 // (Opcjonalnie) wyłącz cienie lub inne efekty
        //             }
        //         });

        //         this.scene.add(this.model);
        //     },
        //     function (xhr) {
        //         console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
        //     },
        //     function (error) {
        //         console.log("An error happened:", error);
        //     }
        // )
        // 



        // Generowanie podłogi
        // this.floorGeometry = new THREE.PlaneGeometry(10000, 10000, 1, 1);
        // this.floorMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc });
        // this.floor = new THREE.Mesh(this.floorGeometry, this.floorMaterial)
        // this.floor.material.side = THREE.DoubleSide
        // this.floor.rotation.x = 90 * Math.PI / 180
        // this.scene.add(this.floor)

        // Pomocnicze osie - można zakomentować/odkomentować (czerwona: x, żółta: y, niebieska: z)
        this.axes = new THREE.AxesHelper(1000)
        this.scene.add(this.axes)

        this.render();
    }

    // Funkcja render, wywołująca się cały czas
    render = () => {
        // this.cube.rotation.x += 0.01;
        // this.cube.rotation.y += 0.01;

        //w tym miejscu ustalamy wszelkie zmiany w projekcie (obrót, skalę, położenie obiektów)
        //np zmieniająca się wartość rotacji obiektu

        //wykonywanie funkcji bez końca, ok 60 fps jeśli pozwala na to wydajność maszyny
        requestAnimationFrame(this.render);
        const speed = 1;
        // Ruch kamery na podstawie naciśniętych przycisków
        if (this.moveForward) {
            // camera.translateZ(-moveSpeed * delta);
            this.camera.translateZ(-speed);
            this.camera.position.y = this.cameraHeight;
        }
        if (this.moveBackward) {
            // camera.translateZ(moveSpeed * delta);
            this.camera.translateZ(speed);
            this.camera.position.y = this.cameraHeight;
        }
        if (this.moveLeft) {
            // camera.translateX(-moveSpeed * delta);
            this.camera.translateX(-speed);
            this.camera.position.y = this.cameraHeight;
        }
        if (this.moveRight) {
            // camera.translateX(moveSpeed * delta);
            this.camera.translateX(speed);
            this.camera.position.y = this.cameraHeight;
        }

        //ciągłe renderowanie / wyświetlanie widoku sceny naszą kamerą
        // if (this.model) {
        //     this.model.position.y -= 0.5;
        // }
        this.renderer.render(this.scene, this.camera);
    }

    // Funkcja obliczająca prędkość gracza w osi Y w trakcie skoku (potem też prawdopodobnie w trakcie swobodnego opadania)
    // Zmienna hasJumped będzie stosowana aby odróżnić czy gracz właśnie skoczył czy zeskoczył z czegoś bez wciskania spacji
    jumpHandle = (hasJumped) => {
        // Jutro nad tym siądę, nie mam dzisiaj pomysłu
        // if (hasJumped) {
        //     while (this.camera.position.y < this.cameraHeight + this.jumpHeight) {
        //         this.camera.position.y += this.jumpVelocity;
        //         console.log(this.camera.position.y)
        //     }
        // }
    }
}