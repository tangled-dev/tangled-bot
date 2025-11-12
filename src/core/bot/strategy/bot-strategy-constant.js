import ExchangeApi from '../../../api/exchange-api';
import database from '../../../database/database';
import {getActionFromOrderType, getOrderAmountAndMarginPrice, getOrderAmountAndPrice, getPriceTick, getRandomFloatInclusive, logError} from './utils';
import {BotStrategy} from './bot-strategy';
import config from '../../../config/config';
import async from 'async';


export class BotStrategyConstant extends BotStrategy {

    constructor(strategy, symbol, orderTTL) {
        super(strategy, symbol, orderTTL, 'BotStrategyConstant');
    }

    _getOrders(orderBook, pricePrecision) {
        const orderType = this.strategy.order_type;
        const action    = getActionFromOrderType(orderType);
        if (action === 'ab' || action === 'ba') {

            const isBidAsk          = action === 'ba';
            const priceTick         = getPriceTick(pricePrecision);
            const orderBookAskPrice = orderBook.askPrices[0];
            const orderBookBidPrice = orderBook.bidPrices[0];

            if (orderBookAskPrice - orderBookBidPrice <= priceTick) { // cant self-trade in the spread
                return [];
            }

            const orderBookAskPriceDelta = orderBookAskPrice - priceTick;
            const orderBookBidPriceDelta = orderBookBidPrice + priceTick;
            const price1                 = getRandomFloatInclusive(orderBookBidPriceDelta, orderBookAskPriceDelta, pricePrecision);
            const price2                 = getRandomFloatInclusive(orderBookBidPriceDelta, orderBookAskPriceDelta, pricePrecision);
            const bidPrice               = Math.min(price1, price2);
            const askPrice               = Math.max(price1, price2);

            const order = getOrderAmountAndMarginPrice(askPrice, bidPrice, this._getAmount(), this.strategy.price_min, this.strategy.price_max, isBidAsk, pricePrecision, true);

            if (order.price >= orderBookAskPrice || order.price <= orderBookBidPrice) {
                return [];
            }

            const bidOrder = {
                ...order,
                action: 'bid'
            };

            const askOrder = {
                ...order,
                action: 'ask'
            };

            if (!bidOrder.price || !askOrder.price) {
                return [];
            }

            return isBidAsk ? [
                bidOrder,
                askOrder
            ] : [
                askOrder,
                bidOrder
            ];
        }
        else {
            const order = {
                action,
                ...(orderType === 'bid' || orderType === 'ask') ?
                   getOrderAmountAndMarginPrice(orderBook.askPrices[0], orderBook.bidPrices[0],
                       this._getAmount(), this.strategy.price_min, this.strategy.price_max, orderType === 'bid', pricePrecision) :
                   getOrderAmountAndPrice(orderType === 'buy' ? orderBook.askPrices : orderBook.bidPrices,
                       orderType === 'buy' ? orderBook.askVolumes : orderBook.bidVolumes,
                       this._getAmount(), this.strategy.price_min, this.strategy.price_max, pricePrecision)
            };

            return !order.price ? [] : [order];
        }
    }

    run(orderBook) {

        if (!this.lastRunTimestamp) {
            return this.fetchLastRunTimestampAndUpdateState();
        }
        else if (this.running || this.lastRunTimestamp + this.waitTime > Math.floor(Date.now() / 1000)) {
            return;
        }

        if (!this.shouldTryRun()) {
            // skip this execution
            this.lastRunTimestamp = Math.floor(Date.now() / 1000);
            return;
        }

        const symbolConfig = config.EXCHANGE_CONFIG[this.symbol.toLowerCase()];
        if (!symbolConfig) {
            return;
        }

        if (!orderBook || !orderBook.askPrices || !orderBook.bidPrices
            || !orderBook.askVolumes || !orderBook.bidVolumes) {
            logError(this.logger, new Error(`cannot execute: orderbook = ${JSON.stringify(orderBook)}`));
            return;
        }

        this.running = true;

        const orders = this._getOrders(orderBook, symbolConfig.order_price_float_precision);

        const usedBudget = (this.strategy.amount_traded || 0) + orders.reduce((amount, o) => o.size + amount, 0);

        if (orders.length === 0 || usedBudget > this.strategy.total_budget) {
            return this.updateStrategyRunTimestamp()
                       .catch(_ => _)
                       .then(() => {
                           this.running = false;
                       });
        }

        this.strategy.amount_traded = usedBudget;

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
                                   orderRepository.upsert(this.strategy.exchange_id, mOrder.order_id, order.price, order.size, 0, 'ACTIVE', order.action.toUpperCase(), 'GTC', this.symbol.toUpperCase(), Math.floor(Date.now() / 1000), this.orderTTL, orders.length > 1 ? 2 : 1)
                                                  .then(_ => _).catch(_ => _);
                               }
                               callback(!success ? true : null);
                           }).catch(callback);
            }, (error) => {
                if (error) {
                    if (insertedOrders.length === 1) {
                        // cancel the order that was inserted
                        const mOrder = insertedOrders[0];
                        return exchangeApi.cancelOrder(mOrder.symbol, mOrder.order_id)
                                          .catch(e => logError(this.logger, e)).then(() => reject());
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
            this.running          = false;
            this.lastRunTimestamp = Math.floor(Date.now() / 1000);
            this.lastRunStatus    = 0;
        })
          .then(() => strategyRepository.upsert({
              strategy_id       : this.strategy.strategy_id,
              amount_traded     : this.strategy.amount_traded,
              last_run_timestamp: this.lastRunTimestamp,
              last_run_status   : this.lastRunStatus
          }).then(_ => _).catch(_ => _));
    }
}
