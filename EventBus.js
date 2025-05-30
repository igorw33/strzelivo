const { EventEmitter } = require("ws");

const bus = new EventEmitter();

module.exports = { bus };