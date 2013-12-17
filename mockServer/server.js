'use strict';

var logger = require('winston');
var express = require('express');
var lessMiddleware = require('less-middleware');
var argv = require('optimist')
    .boolean('production')
    .default({mockIp: '127.0.0.1', mockPort: '9000'})
    .usage('Usage: $0 --mockIp [string]  --mockPort [number] --production --debug')
    .describe('production', 'use production build')
    .describe('debug', 'show debug messages')
    .argv;

logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {colorize: true});

var fileProps = {filename: 'node.log'}
if (argv.debug) {
    fileProps.level = 'debug';
}
logger.add(logger.transports.File, fileProps);
var optimist = require('optimist');


if (argv.help) {
    optimist.showHelp();
    process.exit();
}

function printOptions() {
    var optionsUsed = "Options used:\r\n";

    for (var arg in argv) {
        optionsUsed += arg + ":" + argv[arg] + "\r\n";
    }

    logger.info(optionsUsed);
}

printOptions();


var fullDir;
if (argv.production) {
    fullDir = __dirname + "/../../build/app";
} else {
    fullDir = __dirname + "/../app";
}

var server = express();

if (argv.debug) {
    server.use(express.logger());
}

if (argv.production) {
    server.use(express.compress());
}

if (!argv.production) {
    server.use(lessMiddleware({
        src: fullDir
    }));
}

server.use(express.static(fullDir))
    .use(express.methodOverride())
    .use(express.errorHandler({dumpExceptions: true, showStack: true}));

//if it's a missing genuine file, return 404 to avoid infinite loops
server.get(/\/(?:js|resources|lib)+/, function (req, res) {
    res.send(404);
});

server.get(/\/*/, function (req, res) {
    res.sendfile('index.html', {root: fullDir});
});

var mockPort = argv.mockPort;

server.listen(mockPort, function () {
    logger.info('Started server on port ' + mockPort);
});
