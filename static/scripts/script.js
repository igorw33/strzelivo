import * as THREE from 'three';
import Net from './Net.js';
window.addEventListener("load", function () {
    const net = new Net("ws://localhost:3000");
    // a następnie można wysłać dane za pomocą poniższej metody
    // net.send(type, data);
    // net.send('init', { x: 10, y: 10 });

    // scena 3D

    const scene = new THREE.Scene();
    // kamera perspektywiczna - przeczytaj dokładnie objaśnienia w komentarzach

    const camera = new THREE.PerspectiveCamera(
        45,    // kąt patrzenia kamery (FOV - field of view)
        4 / 3,    // proporcje widoku, powinny odpowiadać proporcjom ekranu przeglądarki użytkownika
        0.1,    // minimalna renderowana odległość
        10000    // maksymalna renderowana odległość od kamery
    );

    // renderer wykorzystujący WebGL - działa stabilnie na wszystkich
    // najnowszych przeglądarkach zarówno desktopowych jak mobilnych

    const renderer = new THREE.WebGLRenderer();

    // kolor tła sceny - uwaga na prefix 0x a nie #

    renderer.setClearColor(0x0066ff);

    // ustal rozmiary renderowanego okna w px (szer, wys)

    renderer.setSize(window.innerWidth, window.innerHeight);

    // dodanie renderera do diva, który istnieje na scenie

    this.document.getElementById("root").append(renderer.domElement);

    camera.position.x = -200;
    camera.position.y = 200;
    camera.position.z = 200;

    // lub

    camera.position.set(100, 100, 100)

    // nakierowanie kamery na punkt (0,0,0) w przestrzeni (zakładamy, że istnieje już scena)

    camera.lookAt(scene.position);
    // Geometria: szerokość, wysokość, głębokość
    const geometry = new THREE.BoxGeometry(100, 10, 20);

    // Materiał (kolor)
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, });

    const cube = new THREE.Mesh(geometry, material);
    // kluczowy element - animacja

    scene.add(cube);

    function render() {
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;

        //w tym miejscu ustalamy wszelkie zmiany w projekcie (obrót, skalę, położenie obiektów)
        //np zmieniająca się wartość rotacji obiektu

        //mesh.rotation.y += 0.01;

        //wykonywanie funkcji bez końca, ok 60 fps jeśli pozwala na to wydajność maszyny

        requestAnimationFrame(render);

        // potwierdzenie w konsoli, że render się wykonuje

        // console.log("render leci")
        //ciągłe renderowanie / wyświetlanie widoku sceny naszą kamerą

        renderer.render(scene, camera);
    }

    // na koniec jednokrotne wykonanie powyższej funkcji

    render();
})