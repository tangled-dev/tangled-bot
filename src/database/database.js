import config from '../config/config';
import {API, Config, Normalization, Schema, Strategy} from './repositories/repositories';
import mutex from '../core/mutex';
import eventBus from '../core/event-bus';
import fs from 'fs';
import cryptoRandomString from 'crypto-random-string';
import path from 'path';
import async from 'async';
import _ from 'lodash';
import sqlite3 from 'sqlite3';

sqlite3.Database.prototype.runAsync = function(sql, ...params) {
    return new Promise((resolve, reject) => {
        this.run(sql, params, function(err) {
            if (err) {
                return reject(err);
            }
            resolve(this);
        });
    });
};

sqlite3.Database.prototype.runBatchAsync = function(statements) {
    const results = [];
    const batch   = [
        'BEGIN',
        ...statements,
        'COMMIT'
    ];
    return new Promise((resolve, reject) => {
        mutex.lock(['transaction'], unlock => {
            return batch.reduce((chain, statement) => chain.then(result => {
                results.push(result);
                return this.runAsync(...[].concat(statement));
            }), Promise.resolve())
                        .then(() => {
                            unlock();
                            resolve(results.slice(2));
                        })
                        .catch(err => this.runAsync('ROLLBACK')
                                          .then(() => {
                                              unlock();
                                              reject(err + ' in statement #' + results.length);
                                          })
                        );
        });
    });
};


export class Database {
    static ID_CHARACTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    constructor() {
        this.debug              = true;
        this.database           = null;
        this.databaseRootFolder = null;
        this.repositories       = {};
    }

    static generateID(length) {
        return cryptoRandomString({
            length,
            characters: Database.ID_CHARACTERS
        });
    }

    static buildQuery(sql, where, orderBy, limit, shardID, offset) {
        let parameters = [];
        if (where) {
            _.each(_.keys(where), (key, idx) => {
                if (where[key] === undefined ||
                    ((key.endsWith('_begin') || key.endsWith('_min') || key.endsWith('_end') || key.endsWith('_max') || key.endsWith('_in')) && !where[key])) {
                    return;
                }

                if (idx > 0) {
                    sql += ' AND ';
                }
                else {
                    sql += ' WHERE ';
                }

                if (key.endsWith('_begin') || key.endsWith('_min')) {
                    sql += `${key.substring(0, key.lastIndexOf('_'))} >= ?`;
                }
                else if (key.endsWith('_end') || key.endsWith('_max')) {
                    sql += `${key.substring(0, key.lastIndexOf('_'))} <= ?`;
                }
                else if (where[key] === null) {
                    if (key.endsWith('!')) {
                        sql += `${key.substring(0, key.length - 1)} is not NULL`;
                    }
                    else {
                        sql += `${key} is NULL`;
                    }
                    return;
                }
                else if (key.endsWith('_in')) {
                    sql += `${key.substring(0, key.lastIndexOf('_'))} IN (${where[key].map(() => '?').join(',')})`;
                    for (let parameter of where[key]) {
                        parameters.push(parameter);
                    }
                    return;
                }
                else {
                    sql += `${key}= ?`;
                }

                parameters.push(where[key]);
            });
        }

        if (shardID) {
            if (parameters.length === 0) {
                sql += ' WHERE shard_id = ?';
            }
            else {
                sql += ' AND shard_id = ?';
            }
            parameters.push(shardID);
        }

        if (orderBy) {
            sql += ' ORDER BY ' + orderBy;
        }

        if (limit) {
            sql += ' LIMIT ?';
            parameters.push(limit);
        }

        if (offset) {
            sql += ' OFFSET ?';
            parameters.push(offset);
        }

        return {
            sql,
            parameters
        };
    }

    static buildUpdate(sql, set, where) {
        let parameters = [];
        let first      = true;
        _.each(_.keys(set), key => {
            if (set[key] === undefined) {
                return;
            }

            if (!first) {
                sql += ', ';
            }
            else {
                sql += ' SET ';
                first = false;
            }

            sql += `${key} = ?`;

            parameters.push(set[key]);
        });
        first = true;
        if (where) {
            _.each(_.keys(where), key => {
                if (where[key] === undefined ||
                    ((key.endsWith('_begin') || key.endsWith('_min') || key.endsWith('_end') || key.endsWith('_max') || key.endsWith('_in')) && !where[key])) {
                    return;
                }

                if (!first) {
                    sql += ' AND ';
                }
                else {
                    sql += ' WHERE ';
                    first = false;
                }

                if (key.endsWith('_begin') || key.endsWith('_min')) {
                    sql += `${key.substring(0, key.lastIndexOf('_'))} >= ?`;
                }
                else if (key.endsWith('_end') || key.endsWith('_max')) {
                    sql += `${key.substring(0, key.lastIndexOf('_'))} <= ?`;
                }
                else if (where[key] === null) {
                    if (key.endsWith('!')) {
                        sql += `${key.substring(0, key.length - 1)} is not NULL`;
                    }
                    else {
                        sql += `${key} is NULL`;
                    }
                    return;
                }
                else if (key.endsWith('_in')) {
                    sql += `${key.substring(0, key.lastIndexOf('_'))} IN (${where[key].map(() => '?').join(',')})`;
                    for (let parameter of where[key]) {
                        parameters.push(parameter);
                    }
                    return;
                }
                else {
                    sql += `${key} = ?`;
                }

                parameters.push(where[key]);
            });
        }

        return {
            sql,
            parameters
        };
    }

