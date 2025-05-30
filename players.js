// propozycja, żeby players było hashmapą <playerId, player>
const players = new Map();

const addPlayer = (id, player) => {
    players.set(id, player);
}

const deletePlayer = (id) => {
    players.delete(id);
}

const getPlayer = (id) => {
    return players.get(id);
}

const getAllPlayers = () => {
    return Array.from(players.values());
}

const getAllSockets = () => {
    return Array.from(players.keys());
}

export { players, addPlayer, deletePlayer, getAllPlayers, getAllSockets, getPlayer };