import database from '../../../database/database';
import logger from '../../logger';


export class BotStrategy {

    constructor(strategy, symbol, symbolGUID, orderTTL, name) {
        this.strategy         = strategy;
        this.symbol           = symbol;
        this.symbolGUID       = symbolGUID;
        this.orderTTL         = orderTTL;
        this.logger           = logger.getLogger(name);
        this.lastRunTimestamp = strategy.last_run_timestamp;
        this.lastRunStatus    = strategy.last_run_status;
        this.waitTime         = 1;
    }

    setWaitTime(waitTime) {
        this.waitTime = waitTime;
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
}
