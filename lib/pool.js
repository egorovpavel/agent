"use strict";

var dnode = require('dnode');
var utils = require('util');
var EventEmitter = require('events').EventEmitter;

var Worker = function (id, remote, connection) {
    var id = id;
    var connection = connection;
    var remote = remote;
    var instance = this;
    var health;

    var setHealth = function (value) {
        instance.emit("change:health");
        health = value
    };

    var checkHealth = function () {
        remote.health(setHealth);
    };

    var shutdown = function (callback) {
        remote.shutdown(callback);
    };

    var onHealthChange = function (callback) {
        instance.on("change:health", function () {
            callback(health);
        });
    };

    var onDisconnect = function (callback) {
        connection.on("end", function () {
            callback();
        });
    };

    return {
        shutdown: shutdown,
        checkHealth: checkHealth,
        setHealth: setHealth,
        onHealthChange: onHealthChange,
        onDisconnect: onDisconnect
    }
};
utils.inherits(Worker, EventEmitter);

var Pool = function (port, logger) {

    var numWorkers = 0;
    var workers = {};
    var instance = this;
    var healthCheckIntervaleHandle;
    var STATES = {
        STOPPED: "STOPPED",
        RUNNING: "RUNNING",
        SHUTDOWN: "SHUTDOWN"
    };
    var state = STATES.STOPPED;

    var server = dnode(function (remote, connection) {
        this.join = function (id, callback) {
            logger.info("Pool : Client #" + id + " attempts to join");
            callback(id);
            remote.health(function (result) {
                logger.info("Pool : Client #" + id + " joined");
                ++numWorkers;
                workers[id] = new Worker(id, remote, connection);
                workers[id].setHealth(result);
                workers[id].onHealthChange(function (health) {
                    logger.info("Pool : Client #" + id + " status updated", health);
                });
                workers[id].onDisconnect(function () {
                    delete workers[id];
                    --numWorkers;
                    instance.emit('leave', id)
                });
                instance.emit('accept', id);
            });
            healthCheckIntervaleHandle = setInterval(heartBeat, 3000);
        };
        this.leave = function (id, callback) {
            logger.info("Pool : Client #" + id + " leaves pool");
            callback();
        }

    });

    var heartBeat = function () {
        logger.info("Pool : performing status check of Workers");
        for (var idx in workers) {
            workers[idx].checkHealth();
        }
    };


    var getState = function () {
        return state;
    };

    var setState = function (newstate) {
        state = newstate;
        logger.info('Pool : state changed to ' + newstate);
    };

    var getWorkers = function () {
        return workers
    };

    var getStatus = function () {
        logger.info("Pool : status requested");
        return {
            status: "ok"
        }
    };

    var start = function () {
        server = server.listen(port);
        setState(STATES.RUNNING);
        logger.info("Pool : started @localhost:" + port);
    };

    var stop = function () {
        logger.info("Pool : stopped");
        clearInterval(healthCheckIntervaleHandle);
        server.close();
        setState(STATES.STOPPED);
        instance.emit('stopped');
    };

    var onAccept = function (callback) {
        logger.info("Pool : Client accepted");
        instance.on('accept', callback);
    };

    var onStop = function (callback) {
        logger.info("Pool : stopped");
        instance.on('stopped', callback);
    };


    var shutdown = function () {
        setState(STATES.SHUTDOWN);
        for (var idx in workers) {
            workers[idx].shutdown(function () {
                if (numWorkers == 0) {
                    stop();
                }
            });
        }
        logger.info("Pool : shutdown sequence initiated");
    };

    instance.on("leave", function () {
        if (numWorkers == 0 && state == STATES.SHUTDOWN) {
            stop();
        }
    });

    logger.info("Pool : instance created");

    return {
        start: start,
        stop: stop,
        onStop: onStop,
        shutdown: shutdown,
        getStatus: getStatus,
        getWorkers: getWorkers,
        onAccept: onAccept
    }
};

utils.inherits(Pool, EventEmitter);

module.exports = Pool;