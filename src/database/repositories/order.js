import {Database} from '../database';
import _ from 'lodash';

export default class Order {
    constructor(database) {
        this.database = database;
    }

    list(where, orderBy, limit) {
        return new Promise(resolve => {
            let {
                    sql,
                    parameters
                } = Database.buildQuery('SELECT * FROM `order`', where, orderBy, limit);
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
                } = Database.buildQuery('SELECT * FROM `order`', where);
            this.database.get(sql, parameters, (err, row) => {
                resolve(row);
            });
        });
    }


    upsert(exchangeId, orderNumber, price, orderSize, orderFilled, state, action, orderType, symbol, timestamp, orderTTL, status) {
        return new Promise((resolve, reject) => {
            this.database.run(`INSERT INTO \`order\` (order_id,
                                                      exchange_id, order_number,
                                                      price,
                                                      order_size, order_filled,
                                                      state,
                                                      action, order_type,
                                                      symbol,
                                                      timestamp, order_ttl,
                                                      status)
                               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9,
                                       ?10, ?11, ?12,
                                       ?13) ON CONFLICT(exchange_id, order_number) DO
            UPDATE
                SET price = ?4, order_size = ?5, order_filled = ?6, state = ?7, order_ttl = ?12, status = ?13`, [
                Database.generateID(16),
                exchangeId,
                orderNumber,
                price,
                orderSize,
                orderFilled,
                state,
                action,
                orderType,
                symbol,
                timestamp,
                orderTTL,
                status || 1
            ], (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
}
