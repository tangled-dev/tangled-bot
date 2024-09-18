import TangledExchangeApi from '../../../api/tangled-exchange-api';
import database from '../../../database/database';
import {getActionFromOrderType, getOrderAmountAndMarginPrice, getOrderAmountAndPrice} from './utils';


export class BotStrategyConstant {

    constructor(strategy, symbol, symbolGUID, orderTTL) {
        this.strategy   = strategy;
        this.symbol     = symbol;
        this.symbolGUID = symbolGUID;
        this.orderTTL   = orderTTL;
    }

    run(orderBook) {
        if (!orderBook) {
            return;
        }
        const orderType = this.strategy.order_type;
        let order       = {
            action: getActionFromOrderType(orderType),
            ...(orderType === 'bid' || orderType === 'ask') ?
               getOrderAmountAndMarginPrice(orderBook.askPrices[0], orderBook.bidPrices[0],
                   this.strategy.amount, this.strategy.price_min, this.strategy.price_max, orderType === 'bid') :
               getOrderAmountAndPrice(orderType === 'buy' ? orderBook.askPrices : orderBook.bidPrices,
                   orderType === 'buy' ? orderBook.askVolumes : orderBook.bidVolumes,
                   this.strategy.amount, this.strategy.price_min, this.strategy.price_max)
        };

        const usedBudget = (this.strategy.amount_traded || 0) + order.size;
        if (!order.price || usedBudget > this.strategy.total_budget) {
            return;
        }

        this.strategy.amount_traded = usedBudget;

        // run
        const orderRepository    = database.getRepository('order');
        const strategyRepository = database.getRepository('strategy');
        return TangledExchangeApi.insertOrder(this.symbolGUID, order)
                                 .then(mOrder => {
                                     if (mOrder.status) {
                                         orderRepository.upsert(mOrder.order_id, order.price, order.size, 0, 'ACTIVE', order.action.toUpperCase(), 'GTC', this.symbol.toUpperCase(), Math.floor(Date.now() / 1000), this.orderTTL)
                                                        .then(_ => _).catch(_ => _);
                                     }
                                     return !mOrder.status;
                                 })
                                 .catch(_ => true)
                                 .then(error => strategyRepository.upsert({
                                     strategy_id       : this.strategy.strategy_id,
                                     amount_traded     : this.strategy.amount_traded,
                                     last_run_timestamp: Date.now(),
                                     last_run_status   : !error ? 1 : 0
                                 }).then(_ => _).catch(_ => _));
    }
}
