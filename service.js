var Pool = require('./lib/pool.js');
var Logger = require('winston');

Logger.setLevels({debug: 0, info: 1, silly: 2, warn: 3, error: 4});
Logger.addColors({debug: 'green', info: 'cyan', silly: 'magenta', warn: 'yellow', error: 'red'});
Logger.remove(Logger.transports.Console);
Logger.add(Logger.transports.Console, { level: 'warn', colorize: true });

var item = {
    id: 12345,
    config: {
        language: "JS",
        timeout: 5000
    },
    payload: {
        commands: [
            "cd /root",
            "git clone https://github.com/egorovpavel/pool.git pool",
            "cd pool",
            "npm install mocha -g",
            "npm install",
            "npm test"
        ]
    }
};
var pool = new Pool(3000, Logger);
pool.onAccept(function () {
    console.log("connected");
    item.id = Math.round(Math.random() * 1000);
    pool.exec(item, function (result) {
        console.log(result);
    })
});
pool.onStop(function () {
    process.exit(1);
});
process.on('SIGINT', function () {
    pool.shutdown();
});
pool.start();