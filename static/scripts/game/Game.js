import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export default class Game {
    bus;

    constructor(bus) {
        this.bus = bus;
        this.setBusEvents();
        this.clock = new THREE.Clock();

        this.rotationSpeed = Math.PI / 1500;
        // Ile Y nad podłogą jest kamera
        this.cameraHeight = 0.5;
        // Startowa wysokość kamery
        this.currentCam = 1009;

        // Wysokość, o jaką gracz może maksymalnie skoczyć (do ustalenia)
        this.jumpHeight = 1;

        // Czy gracz jest na ziemi
        this.onGround = true;
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
            this.euler.x = Math.min(Math.max(this.euler.x, -1.55334303), 1.55334303);
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
            90,    // kąt patrzenia kamery (FOV - field of view)
            screen.width / screen.height,    // proporcje widoku, powinny odpowiadać proporcjom ekranu przeglądarki użytkownika
            0.1,    // minimalna renderowana odległość
            10000    // maksymalna renderowana odległość od kamery
        );
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setClearColor(0x0066ff);
        this.renderer.setSize(screen.width, screen.height);
        document.getElementById("root").append(this.renderer.domElement);
        this.camera.position.set(4, this.currentCam, 1230);

        // nakierowanie kamery na punkt (0,0,0) w przestrzeni (zakładamy, że istnieje już scena)
        //this.camera.lookAt(this.scene.position);

        this.euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');

        // Tworzenie raycastera, który patrzy "w dół" od kamery gracza (new THREE.Vector3( 0, - 1, 0 ))
        // Detekcja obiektów, które są od 0 do tyle unitów, ile ustawiłem w this.cameraHeight od niego
        this.raycaster = new THREE.Raycaster(new THREE.Vector3(this.camera.position), new THREE.Vector3(0, - 1, 0), 0, this.cameraHeight);

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

        this.collisionMeshes = [];

        const loader = new GLTFLoader();
        loader.load(
            '../models/dust2_map.glb',
            (glb) => {
                console.log(glb);
                // czynnik skali, do zastanowienia, czy w ogóle
                // może lepiej zmniejszyć wszystko pozostałe
                const scaleFactor = 1;
                this.model = glb.scene;

                // 1008 i 1232 to współrzędne mapy XD tak jakoś dziwnie ten model jest
                // Zostawmy linijkę tą zakomentowaną i działajmy na tych dziwnych kordach
                // Nie umiem zrobić żeby meshe działały na zmienionych kordach
                // this.model.position.set(0, scaleFactor * -1008, scaleFactor * -1232);
                this.model.scale.set(scaleFactor, scaleFactor, scaleFactor);
                console.log(this.camera.position, this.model.position);

                // załadowanie ścian modelu mapy?
                glb.scene.traverse((child) => {
                    if (child.isMesh) {
                        this.collisionMeshes.push(child);
                        // (Opcjonalnie) wyłącz cienie lub inne efekty
                    }
                });

                this.scene.add(this.model);
            },
            function (xhr) {
                console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
            },
            function (error) {
                console.log("An error happened:", error);
            }
        )

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
        // Zmiana pozycji raycastera na pozycję kamery
        this.raycaster.ray.origin.copy(this.camera.position);
        this.raycaster.ray.origin.y -= this.cameraHeight;

        // Sprawdzenie czy gracz na czymś stoi
        const intersections = this.raycaster.intersectObjects(this.collisionMeshes, false);
        const onObject = intersections.length > 0;

        // Jak stoi to ok, jak nie to "spada" - do poprawy, na razie jest hardcoded -0.025 ale będzie bardziej "fizycznie"
        if (onObject) {
            console.log('On ground');
            if (!this.onGround) {
                this.onGround = true;
            }
        } else {
            console.log('In air');
            this.camera.position.y -= 0.025;
            this.currentCam = this.camera.position.y;
            if (this.onGround) {
                this.onGround = false;
            }
        }

        //wykonywanie funkcji bez końca, ok 60 fps jeśli pozwala na to wydajność maszyny
        requestAnimationFrame(this.render);

        let speed = 0.08;
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        direction.y = 0;
        direction.normalize();
        // Ruch kamery na podstawie naciśniętych przycisków
        if ((this.moveForward && this.moveLeft) || (this.moveForward && this.moveRight) || (this.moveBackward && this.moveLeft) || (this.moveBackward && this.moveRight)) {
            speed = speed / Math.sqrt(2);
        }
        if (this.moveForward) {
            // camera.translateZ(-moveSpeed * delta);
            this.camera.position.addScaledVector(direction, speed);
        }
        if (this.moveBackward) {
            // camera.translateZ(moveSpeed * delta);
            this.camera.position.addScaledVector(direction, -speed);
        }

        const strafeDirection = new THREE.Vector3();
        strafeDirection.crossVectors(this.camera.up, direction).normalize();
        if (this.moveLeft) {
            this.camera.position.addScaledVector(strafeDirection, speed);
        }
        if (this.moveRight) {
            this.camera.position.addScaledVector(strafeDirection, -speed);
        }

        this.camera.position.y = this.currentCam;

        this.renderer.render(this.scene, this.camera);
    }

    // Funkcja obliczająca prędkość gracza w osi Y w trakcie skoku (potem też prawdopodobnie w trakcie swobodnego opadania)
    // Zmienna hasJumped będzie stosowana aby odróżnić czy gracz właśnie skoczył czy zeskoczył z czegoś bez wciskania spacji
    // Na razie jest hardcoded wartość, ale będzie jakiś wzór na to
    jumpHandle = (hasJumped) => {
        if (this.onGround && hasJumped) {
            this.camera.position.y += this.jumpHeight;
        }
    }
}