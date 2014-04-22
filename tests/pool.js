"use strict";

var mocha = require('mocha');
var should = require('should');
var dnode = require('dnode');
var os = require('os');
var Pool = require('../lib/pool.js');

describe('Pool', function() {
	describe('Worker connection', function(done, fail) {
		it('should accept connection from n workers', function(done, fail) {
			var pool = new Pool(3000);
			var numWorkers = 0;
			pool.start();

            var clientOne = dnode(function(remote, connection) {
                this.health = function(callback) {
                    callback(os.cpus());
                };
                connection.on('ready', function() {
                    remote.join('127.0.0.1', function(result) {});
                });
            });

            var clientTwo = dnode(function(remote, connection) {
                this.health = function(callback) {
                    callback(os.cpus());
                };
                connection.on('ready', function() {
                    remote.join('127.0.0.2', function(result) {});
                });
            });

            var closedMsg = function(){
                console.log("closed");
            }

			pool.onAccept(function() {
				if (++numWorkers == 2) {
					pool.getWorkers().should.have.keys(['127.0.0.1', '127.0.0.2']);
                    clientOne.end(null,null,closedMsg);
                    clientTwo.end(null,null,closedMsg);
                    pool.stop();
					done();
				}
			});

            clientOne.connect(3000);
            clientTwo.connect(3000);
		});
	});

	describe('Workers status', function(done, fail) {
		it('should report workers status', function(done, fail) {
			var pool = new Pool(3000);
			pool.start();
			pool.onAccept(function() {
				var status = pool.getStatus();
                status.should.have.properties({status:"ok"});
				done();
			});

			var client = dnode(function(remote, connection) {
				this.health = function(callback) {
					callback(os.cpus());
				};
				connection.on('ready', function() {
					remote.join('127.0.0.1', function(result) {});
				});
			});
            client.connect(3000);
		})
	})
});