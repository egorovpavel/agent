'use strict';
var utils = require('util');
var EventEmitter = require('events').EventEmitter;

var Remote = function (id, remote, connection) {
    var id = id;
    var connection = connection;
    var remote = remote;
    var instance = this;
    var health = undefined;

    var setHealth = function (value) {
        instance.emit("change:health");
        health = value
    };

    var getHealth = function () {
        return health;
    };

    var checkHealth = function () {
        remote.health(setHealth);
    };

    var shutdown = function (callback) {
        remote.shutdown(callback);
    };

    var exec = function (item, callback) {
        remote.exec(item, callback);
    };

    var onHealthChange = function (callback) {
        instance.on("change:health", function () {
            callback(health);
        });
    };

    var onDisconnect = function (callback) {
        connection.on("end", function () {
            callback(id);
        });
    };

    return {
        shutdown: shutdown,
        checkHealth: checkHealth,
        getHealth: getHealth,
        setHealth: setHealth,
        onHealthChange: onHealthChange,
        onDisconnect: onDisconnect,
        exec: exec
    }
};
utils.inherits(Remote, EventEmitter);

module.exports = Remote;