import {Database} from '../database';
import _ from 'lodash';

export default class Strategy {
    constructor(database) {
        this.database = database;
    }

    list(where, orderBy, limit) {
        return new Promise(resolve => {
            let {
                    sql,
                    parameters
                } = Database.buildQuery('SELECT * FROM strategy', where, orderBy, limit);
            this.database.all(sql, parameters, (err, rows) => {
                resolve(rows);
            });
        });
    }

    get(where) {
        return new Promise(resolve => {
            let {
                    sql,
                    parameters
                } = Database.buildQuery('SELECT * FROM strategy', where);
            this.database.get(sql, parameters, (err, row) => {
                resolve(row);
            });
        });
    }


    upsert(strategy) {
        return new Promise((resolve, reject) => {
            const strategyID = strategy.strategy_id === undefined ? Database.generateID(16) : strategy.strategy_id;
            this.database.run(`INSERT INTO strategy (strategy_id, strategy_description,
                                                     strategy_type, order_type,
                                                     amount,
                                                     price_min, price_max,
                                                     amount_traded,
                                                     total_budget, extra_config,
                                                     status)
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                strategyID,
                strategy.strategy_description,
                strategy.strategy_type,
                strategy.order_type,
                strategy.amount,
                strategy.price_min,
                strategy.price_max,
                strategy.amount_traded,
                strategy.total_budget,
                strategy.extra_config,
                strategy.status === undefined ? 1 : strategy.status
            ], (err) => {
                if (err) {
                    err.message.startsWith('SQLITE_CONSTRAINT') ? console.log(`[database] strategy ${strategyID} already exits`) : console.error(err.message);
                    if (!strategy.strategy_id) {
                        return reject(err.message);
                    }
                    else {
                        const set = _.pick(strategy, [
                            'strategy_description',
                            'strategy_type',
                            'order_type',
                            'amount',
                            'price_min',
                            'price_max',
                            'amount_traded',
                            'total_budget',
                            'extra_config',
                            'status'
                        ]);
                        const {
                                  sql,
                                  parameters
                              }   = Database.buildUpdate('UPDATE strategy', set, {strategy_id: strategy.strategy_id});
                        this.database.run(sql, parameters, err => {
                            console.log(`[database] update strategy with id ${strategy.strategy_id}`);
                            return err ? reject(err.message) : this.get({strategy_id: strategyID}).then(resolve).catch(reject);
                        });
                        return;
                    }
                }
                this.get({strategy_id: strategyID}).then(resolve).catch(reject)
            });
        });
    }

    update(strategy) {
        return new Promise((resolve, reject) => {
            const set = _.pick(strategy, [
                'strategy_description',
                'strategy_type',
                'order_type',
                'amount',
                'price_min',
                'price_max',
                'amount_traded',
                'total_budget',
                'extra_config',
                'status'
            ]);
            const {
                      sql,
                      parameters
                  }   = Database.buildUpdate('UPDATE strategy', set, {strategy_id: strategy.strategy_id});
            this.database.run(sql, parameters, err => {
                console.log(`[database] update strategy ${strategy.strategy_description} with id ${strategy.strategy_id}`);
                return err ? reject() : resolve();
            });
        });
    }

}
