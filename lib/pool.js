"use strict";

var dnode = require('dnode');
var utils = require('util');
var EventEmitter = require('events').EventEmitter;

var Worker = function (id, remote) {
    var id = id;
    var remote = remote;
    var health;

    var setHealth = function (value) {
        health = value
    };

    return {
        setHealth: setHealth
    }
};


var Pool = function (port) {

    var workers = {};
    var instance = this;

    var server = dnode(function (remote, connection) {
        this.join = function (id, callback) {
            workers[id] = new Worker(remote);
            callback(id);
            remote.health(function (result) {
                workers[id].setHealth(result)
            });

            instance.emit('accept', id);
        };
        this.leave = function (id, callback) {
            callback(true);
            delete workers[id];
            instance.emit('leave', id)
        }
    });

    var getWorkers = function () {
        return workers
    };

    var getStatus = function () {
        return {
            status: "ok"
        }
    };

    var start = function () {
        server = server.listen(port)
    };

    var stop = function () {
        server.close();
    };

    var onAccept = function (callback) {
        instance.on('accept', callback);
    };

    return {
        start: start,
        stop: stop,
        getStatus: getStatus,
        getWorkers: getWorkers,
        onAccept: onAccept
    }
};

utils.inherits(Pool, EventEmitter);

module.exports = Pool;