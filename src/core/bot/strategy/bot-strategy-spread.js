import ExchangeApi from '../../../api/exchange-api';
import database from '../../../database/database';
import {getActionFromOrderType, getSpreadOrderAmountAndPrice, logError} from './utils';
import {BotStrategy} from './bot-strategy';
import async from 'async';


export class BotStrategySpread extends BotStrategy {

    constructor(strategy, symbol, spreadPercentageFrom, spreadPercentageTo, orderTTL) {
        super(strategy, symbol, orderTTL, 'BotStrategySpread');
        this.spreadPercentageFrom = spreadPercentageFrom;
        this.spreadPercentageTo   = spreadPercentageTo;
        this.running              = false;
    }

    _getOrders(orderBook) {
        const orderType = this.strategy.order_type;
        const action    = getActionFromOrderType(orderType);
        if (action === 'both') {
            const bidOrder = {
                action: 'bid',
                ...getSpreadOrderAmountAndPrice(orderBook.askPrices[0], orderBook.bidPrices[0],
                    this.spreadPercentageFrom, this.spreadPercentageTo,
                    this.strategy.amount, this.strategy.price_min, this.strategy.price_max, true)
            };
            const askOrder = {
                action: 'ask',
                ...getSpreadOrderAmountAndPrice(orderBook.askPrices[0], orderBook.bidPrices[0],
                    this.spreadPercentageFrom, this.spreadPercentageTo,
                    this.strategy.amount, this.strategy.price_min, this.strategy.price_max, false)
            };

            if (!bidOrder.price || !askOrder.price) {
                return [];
            }

            return [
                bidOrder,
                askOrder
            ];
        }
        else {
            const order = {
                action,
                ...getSpreadOrderAmountAndPrice(orderBook.askPrices[0], orderBook.bidPrices[0],
                    this.spreadPercentageFrom, this.spreadPercentageTo,
                    this.strategy.amount, this.strategy.price_min, this.strategy.price_max, action === 'bid')
            };

            return !order.price ? [] : [order];
        }
    }

    run(orderBook) {

        if (!this.lastRunTimestamp) {
            return this.updateStrategyRunTimestamp();
        }
        else if (this.running || this.lastRunTimestamp + this.waitTime > Math.floor(Date.now() / 1000)) {
            return;
        }
        this.running = true;

        if (!orderBook || !orderBook.askPrices || !orderBook.bidPrices
            || !orderBook.askVolumes || !orderBook.bidVolumes) {
            logError(this.logger, new Error(`cannot execute: orderbook = ${JSON.stringify(orderBook)}`));
            return;
        }

        const orders = this._getOrders(orderBook);

        const usedBudget = (this.strategy.amount_traded || 0) + orders.reduce((amount, o) => o.size + amount, 0);

        if (orders.length === 0 || usedBudget > this.strategy.total_budget) {
            return this.updateStrategyRunTimestamp();
        }

        // run
        const strategyRepository = database.getRepository('strategy');
        const orderRepository    = database.getRepository('order');
        const exchangeApi        = ExchangeApi.get(this.strategy.exchange_id);
        return new Promise((resolve, reject) => {
            const insertedOrders = [];
            async.eachSeries(orders, (order, callback) => {
                exchangeApi.insertOrder(this.symbol, order)
                           .then(mOrder => {
                               let success = mOrder.status;
                               if (success) {
                                   insertedOrders.push(mOrder);
                                   orderRepository.upsert(this.strategy.exchange_id, mOrder.order_id, order.price, order.size, 0, 'ACTIVE', order.action.toUpperCase(), 'GTC', this.symbol.toUpperCase(), Math.floor(Date.now() / 1000), this.orderTTL)
                                                  .then(_ => _).catch(_ => _);
                               }
                               callback(!success ? true : null);
                           }).catch(callback);
            }, (error) => {
                if (error) {
                    if (insertedOrders.length === 1) {
                        // cancel the order that was inserted
                        const mOrder = insertedOrders[0];
                        return orderRepository.get({
                            exchange_id : this.strategy.exchange_id,
                            order_number: mOrder.order_id
                        }).then(order => {
                            if (!order) {
                                throw Error(`order_not_found: ${this.strategy.exchange_id}-${mOrder.order_id}`);
                            }
                            return exchangeApi.cancelOrder(order.symbol, order.order_id)
                                              .then(() => orderRepository.upsert(order.exchange_id, order.order_number, order.price, order.order_size, order.order_filled, order.state, order.action, order.order_type, order.symbol, order.timestamp, order.order_ttl, 2));
                        }).catch(e => logError(this.logger, e)).then(() => reject());
                    }

                    return reject();
                }
                this.strategy.amount_traded = usedBudget;
                this.lastRunTimestamp       = Math.floor(Date.now() / 1000);
                this.lastRunStatus          = 1;
                this.running                = false;
                resolve();
            });
        }).catch(() => {
            //logError(this.logger, e);
            this.lastRunTimestamp = Math.floor(Date.now() / 1000);
            this.lastRunStatus    = 0;
            this.running          = false;
        })
          .then(() => strategyRepository.upsert({
              strategy_id       : this.strategy.strategy_id,
              amount_traded     : this.strategy.amount_traded,
              last_run_timestamp: this.lastRunTimestamp,
              last_run_status   : this.lastRunStatus
          }).then(_ => _).catch(_ => _));
    }
}
