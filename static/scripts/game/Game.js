import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export default class Game {
    bus;

    constructor(bus) {
        this.bus = bus;
        this.setBusEvents();

        // Inicjalizacja wartości dla obecnego kierunku ruchu
        this.moveForward = false;
        this.moveLeft = false;
        this.moveBackward = false;
        this.moveRight = false;
    }

    setBusEvents = () => {
        this.bus.on("app:init", () => {
            console.log("klasa game gotowa");
            this.generateScene();
        })
    }

    // Generowanie sceny
    generateScene = () => {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            45,    // kąt patrzenia kamery (FOV - field of view)
            4 / 3,    // proporcje widoku, powinny odpowiadać proporcjom ekranu przeglądarki użytkownika
            0.1,    // minimalna renderowana odległość
            10000    // maksymalna renderowana odległość od kamery
        );
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setClearColor(0x0066ff);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById("root").append(this.renderer.domElement);
        // this.camera.position.x = -200;
        // this.camera.position.y = 200;
        // this.camera.position.z = 200;
        this.camera.position.set(100, 100, 100);

        // nakierowanie kamery na punkt (0,0,0) w przestrzeni (zakładamy, że istnieje już scena)
        this.camera.lookAt(this.scene.position);

        //  Inicjalizacja OrbitControls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        // Generowanie przykładowego elementu
        // Geometria: szerokość, wysokość, głębokość
        this.geometry = new THREE.BoxGeometry(100, 10, 20);
        this.material = new THREE.MeshBasicMaterial({ color: 0x00ff00, });
        this.cube = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.cube);

        this.render();

        // Mapowanie klawiszy
        document.addEventListener('keydown', (event) => {
            switch (event.key) {
                case "w" || "W":
                    this.moveForward = true;
                    break;
                case "a" || "A":
                    this.moveLeft = true;
                    break;
                case "s" || "S":
                    this.moveBackward = true;
                    break;
                case "d" || "d":
                    this.moveRight = true;
                    break;
            }
        });

        document.addEventListener('keyup', (event) => {
            switch (event.key) {
                case "w" || "W":
                    this.moveForward = false;
                    break;
                case "a" || "A":
                    this.moveLeft = false;
                    break;
                case "s" || "S":
                    this.moveBackward = false;
                    break;
                case "d" || "d":
                    this.moveRight = false;
                    break;
            }
        });
    }

    // Funkcja render, wywołująca się cały czas
    render = () => {
        // this.cube.rotation.x += 0.01;
        // this.cube.rotation.y += 0.01;

        //w tym miejscu ustalamy wszelkie zmiany w projekcie (obrót, skalę, położenie obiektów)
        //np zmieniająca się wartość rotacji obiektu
        //wykonywanie funkcji bez końca, ok 60 fps jeśli pozwala na to wydajność maszyny

        requestAnimationFrame(this.render);

        if (this.moveForward) {
            // camera.translateZ(-moveSpeed * delta);
            this.camera.translateZ(-4);
        }
        if (this.moveBackward) {
            // camera.translateZ(moveSpeed * delta);
            this.camera.translateZ(4);
        }
        if (this.moveLeft) {
            // camera.translateX(-moveSpeed * delta);
            this.camera.translateX(-4);
        }
        if (this.moveRight) {
            // camera.translateX(moveSpeed * delta);
            this.camera.translateX(4);
        }

        //ciągłe renderowanie / wyświetlanie widoku sceny naszą kamerą

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}