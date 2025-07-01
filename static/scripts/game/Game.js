import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export default class Game {
    bus;
    GRAVITY = 20;
    MAX_JUMP_VELOCITY = 6.3; // dane z instytutu badań z 
    UIHidden = false;
    SPREAD_FACTOR = 0.1;

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
        this.jumpVelocity = 0;

        // Czy gracz jest na ziemi
        this.onGround = false;

        // Tablice z graczami i ich meshami
        this.playerTab = [];
        this.playerCollisionMeshes = [];

        // Czy gracz jest martwy
        this.dead = false;
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

            data.othersFiltered.forEach(element => {
                this.loadModel(element);
            });
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
            if (!this.dead) {
                this.euler.y -= data.movementX * this.rotationSpeed;
                this.euler.x -= data.movementY * this.rotationSpeed;
                this.euler.x = Math.min(Math.max(this.euler.x, -1.55334303), 1.55334303);
                // console.log(this.euler.x, this.euler.y)

                this.camera.quaternion.setFromEuler(this.euler);
            }
        })

        // Odbiór informacji o kliknięciu lub zwolnieniu lewego lub prawego przycisku myszy
        this.bus.on("movementController:mouseClick", (data) => {
            this.mouseLeft = data.mouseLeft;
            this.mouseRight = data.mouseRight;
        })

        // Odbiór informacji o skoku
        this.bus.on("movementController:jump", () => {
            if (!this.dead) {
                this.jumpHandle(true);
            }
        })

        // Odbiór informacji o dołączeniu/ponownym połączeniu gracza do gry
        this.bus.on("net:userJoined", (data) => {
            // delete data['type'];
            const newData = Object.fromEntries(Object.entries(data).filter(e => e[0] != 'type')); // zaklęcie

            let found = false;
            for (let i = 0; i < this.playerTab.length; i++) {
                if (this.playerTab[i].id == newData.id) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                this.playerTab.push(newData);
                this.loadModel(newData);
            }
        });

        // Aktualizacja informacji o pozycjach graczy
        this.bus.on("net:updatePositions", (data) => {
            // console.log(this.playerTab);
            // console.log(this.playerCollisionMeshes);
            if (this.playerTab.length == 0) {
                data.forEach(element => {
                    this.playerTab.push(element);
                    this.loadModel(element);
                });
            } else {
                if (this.playerTab.length * 4 < this.playerCollisionMeshes.length) {
                    const meshCountByPlayer = new Map();

                    for (let i = this.playerCollisionMeshes.length - 1; i >= 0; i--) {
                        const mesh = this.playerCollisionMeshes[i];
                        const playerId = mesh.playerId;

                        // Zliczanie meshy dla danego gracza
                        const currentCount = meshCountByPlayer.get(playerId) || 0;

                        if (currentCount >= 4) {
                            // Usuwamy mesh ze sceny i z tablicy, bo jest nadmiarowy
                            this.scene.remove(mesh.parent);
                            this.playerCollisionMeshes.splice(i, 1);
                        } else {
                            // Dodajemy do licznika
                            meshCountByPlayer.set(playerId, currentCount + 1);
                        }
                    }
                }
                this.updateModel(data);
            }
        });

        this.bus.on("ui:hideLogin", () => {
            this.UIHidden = true;
        })

        // Gracz się nie połączył, usunięcie go
        this.bus.on("net:playerRemove", (data) => {
            console.log("usunięto")
            // Usuwanie meshy gracza
            for (let i = this.playerCollisionMeshes.length - 1; i >= 0; i--) {
                if (this.playerCollisionMeshes[i].playerId === data.id) {
                    this.scene.remove(this.playerCollisionMeshes[i].parent);
                    this.playerCollisionMeshes.splice(i, 1);
                }
            }

            // Usuwanie gracza z tablicy graczy
            for (let i = this.playerTab.length - 1; i >= 0; i--) {
                if (this.playerTab[i].id === data.id) {
                    this.playerTab.splice(i, 1);
                }
            }
        });

        this.bus.on("movementController:mouseClick", (data) => {
            if (!this.dead) {
                if (data.mouseLeft && this.UIHidden) { // jeśli lewy przycisk kliknięty
                    this.shootHandle();
                }

                if (data.mouseRight) {
                    // pass
                }
            }
        })

        // Odbiór informacji o mojej śmierci
        this.bus.on("net:kill-me", () => {
            this.dead = true;
        })

        // Odbiór informacji o moim respawnie
        this.bus.on("net:respawn-me", (data) => {
            console.log("respawn mnie")
            this.dead = false;
            this.camera.position.set(data.newPosition.x, data.newPosition.y, data.newPosition.z);
            this.camera.rotation.set(0, 0, 0);
        })

        // Odbiór informacji o czyjejś śmierci
        this.bus.on("net:someoneKilled", (data) => {
            this.playerCollisionMeshes.forEach(element => {
                if (element.playerId == data.killed_id) {
                    element.parent.position.x = 0;
                    element.parent.position.y = 0;
                    element.parent.position.z = 0;
                    element.parent.rotation.y = 0;
                }
            });
        })
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

        // Raycaster, który będzie kontrolował strzelanie (ustawiony na pozycji głowy)
        this.shootRaycaster = new THREE.Raycaster();

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
        const delta = this.clock.getDelta();

        // Sprawdzenie czy gracz na czymś stoi
        const intersections = this.raycaster.intersectObjects(this.collisionMeshes, false);
        // console.log(intersections)
        const onObject = intersections.length > 0;

        // Jak stoi to ok, jak nie to "spada" - do poprawy, na razie jest hardcoded -0.025 ale będzie bardziej "fizycznie"
        // if (onObject) {
        //     const camAboveMeshHeight = this.camera.position.y - intersections[0].point.y;
        //     // console.log(this.camera.position.y - intersections[0].point.y)
        //     if (camAboveMeshHeight <= 0.8) {
        //         this.onGround = true;
        //         this.jumpVelocity = 0;

        //         // console.log('On ground');
        //     } else {
        //         this.onGround = false;
        //     }
        // }
        // if (!this.onGround || !onObject) {
        // console.log('In air');

        // obługa skoku
        // jumpvelocity jest ustawiane w metodzie handleJump
        this.jumpVelocity -= this.GRAVITY * delta; // czas w ms
        this.camera.position.y += this.jumpVelocity * delta;
        this.currentCam = this.camera.position.y;


        if (onObject) {
            const camAboveMeshHeight = this.camera.position.y - intersections[0].point.y;
            if (camAboveMeshHeight <= 0.8 && this.jumpVelocity <= 0) {
                this.onGround = true;
                this.jumpVelocity = 0;
                this.camera.position.y = intersections[0].point.y + 0.8;
                this.currentCam = this.camera.position.y;
            } else {
                this.onGround = false;
            }
        } else {
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
        if (!this.dead) {
            if (this.moveForward) moveVector.add(direction);
            if (this.moveBackward) moveVector.addScaledVector(direction, -1);
            if (this.moveLeft) moveVector.add(strafeDirection);
            if (this.moveRight) moveVector.addScaledVector(strafeDirection, -1);
        }

        // Ruch kamery na podstawie naciśniętych przycisków, z uwzględnieniem kolizji ścian)
        if (moveVector.lengthSq() > 0 && !this.dead) {
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
                let collisionNormal = new THREE.Vector3();

                // Pobierz normalę najbliższej kolizji (np. z pierwszego raycastera)
                if (intersects.length > 0) {
                    collisionNormal.copy(intersects[0].face.normal);
                } else if (intersects2.length > 0) {
                    collisionNormal.copy(intersects2[0].face.normal);
                } else if (intersects3.length > 0) {
                    collisionNormal.copy(intersects3[0].face.normal);
                }

                // Oblicz sliding vector
                const movementDirection = moveVector.clone().normalize();
                const dot = movementDirection.dot(collisionNormal);

                const slideVector = movementDirection.clone().sub(collisionNormal.clone().multiplyScalar(dot)).normalize();

                // Przesuwamy się wzdłuż ściany
                const angleFactor = Math.sin(1 - Math.abs(dot));  // Sliding siła zależna od kąta
                const slideStrength = speed * angleFactor; // współczynnik siły slidingu

                const slidePosition = this.camera.position.clone().addScaledVector(slideVector, slideStrength);

                // Sprawdzamy, czy po slidingu nie wchodzimy w inną ścianę
                this.wallRaycaster.set(this.camera.position, slideVector);
                this.wallRaycaster.far = speed + 0.5;
                const slideIntersects = this.wallRaycaster.intersectObjects(this.collisionMeshes, true);

                if (slideIntersects.length == 0) {
                    this.camera.position.copy(slidePosition);
                } else {
                    // Jeśli nawet sliding jest zablokowany - zostajemy w miejscu
                    console.log('Sliding blocked by wall');
                }
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

        // Wysyłanie pozycji do serwera co 3 klatki (~50ms),
        // na pewno lepiej będzie zrobić osobnego setIntervala, żeby nie bazować na wydajności grafiki xd
        // Na razie rozwiązanie tymczasowe...
        if (this.frame % 3 == 0) {
            this.bus.emit('game:sendPosition', { position: this.camera.position, rotation: this.camera.rotation });
        }
        this.frame++;


        this.renderer.render(this.scene, this.camera);
    }

    // Funkcja obliczająca prędkość gracza w osi Y w trakcie skoku (potem też prawdopodobnie w trakcie swobodnego opadania)
    // Zmienna hasJumped będzie stosowana aby odróżnić czy gracz właśnie skoczył czy zeskoczył z czegoś bez wciskania spacji
    // Na razie jest hardcoded wartość, ale będzie jakiś wzór na to
    jumpHandle = (hasJumped) => {
        if (this.onGround && hasJumped && !this.dead) {
            // console.log("Should jump");
            this.jumpVelocity = this.MAX_JUMP_VELOCITY;
            this.onGround = false;
        }
    }

    shootHandle = () => {
        const dotGeometry = new THREE.SphereGeometry(0.02, 8, 8);
        const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const laserDot = new THREE.Mesh(dotGeometry, dotMaterial);
        const laserDirection = new THREE.Vector3();
        this.camera.getWorldDirection(laserDirection);
        laserDirection.y += 0.115;

        const raycaster = new THREE.Raycaster();
        raycaster.set(this.camera.position, laserDirection);

        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction); // pobieramy wektor kierunku kamery
        // direction.normalize();
        direction.y += 0.115;

        // jeśli skok, to zmieniamy pozycję raycastera o losowe wartości
        if (!this.onGround) {
            direction.x += this.SPREAD_FACTOR * Math.sin(2 * Math.PI * Math.random());
            direction.y += this.SPREAD_FACTOR * Math.sin(2 * Math.PI * Math.random());
            direction.z += this.SPREAD_FACTOR * Math.sin(2 * Math.PI * Math.random());
        }

        const playerPosition = this.camera.position;
        this.shootRaycaster.set(playerPosition, direction);
        this.shootRaycaster.far = 100;
        const intersects = this.shootRaycaster.intersectObjects(this.scene.children, true).filter(hit => hit.object !== this.playerMesh);

        if (intersects.length > 0) {
            console.log(intersects[0].object.name);

            const shootPoint = intersects[0].point;
            laserDot.position.set(shootPoint.x, shootPoint.y, shootPoint.z);
            this.scene.add(laserDot);

            const data = {
                id: sessionStorage.getItem('playerID'),
                bodyPart: intersects[0].object.name,
                targetPlayer: intersects[0].object.playerId
            };

            this.bus.emit('game:shoot', data);
        }

        this.shoot(); // jakaś animacja strzału
    }

    shoot = () => {
        // pass
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

    // Funkcja pomocnicza to ładowania modelu gracza
    loadModel = async (playerData) => {
        const data = { scene: this.scene, playerData: playerData };

        const meshes = await new Promise((resolve) => {
            const handler = (dataFromModelController) => {
                resolve(dataFromModelController.collisionMeshes);
            };

            this.bus.on('modelController:sendPlayerMeshes', handler);

            this.bus.emit('game:loadModel', data);
        });

        this.playerCollisionMeshes = meshes;
    }

    // Zmiana pozycji modelu
    updateModel = (playerData) => {
        // console.log(playerData);
        // console.log(playerData);
        // console.log(this.playerCollisionMeshes);
        playerData.forEach(element => {
            this.playerCollisionMeshes.forEach(element2 => {
                if (element2.playerId == element.id && element.isAlive) {
                    element2.parent.position.x = element.position.x;
                    element2.parent.position.y = element.position.y - 0.8;
                    element2.parent.position.z = element.position.z;
                    element2.parent.rotation.y = - element.rotation._y;
                    // element2.position.x = element.position.x;
                    // element2.position.y = element.position.y;
                    // element2.position.z = element.position.z;
                }
            });
        });
    }
}