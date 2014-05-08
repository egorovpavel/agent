"use strict";

var dnode = require('dnode');
var utils = require('util');
var Remote = require('./remote.js');
var _ = require('underscore');
var EventEmitter = require('events').EventEmitter;


var Pool = function (port, logger) {

    var numWorkers = 0;
    var workers = {};
    var jobs = {};
    var instance = this;
    var healthCheckIntervaleHandle;
    var STATES = {
        STOPPED: "STOPPED",
        RUNNING: "RUNNING",
        SHUTDOWN: "SHUTDOWN"
    };
    var state = STATES.STOPPED;

    var server = dnode(function (remote, connection) {
        this.report = function (data, callback) {
            var b = new Buffer(data.data);
            process.stdout.write(b);
            callback();
        };
        this.join = function (id, callback) {
            logger.info("Pool : Client #" + id + " attempts to join");
            callback(id);
            remote.health(function (result) {
                logger.info("Pool : Client #" + id + " joined");
                ++numWorkers;
                workers[id] = new Remote(id, remote, connection);
                workers[id].setHealth(result);
                workers[id].onHealthChange(function (health) {
                    logger.info("Pool : Client #" + id + " status updated", health);
                });
                workers[id].onDisconnect(function () {
                    logger.info("Pool : Client #" + id + " leaves pool");
                    delete workers[id];
                    --numWorkers;
                    instance.emit('leave', id)
                });
                instance.emit('accept', id);
            });
        };
        this.leave = function (id, callback) {
            logger.info("Pool : Client #" + id + " leaves pool");
            callback();
        }
    });

    healthCheckIntervaleHandle = setInterval(function () {
        logger.info("Pool : performing status check of Workers");
        for (var idx in workers) {
            workers[idx].checkHealth();
        }
    }, 3000);

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

    var checkShutdownCondition = function () {
        if (_.size(workers) == 0 && state == STATES.SHUTDOWN) {
            stop();
        }
    };

    var exec = function (item, callback) {
        if (_.size(workers) == 0) {
            callback(null);
        } else {
            _.min(workers, function (worker) {
                return worker.getHealth()[0];
            }).exec(item, callback);
        }
    };

    var shutdown = function () {
        setState(STATES.SHUTDOWN);
        if (_.size(workers) == 0) {
            stop();
        } else {
            _.each(workers, function (worker) {
                worker.shutdown(checkShutdownCondition);
            });
        }
        logger.info("Pool : shutdown sequence initiated");
    };

    instance.on("leave", checkShutdownCondition);

    logger.info("Pool : instance created");

    return {
        start: start,
        stop: stop,
        onStop: onStop,
        shutdown: shutdown,
        getStatus: getStatus,
        getWorkers: getWorkers,
        onAccept: onAccept,
        exec: exec
    }
};

utils.inherits(Pool, EventEmitter);

module.exports = Pool;