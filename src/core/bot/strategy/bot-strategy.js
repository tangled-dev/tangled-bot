import database from '../../../database/database';
import logger from '../../logger';
import {getRandomFloatInclusive} from './utils';
import config from '../../../config/config';


export class BotStrategy {

    constructor(strategy, symbol, orderTTL, name) {
        this.strategy            = strategy;
        this.symbol              = symbol;
        this.orderTTL            = orderTTL;
        this.logger              = logger.getLogger(name);
        this.lastRunTimestamp    = strategy.last_run_timestamp;
        this.lastRunStatus       = strategy.last_run_status;
        this.waitTime            = 1;
        this.symbolConfig        = config.EXCHANGE_CONFIG[this.symbol.toLowerCase()];
        this.externalPriceSource = undefined;
    }

    setWaitTime(waitTime) {
        this.waitTime = waitTime;
    }

    setExternalPriceSource(externalPriceSource) {
        this.externalPriceSource = externalPriceSource;
    }

    getExternalPrice(source, ticker) {
        return this.externalPriceSource?.[source]?.[ticker.toLowerCase()];
    }

    shouldTryRun() {
        const runProbability = this.strategy.extra_config.run_probability;
        if (runProbability === undefined || !Number.isFinite(runProbability)) {
            return true;
        }

        return Math.random() <= runProbability / 100.;
    }

    _getAmount() {
        const amount    = this.strategy.amount;
        const variation = this.strategy.extra_config.amount_variation;
        if (!variation) {
            return amount;
        }
        return getRandomFloatInclusive(amount - variation, amount + variation, this.symbolConfig.order_size_float_precision);
    }

    updateStrategyRunTimestamp() {
        const strategyRepository = database.getRepository('strategy');
        this.lastRunTimestamp    = Math.floor(Date.now() / 1000);
        this.lastRunStatus       = 1;
        return strategyRepository.upsert({
            strategy_id       : this.strategy.strategy_id,
            last_run_timestamp: this.lastRunTimestamp,
            last_run_status   : this.lastRunStatus
        }).then(_ => _).catch(_ => _);
    }

    fetchLastRunTimestampAndUpdateState() {
        const strategyRepository = database.getRepository('strategy');
        return strategyRepository.get({strategy_id: this.strategy.strategy_id})
                                 .then(strategy => {
                                     if (strategy && !!strategy.last_run_timestamp) {
                                         this.lastRunTimestamp = strategy.last_run_timestamp;
                                         this.lastRunStatus    = strategy.last_run_status;
                                     }
                                     else {
                                         this.lastRunTimestamp = Math.floor(Date.now() / 1000) - strategy.waitTime;
                                         this.lastRunStatus    = 1;
                                     }
                                 })
                                 .then(() => strategyRepository.upsert({
                                     strategy_id       : this.strategy.strategy_id,
                                     last_run_timestamp: this.lastRunTimestamp,
                                     last_run_status   : this.lastRunStatus
                                 })).then(_ => _).catch(_ => _);
    }

}
