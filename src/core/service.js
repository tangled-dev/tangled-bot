import api from '../api/server';
import database from '../database/database';
import configLoader from '../config/config-loader';
import ntp from './ntp';
import botEngine from './bot/bot-engine';


class Service {
    constructor() {
        this.initialized = false;
    }

    initialize(options = {}) {
        if (this.initialized) {
            return Promise.resolve();
        }
        this.initialized = true;
        return database.initialize()
                       .then(() => configLoader.load())
                       .then(() => database.checkup())
                       .then(() => ntp.initialize())
                       .then(() => api.initialize())
                       .then(() => botEngine.initialize())
                       .catch(e => {
                           console.log(`[service] ${e && (e.message || e.api_message) || e}`);
                           api.stop();
                           botEngine.stop();
                           this.initialized = false;
                           return new Promise(resolve => setTimeout(() => this.initialize(options).then(resolve), 5000));
                       });
    }

    stop() {
        if (!this.initialized) {
            return;
        }
        this.initialized = false;
    }
}


export default new Service();
