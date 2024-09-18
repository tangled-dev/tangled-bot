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


    upsert(orderNumber, price, orderSize, orderFilled, state, action, orderType, symbol, timestamp, orderTTL, status) {
        return new Promise((resolve, reject) => {
            this.database.run(`INSERT INTO \`order\` (order_id, order_number,
                                                      price,
                                                      order_size, order_filled,
                                                      state,
                                                      action, order_type,
                                                      symbol,
                                                      timestamp, order_ttl,
                                                      status)
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,
                                       ?, ?, ?) ON CONFLICT(order_number) DO
            UPDATE
                SET price = excluded.price, order_size = excluded.order_size, order_filled = excluded.order_filled, state = excluded.state, order_ttl = excluded.order_ttl, status = excluded.status`, [
                Database.generateID(16),
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
                    console.log(err);
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
}
