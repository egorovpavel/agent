var Pool = require('./lib/pool.js');
var Logger = require('winston');
var thoonk = require('thoonk').createClient();
var Job = require('thoonk-jobs');
var async = require('async');

Logger.setLevels({debug: 0, info: 1, silly: 2, warn: 3, error: 4});
Logger.addColors({debug: 'green', info: 'cyan', silly: 'magenta', warn: 'yellow', error: 'red'});
Logger.remove(Logger.transports.Console);
Logger.add(Logger.transports.Console, { level: 'debug', colorize: true });

var pool = new Pool(3100, Logger);
thoonk.registerObject('Job', Job, function () {
    var jobWorker = thoonk.objects.Job('buildQueue');
    async.forever(function (next) {
        jobWorker.get(0, function (err, item, id) {
            item = JSON.parse(item);
            pool.exec(item, function (result) {
                if (!result) {
                    jobWorker.cancel(id, function (err) {
                        next();
                    });
                } else {
                    jobWorker.finish(id, result, function (err) {
                        next();
                    });
                }
            });
        });
    });
});
pool.onStop(function () {
    process.exit(1);
});
process.on('SIGINT', function () {
    pool.shutdown();
});
pool.start();