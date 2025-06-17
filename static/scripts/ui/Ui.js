export default class Ui {
    bus;
    DELETE_MESSAGE_TIME = 15000;

    constructor(bus) {
        this.bus = bus;
        this.setBusEvents();
        this.createLoginScreen();
        this.displayLoginScreen();
        this.createEventLog();
    }

    setBusEvents = () => {
        // odpowiedzi na zdarzenia z różnych klas

        this.bus.on("app:init", () => {
            console.log("klasa ui gotowa");
        });

        this.bus.on("net:login-success", (data) => {
            this.createHUD(data);

            this.hideLoginScreen();

            // emit do odpalenia kontroli kamery
            this.bus.emit("ui:hideLogin");
        });

        // pokazywanie statystyk: movementController wykryka przycisk 'tab', leci event do neta, net dostaje staty z serwera, leci emit tutaj
        this.bus.on("net:showStats", (data) => {
            this.showStats(data.stats);
        });

        // ukrywanie statystyk bezpośrednio z movementControllera
        this.bus.on("movementController:hideStats", () => {
            this.hideStats();
        });

        this.bus.on("net:login-failed", (data) => {
            this.displayLoginFailReason(data.reason);
        });

        this.bus.on("net:userJoined", (data) => {
            this.createLog(data);
        });

        this.bus.on("net:userDisconnect", (data) => {
            this.createLog(data);
        });
    }

    // LOGIN SCREEN
    hideLoginScreen = () => {
        this.container.classList.remove('login-container');
        this.container.classList.add('login-container-off');
    }

    displayLoginScreen = () => {
        this.container.classList.remove('login-container-off');
        this.container.classList.add('login-container');
    }

    createLoginScreen = () => {
        this.container = document.createElement("div");
        this.container.id = 'login-container';

        const input = document.createElement('input');
        input.id = "username-input";
        input.type = "text";
        input.placeholder = 'username';
        input.classList.add('username-input');
        this.container.append(input);

        this.container.addEventListener("keydown", (event) => {
            if (event.key.toLowerCase() == 'enter') {
                this.bus.emit('ui:login', { username: input.value })
            }
        })

        document.body.appendChild(this.container);

        // można ewentualnie wymusić focusa na inpucie
        // input.focus();
    }

    sendUserData = () => {
        const input = document.getElementById("username-input");
        const username = input.value;
        this.bus.emit("ui:login", { username: username });
    }

    displayLoginFailReason = (reason) => {
        const reasonElement = document.createElement("div");
        reasonElement.innerHTML = reason;
        this.container.appendChild(reasonElement);
    }

    // HUD
    createHUD = (data) => {
        // pasek górny: username
        const playerData = data.player;

        this.usernameContainer = document.createElement("div");
        this.usernameContainer.classList.add('hud-username-bar');
        this.usernameContainer.innerHTML = `nickname: ${playerData.username}`;

        // pasek dolny: hp, minimapa?
        this.lowerBarContainer = document.createElement("div");
        this.lowerBarContainer.classList.add('hud-lower-bar');

        // pasek hp
        const hpBar = this.createHpBar(playerData.hp);
        this.lowerBarContainer.append(hpBar);


        // celownik
        this.crosshair = document.createElement('div');
        this.crosshair.classList.add('crosshair');

        document.body.append(this.usernameContainer, this.lowerBarContainer, this.crosshair);

        // set HP to full
        this.setHpBar(playerData.hp);

        // minimapa? to do


    }

    createHpBar = (hp) => {
        let hpBar = document.createElement('div');
        hpBar.id = "hp-bar";
        hpBar.maxHP = hp;
        hpBar.style.width = 2 * hp + "px";
        hpBar.style.height = "20px";
        hpBar.style.border = "5px solid black";
        hpBar.style.backgroundColor = "#ff0000";
        return hpBar;
    }

    setHpBar = (hp) => {
        const hpBar = document.getElementById("hp-bar");
        hpBar.innerHTML = '';
        let leftHpBar = document.createElement("div");
        leftHpBar.style.position = "absolute";
        leftHpBar.style.width = 2 * (hp / hpBar.maxHP) * 100 + 'px';
        leftHpBar.style.height = "20px";
        leftHpBar.style.backgroundColor = "#00ee00";

        hpBar.appendChild(leftHpBar);
    }

    // EVENT LOG (wiadomości o dołączaniu i wychodzeniu graczy)
    createEventLog = () => {
        const eventLog = document.createElement('div');
        eventLog.id = "event-log";
        eventLog.classList.add('event-log');
        document.body.appendChild(eventLog);
    }

    createLog = (data) => {
        // data = {type:string, player:string};
        const message = `Gracz ${data.player} ${data.type == 'user-joined' ? 'dołączył do' : 'wyszedł z'} gry.`;
        const messageDiv = document.createElement('div');
        messageDiv.innerHTML = message;
        messageDiv.classList.add('message');
        document.getElementById('event-log').appendChild(messageDiv);

        // usuwanie wiadomości po 15 sekundach
        setTimeout(() => {
            messageDiv.remove();
        }, this.DELETE_MESSAGE_TIME);
    }

    // STATY
    showStats = (data) => {
        /*
            wynikiem jest tabela:
            nick | kills | deaths | assists

            posortowana po killach (serwer sortuje)
        */
        if (this.statsContainer != null) return;
        this.statsContainer = document.createElement("div");
        this.statsContainer.id = 'stats-container';
        this.statsContainer.classList.add('login-container');

        const table = document.createElement('table');
        const row1 = document.createElement('tr');
        const username = document.createElement('th');

        const kills = document.createElement('th');
        const deaths = document.createElement('th');
        const assists = document.createElement('th');

        // stylish borders hehe
        table.style.border = "1px solid white";
        username.style.borderRight = '1px solid white';
        kills.style.borderRight = '1px solid white';
        deaths.style.borderRight = '1px solid white';


        username.innerHTML = 'username';
        kills.innerHTML = 'kills';
        deaths.innerHTML = 'deaths';
        assists.innerHTML = 'assists';

        row1.append(username, kills, deaths, assists);
        table.append(row1);

        for (let row of data) {
            let tr = document.createElement('tr');
            let user = document.createElement('td');
            const k = document.createElement('td');
            const d = document.createElement('td');
            const a = document.createElement('td');

            user.style.borderRight = '1px solid white';
            k.style.borderRight = '1px solid white';
            d.style.borderRight = '1px solid white';

            user.innerHTML = row.username;
            k.innerHTML = row.stats.kills;
            d.innerHTML = row.stats.deaths;
            a.innerHTML = row.stats.assists;

            tr.append(user, k, d, a);
            table.append(tr);
        }

        this.statsContainer.appendChild(table);
        document.body.appendChild(this.statsContainer);
    }

    hideStats = () => {
        if (this.statsContainer == undefined) return;

        this.statsContainer.remove();
        this.statsContainer = null;
    }
}