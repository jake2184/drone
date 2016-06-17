var winston = require('winston');
var fs = require('fs');
var logDir = "./public/logs";

// Create upload directory if it doesn't exists
if (!fs.existsSync(logDir)){
    fs.mkdirSync(logDir);
}

function nicerFormatter (options) {
    // Return string will be passed to logger.
    return options.timestamp() +' '+ options.level.toUpperCase() +' '+ (undefined !== options.message ? options.message : '') +
        (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
}

winston.add(winston.transports.File, {
    name: 'info-file',
    filename: 'public/logs/filelog-info.log',
    level: 'info',
    json: false,
    //timestamp: function() {return Date.now()},
    timestamp: function() {return new Date().toLocaleString()},
    formatter: nicerFormatter
});

winston.add(winston.transports.File, {
    name: 'error-file',
    filename: 'public/logs/filelog-error.log',
    level: 'error',
    json: false,
    //timestamp: function() {return Date.now()},
    timestamp: function() {return new Date().toLocaleString()},
    formatter: nicerFormatter
});
winston.remove('console');
/*
winston.add(winston.transports.Console, {
    name: 'console-out',
    level: 'info',
    timestamp: function() {
        return Date.now();
    },
    formatter: nicerFormatter
});
*/

/*
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.File)({
            name: 'info-file',
            filename: 'logs/filelog-info.log',
            level: 'info',
            json: false,
            timestamp: function() {return Date.now()},
            formatter: function(options) {
                // Return string will be passed to logger.
                return options.timestamp() +' '+ options.level.toUpperCase() +' '+ (undefined !== options.message ? options.message : '') +
                    (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
            }
        }),
        new (winston.transports.File)({
            name: 'error-file',
            filename: 'logs/filelog-error.log',
            level: 'error',
            json: false,
            timestamp: function() {return Date.now()},
            formatter: function(options) {
                // Return string will be passed to logger.
                return options.timestamp() +' '+ options.level.toUpperCase() +' '+ (undefined !== options.message ? options.message : '') +
                    (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
            }
        }),
        new (winston.transports.Console)({
            name: 'console',
            level: 'info',
            timestamp: function() {
                return Date.now();
            },
            formatter: function(options) {
                // Return string will be passed to logger.
                return options.timestamp() +' '+ options.level.toUpperCase() +' '+ (undefined !== options.message ? options.message : '') +
                    (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
            }
        })
    ]
});
*/
module.exports = winston;