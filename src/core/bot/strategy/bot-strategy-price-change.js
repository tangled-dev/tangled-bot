import ExchangeApi from '../../../api/exchange-api';
import database from '../../../database/database';
import {getActionFromOrderType, getOrderAmountAndMarginPrice, getOrderAmountAndPrice, logError} from './utils';
import {BotStrategy} from './bot-strategy';


export class BotStrategyPriceChange extends BotStrategy {

    constructor(strategy, symbol, targetPriceChange, orderTTL) {
        super(strategy, symbol, orderTTL, 'BotStrategyPriceChange');
        this.lastPrice         = undefined;
        this.targetPriceChange = targetPriceChange;
    }
    setLastPrice(orderBook) {
        if (!orderBook) {
            return;
        }
        this.lastPrice = this.strategy.order_type === 'buy' ? orderBook.askPrices[0] : orderBook.bidPrices[0];
    }

    run(orderBook) {

        if (!this.lastRunTimestamp) {
            return this.updateStrategyRunTimestamp();
        }
        else if (this.lastRunTimestamp + this.waitTime > Math.floor(Date.now() / 1000) ) {
            return;
        }

        if (!orderBook || !orderBook.askPrices || !orderBook.bidPrices
            || !orderBook.askVolumes || !orderBook.bidVolumes || !this.lastPrice) {
            if (this.lastPrice) {
                logError(this.logger, new Error(`cannot execute: orderbook = ${JSON.stringify(orderBook)}`));
            }
            return;
        }
        const orderType    = this.strategy.order_type;
        const action       = getActionFromOrderType(orderType);
        const newLastPrice = action === 'bid' ? orderBook.askPrices[0] : orderBook.bidPrices[0];
        const change       = ((newLastPrice - this.lastPrice) / this.lastPrice) * 100;
        this.lastPrice     = newLastPrice;

        if (this.targetPriceChange > 0 && change < this.targetPriceChange || this.targetPriceChange < 0 && change > this.targetPriceChange) {
            return this.updateStrategyRunTimestamp();
        }

        let order = {
            action,
            ...(orderType === 'bid' || orderType === 'ask') ?
               getOrderAmountAndMarginPrice(orderBook.askPrices[0], orderBook.bidPrices[0],
                   this.strategy.amount, this.strategy.price_min, this.strategy.price_max, orderType === 'bid') :
               getOrderAmountAndPrice(orderType === 'buy' ? orderBook.askPrices : orderBook.bidPrices,
                   orderType === 'buy' ? orderBook.askVolumes : orderBook.bidVolumes,
                   this.strategy.amount, this.strategy.price_min, this.strategy.price_max)
        };

        const usedBudget = (this.strategy.amount_traded || 0) + order.size;
        if (!order.price || usedBudget > this.strategy.total_budget) {
            return this.updateStrategyRunTimestamp();
        }

        this.strategy.amount_traded = usedBudget;

        // run
        const orderRepository    = database.getRepository('order');
        const strategyRepository = database.getRepository('strategy');
        return ExchangeApi.get(this.symbol.exchange_id).insertOrder(this.symbol, order)
                                 .then(mOrder => {
                                     if (mOrder.status) {
                                         orderRepository.upsert(this.symbol.exchange_id, mOrder.order_id, order.price, order.size, 0, 'ACTIVE', order.action.toUpperCase(), 'GTC', this.symbol.toUpperCase(), Math.floor(Date.now() / 1000), this.orderTTL)
                                                        .then(_ => _).catch(_ => _);
                                     }
                                     this.lastRunTimestamp = Math.floor(Date.now() / 1000);
                                     this.lastRunStatus    = mOrder.status ? 1 : 0;
                                 })
                                 .catch(() => {
                                     // logError(this.logger, e);
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
