import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export default class Game {
    bus;

    constructor(bus) {
        this.bus = bus;
        this.setBusEvents();
        this.clock = new THREE.Clock();
        this.frame = 0;

        this.rotationSpeed = Math.PI / 1500;
        // Ile Y nad podłogą jest kamera
        this.cameraHeight = 0.5;
        // Startowa wysokość kamery
        this.currentCam = 1009.5;

        // Wysokość, o jaką gracz może maksymalnie skoczyć (do ustalenia)
        this.jumpHeight = 1;

        // Czy gracz jest na ziemi
        this.onGround = false;
    }

    setBusEvents = () => {
        this.bus.on("app:init", () => {
            console.log("klasa game gotowa");
            this.generateScene();
        })

        this.bus.on("net:login-success", (data) => {
            // z serwera klient dostaje losowego spawnpointa
            // i rotację, na razie {0,0,0}
            const position = data.player.position;
            const rotation = data.player.rotation;

            this.camera.position.set(position.x, position.y, position.z);
            this.camera.rotation.set(rotation.x, rotation.y, rotation.z);
            this.oldCamPos = this.camera.position.clone();

            // od razu pointerlock
            document.body.requestPointerLock();
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

        // Odbiór informacji o meshach
        // this.bus.on("modelController:sendMeshes", (data) => {
        //     this.collisionMeshes = data.collisionMeshes;
        //     console.log("odebrano meshe")
        // })
    }

    // Generowanie sceny
    generateScene = async () => {
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
        // Potrzebne do sprawdzania czy gracz nie wchodzi w ścianę
        this.oldCamPos = this.camera.position.clone();

        // nakierowanie kamery na punkt (0,0,0) w przestrzeni (zakładamy, że istnieje już scena)
        //this.camera.lookAt(this.scene.position);

        this.euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');

        // Tworzenie raycastera, który patrzy "w dół" od kamery gracza (new THREE.Vector3( 0, - 1, 0 ))
        // Detekcja obiektów, które są od 0 do tyle unitów, ile ustawiłem w this.cameraHeight od niego
        this.raycaster = new THREE.Raycaster(new THREE.Vector3(this.camera.position), new THREE.Vector3(0, - 1, 0), 0, this.cameraHeight);

        // Raycaster, który będzie kontrolował czy gracz wchodzi w ścianę (ustawiony na pozycji głowy (kamery))
        this.wallRaycaster = new THREE.Raycaster();
        // Raycaster, który będzie kontrolował czy gracz wchodzi w ścianę (ustawiony na pozycji stóp)
        this.wallRaycaster2 = new THREE.Raycaster();
        // Raycaster, który będzie kontrolował czy gracz wchodzi po rampie
        this.wallRaycaster3 = new THREE.Raycaster();

        const ambientLight = new THREE.AmbientLight(0xffffff, 1);
        this.scene.add(ambientLight);

        // Wczytanie modelu mapy
        await this.loadMap();

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
        // console.log(intersections)
        const onObject = intersections.length > 0;

        // Jak stoi to ok, jak nie to "spada" - do poprawy, na razie jest hardcoded -0.025 ale będzie bardziej "fizycznie"
        if (onObject) {
            const camAboveMeshHeight = this.camera.position.y - intersections[0].point.y;
            // console.log(this.camera.position.y - intersections[0].point.y)
            if (camAboveMeshHeight <= 0.8) {
                this.onGround = true;
                // console.log('On ground');
            } else {
                this.onGround = false;
            }
        }
        if (!this.onGround || !onObject) {
            // console.log('In air');
            if (onObject) {
                if (this.camera.position.y - intersections[0].point.y <= 0.825) {
                    this.camera.position.y = intersections[0].point.y + 0.8;
                } else {
                    this.camera.position.y -= 0.025;
                }
            } else {
                this.camera.position.y -= 0.025;
            }
            this.currentCam = this.camera.position.y;
            this.onGround = false;
        }

        //wykonywanie funkcji bez końca, ok 60 fps jeśli pozwala na to wydajność maszyny
        requestAnimationFrame(this.render);

        let speed = 0.08;
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        direction.y = 0;
        direction.normalize();
        const strafeDirection = new THREE.Vector3();
        strafeDirection.crossVectors(this.camera.up, direction).normalize();

        const moveVector = new THREE.Vector3();
        if (this.moveForward) moveVector.add(direction);
        if (this.moveBackward) moveVector.addScaledVector(direction, -1);
        if (this.moveLeft) moveVector.add(strafeDirection);
        if (this.moveRight) moveVector.addScaledVector(strafeDirection, -1);

        // Ruch kamery na podstawie naciśniętych przycisków, z uwzględnieniem kolizji ścian (na razie tylko na poziomie głowy)
        if (moveVector.lengthSq() > 0) {
            moveVector.normalize();

            // Przewidywanie nowej pozycji, dla niej sprawdzane jest czy gracz może się ruszyć
            const newPosition = this.camera.position.clone().addScaledVector(moveVector, speed);

            this.wallRaycaster.set(this.camera.position, moveVector);
            this.wallRaycaster2.set(this.camera.position, moveVector);
            this.wallRaycaster3.set(this.camera.position, moveVector);

            this.wallRaycaster.far = speed + 0.5; // 0.5 to jest jak blisko do ściany może być kamera
            this.wallRaycaster2.far = speed + 0.5;
            this.wallRaycaster3.far = speed + 0.5;
            this.wallRaycaster2.ray.origin.y -= 0.75; // Chcemy żeby raycaster był u stóp gracza
            this.wallRaycaster3.ray.origin.y -= 0.3; // Chcemy żeby raycaster był na wysokości, która określa czy gracz wchodzi na rampę

            const intersects = this.wallRaycaster.intersectObjects(this.collisionMeshes, true);
            const intersects2 = this.wallRaycaster2.intersectObjects(this.collisionMeshes, true);
            const intersects3 = this.wallRaycaster3.intersectObjects(this.collisionMeshes, true);

            if (intersects.length == 0 && intersects2.length == 0 && intersects3.length == 0) {
                this.camera.position.copy(newPosition);
            } else if (intersects.length == 0 && intersects2.length != 0 && intersects3.length == 0) {
                this.camera.position.copy(newPosition);
                this.camera.position.y = intersects2[0].point.y + 0.8;
                this.currentCam = this.camera.position.y;
                console.log("Walking up the ramp")
            } else {
                console.log('Wall collision detected');
            }
        }
        // if (this.moveForward) {
        //     // camera.translateZ(-moveSpeed * delta);
        //     this.camera.position.addScaledVector(direction, speed);
        // }
        // if (this.moveBackward) {
        //     // camera.translateZ(moveSpeed * delta);
        //     this.camera.position.addScaledVector(direction, -speed);
        // }

        // if (this.moveLeft) {
        //     this.camera.position.addScaledVector(strafeDirection, speed);
        // }
        // if (this.moveRight) {
        //     this.camera.position.addScaledVector(strafeDirection, -speed);
        // }
        this.camera.position.y = this.currentCam;
        // console.log(this.currentCam)

        // wysyłanie pozycji do serwera co 3 klatki (~50ms)
        if (this.frame % 3 == 0) {
            this.bus.emit('game:sendPosition', this.camera.position);
        }
        this.frame++;


        this.renderer.render(this.scene, this.camera);
    }

    // Funkcja obliczająca prędkość gracza w osi Y w trakcie skoku (potem też prawdopodobnie w trakcie swobodnego opadania)
    // Zmienna hasJumped będzie stosowana aby odróżnić czy gracz właśnie skoczył czy zeskoczył z czegoś bez wciskania spacji
    // Na razie jest hardcoded wartość, ale będzie jakiś wzór na to
    jumpHandle = (hasJumped) => {
        if (this.onGround && hasJumped) {
            // console.log("Should jump")
            this.camera.position.y += this.jumpHeight;
            this.onGround = false;
        }
    }

    // Funkcja pomocnicza to ładowania modelu mapy
    loadMap = async () => {
        const data = { scene: this.scene };

        const meshes = await new Promise((resolve) => {
            const handler = (dataFromModelController) => {
                resolve(dataFromModelController.collisionMeshes);
            };

            this.bus.on('modelController:sendMeshes', handler);

            this.bus.emit('game:loadMap', data);
        });

        this.collisionMeshes = meshes;
    }
}