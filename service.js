var Pool = require('./lib/pool.js');
var Logger = require('winston');

var pool = new Pool(3000, Logger);
pool.onAccept(function () {
    console.log("connected");
});
pool.onStop(function () {
    process.exit(1);
});
process.on('SIGINT', function () {
    pool.shutdown();
});
pool.start();