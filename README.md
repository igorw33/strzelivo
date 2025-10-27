
# Strzelivo

Multiplayer PvP 3D first person shooter. Game mode - FFA deathmatch.


## Run Locally

Clone the project

```bash
  git clone https://github.com/igorw33/strzelivo.git
```

Go to the project directory

```bash
  cd [project directory]
```

Install necessary modules
```bash
  npm install
```

If needed, run
```bash
  npm audit fix
```

Start server.js
```bash
  node server
```

Connect to host's IP address on port 3000 in web browser of your choice from your device or other in the local network.

## Controls

To play, press F11 key to enter fullscreen mode and P key to lock your cursor. To unlock press P key again.

WASD to move, space to jump, left mouse button to shoot.

## Features

- FFA infinite deathmatch
- Players can join and leave at any point of the game
- Player reconnection
- Leaderboard including stats like kills, deaths and assists
- Killfeed
- Bullet spread while jumping
- Multiple spawnpoint locations


## Tech Stack

**Client:** JavaScript, Three.js, HTML, CSS

**Server:** Node.js, Express, Socket.io

## Credits

This is a group project, full credit also goes to my colleagues:
- Kacper Gałczyk (https://github.com/kgalczyk)
- Stanisław Ptaszyński (https://github.com/sptachu)
- Maciej Kochan (https://github.com/m-c-j)