    static enableDebugger(database) {
        const dbAll  = database.all.bind(database);
        database.all = (function(sql, parameters, callback) {
            console.log(`[database] query all start: ${sql}`);
            if (typeof (parameters) === 'function') {
                callback = parameters;
            }
            const startTime = Date.now();
            dbAll(sql, parameters, (err, data) => {
                const timeElapsed = Date.now() - startTime;
                console.log(`[database] query all (run time ${timeElapsed}ms) : ${sql} : ${err}`);
                callback(err, data);
            });
        }).bind(database);

        const dbGet  = database.get.bind(database);
        database.get = (function(sql, parameters, callback) {
            console.log(`[database] query get start: ${sql}`);
            if (typeof (parameters) === 'function') {
                callback = parameters;
            }
            const startTime = Date.now();
            dbGet(sql, parameters, (err, data) => {
                const timeElapsed = Date.now() - startTime;
                console.log(`[database] query get (run time ${timeElapsed}ms): ${sql} : ${err}`);
                callback(err, data);
            });
        }).bind(database);
    }

    initializeTangledBot() {
        return new Promise(resolve => {
            this.databaseRootFolder = config.DATABASE_CONNECTION.FOLDER;
            if (!fs.existsSync(this.databaseRootFolder)) {
                fs.mkdirSync(path.join(this.databaseRootFolder));
            }

            let dbFile = path.join(this.databaseRootFolder, config.DATABASE_CONNECTION.FILENAME_TANGLED_BOT);

            let doInitialize = false;
            if (!fs.existsSync(dbFile)) {
                doInitialize = true;
            }

            this.database = new sqlite3.Database(dbFile, (err) => {
                if (err) {
                    throw Error(err.message);
                }

                console.log('[database] connected to the tangled bot database.', dbFile);

                this.debug && Database.enableDebugger(this.database);

                if (doInitialize) {
                    console.log('[database] initializing the tangled bot database');
                    const data = require('./scripts/initialize-tangled-bot.sql');
                    this.database.exec(data, (err) => {
                        if (err) {
                            return console.log(err.message);
                        }
                        console.log('[database] the tangled bot database was initialized');

                        resolve();
                    });
                }
                else {
                    resolve();
                }

            });
        });
    }

    _initializeTables() {
        this.repositories['normalization'] = new Normalization(this.database);
        this.repositories['api']           = new API(this.database);
        this.repositories['config']        = new Config(this.database);
        this.repositories['strategy']      = new Strategy(this.database);
        return this.repositories['normalization'].load();
    }

    getRepository(repositoryName, shardID) {
        try {
            return this.repositories[repositoryName];
        }
        catch (e) {
            console.log('[database] repository not found', repositoryName, shardID);
            return null;
        }
    }

    _migrateTables() {
        const schema                = new Schema(this.database);
        this.repositories['schema'] = schema;
        console.log('[database] check schema version');
        let newVersion;
        return new Promise(resolve => {
            schema.getVersion()
                  .then(version => {
                      if (parseInt(version) < parseInt(config.DATABASE_CONNECTION.SCHEMA_VERSION)) {
                          newVersion = parseInt(version) + 1;
                          console.log('[database] migrating schema from version', version, ' to version ', newVersion);
                          eventBus.emit('tangled_notify_message', {
                              message  : `[database] migrating main database from version ${version} to version ${newVersion}`,
                              is_sticky: true,
                              timestamp: Date.now()
                          });
                          return schema.migrate(newVersion)
                                       .then(() => {
                                           eventBus.emit('tangled_notify_message', {
                                               message  : `[database] migration completed: version ${newVersion}`,
                                               is_sticky: false,
                                               timestamp: Date.now()
                                           });
                                       })
                                       .then(() => this._migrateTables())
                                       .then(() => resolve());
                      }
                      else {
                          console.log('[database] current schema version is ', version);
                          resolve();
                      }
                  })
                  .catch((err) => {
                      if (err.message.indexOf('no such table: schema_information') > -1) {
                          console.log('[database] migrating to version 1');
                          eventBus.emit('tangled_notify_message', {
                              message  : `[database] migrating main database to version 1`,
                              is_sticky: true,
                              timestamp: Date.now()
                          });
                          return schema.migrate(1)
                                       .then(() => this._migrateTables())
                                       .then(() => resolve());
                      }
                      else {
                          eventBus.emit('tangled_notify_message', {
                              message  : `[database] migration error: version ${newVersion}\n(${err.message || err})`,
                              is_sticky: true,
                              timestamp: Date.now()
                          });
                          throw Error('[database] migration ' + err.message);
                      }
                  });
        });
    }

    initialize() {
        if (config.DATABASE_ENGINE === 'sqlite') {
            return this.initializeTangledBot()
                       .then(() => this._migrateTables())
                       .then(() => this._initializeTables());
        }
        return Promise.resolve();
    }

    close() {
        return new Promise(resolve => {
            async.waterfall([
                (callback) => {
                    if (this.database) {
                        this.database.close((err) => {
                            if (err) {
                                console.error(err.message);
                            }
                            console.log('Close the tangled bot database connection.');
                            callback();
                        });
                    }
                    else {
                        callback();
                    }
                }
            ], () => resolve());
        });
    }

    checkup() {
        return new Promise(resolve => {
            async.eachSeries(_.keys(this.repositories), (repositoryName, callback) => {
                if (this.repositories[repositoryName].checkup) {
                    this.repositories[repositoryName].checkup().then(() => callback());
                }
                else {
                    callback();
                }
            }, () => resolve());
        });
    }
}


export default new Database();
