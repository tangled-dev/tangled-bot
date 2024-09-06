import logger from './core/logger';
import service from './core/service';
import config from './config/config';
import console from './core/console';
import fs from 'fs';
import path from 'path';
import os from 'os';

const argv = require('yargs').options({}).argv;

if (argv.bind) {
    config.NODE_BIND_IP = argv.bind;
}

if (argv.portApi) {
    config.NODE_PORT_API = argv.portApi;
}

let pidFile      = argv.pidFile;
const dataFolder = argv.dataFolder ?
                   path.isAbsolute(argv.dataFolder) ? argv.dataFolder : path.join(os.homedir(), argv.dataFolder)
                                   : path.join(os.homedir(), config.DATABASE_CONNECTION.FOLDER);

if (dataFolder) {
    config.DATABASE_CONNECTION.FOLDER = dataFolder;
}

if (pidFile && !path.isAbsolute(pidFile)) {
    pidFile = dataFolder ? path.join(dataFolder, pidFile) : path.join(os.homedir(), pidFile);
}


if (argv.debug === 'true') {
    config.MODE_DEBUG = true;
}

process.title = 'tangled-bot';

let shutdown = false;
process.on('SIGINT', async function() {
    if (!shutdown) {
        shutdown = true;
        console.log('\n[main] gracefully shutting down from SIGINT (Crtl-C)');
        if (pidFile && fs.existsSync(pidFile)) {
            fs.unlinkSync(pidFile);
        }
        process.exit(0);
    }
});

const checkPIDFile = () => {
    if (!pidFile) {
        console.log('pid file not in use');
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        if (!fs.existsSync(pidFile)) {
            fs.writeFile(pidFile, "" + process.pid, () => {
                resolve();
            });
            return;
        }

        fs.readFile(pidFile, 'utf-8', (err, data) => {
            let pid           = parseInt(data);
            let processKilled = false;
            if (Number.isInteger(pid)) {
                try {
                    process.kill(pid);
                }
                catch (ignore) {
                }
                processKilled = true;
                console.log('zombie process killed, pid:', pid);
            }
            fs.writeFile(pidFile, "" + process.pid, () => {
                setTimeout(() => resolve(), processKilled ? 1000 : 0);
            });
        });
    });
};

logger.log('tangled bot initializing');

checkPIDFile().then(() => service.initialize());
