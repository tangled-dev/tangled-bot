import TangledExchangeApi from '../../../api/tangled-exchange-api';
import database from '../../../database/database';
import {getOrderAmountAndPrice} from './utils';


export class BotStrategyConstant {

    constructor(strategy, symbol, symbolGUID) {
        this.strategy   = strategy;
        this.symbol     = symbol;
        this.symbolGUID = symbolGUID;
    }

    run(orderBook) {
        if (!orderBook) {
            return;
        }
        const action = this.strategy.order_type === 'buy' ? 'bid' : 'ask';
        let order    = {
            action,
            ...getOrderAmountAndPrice(action === 'bid' ? orderBook.askPrices : orderBook.bidPrices,
                action === 'bid' ? orderBook.askVolumes : orderBook.bidVolumes,
                this.strategy.amount, this.strategy.price_min, this.strategy.price_max)
        };

        const usedBudget = (this.strategy.amount_traded || 0) + order.size;
        if (!order.price || usedBudget > this.strategy.total_budget) {
            return;
        }

        this.strategy.amount_traded = usedBudget;

        // run
        const strategyRepository = database.getRepository('strategy');
        return TangledExchangeApi.insertOrder(this.symbolGUID, order)
                                 .then(order => {
                                     console.log(order);
                                     return !order.status;
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
