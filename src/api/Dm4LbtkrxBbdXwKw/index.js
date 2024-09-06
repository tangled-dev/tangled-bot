import Endpoint from '../endpoint';
import database from '../../database/database';
import BotEngine from '../../core/bot/bot-engine';


/**
 * api upsert_strategy
 */
class _Dm4LbtkrxBbdXwKw extends Endpoint {
    constructor() {
        super('Dm4LbtkrxBbdXwKw');
    }

    /**
     * insert or update strategy by id
     * @param app
     * @param req
     * @param res
     */
    handler(app, req, res) {
        const {
                  p0 : strategy_id,
                  p1 : strategy_description,
                  p2 : strategy_type,
                  p3 : order_type,
                  p4 : amount,
                  p5 : price_min,
                  p6 : price_max,
                  p7 : amount_traded,
                  p8 : total_budget,
                  p9 : extra_config,
                  p10: status
              } = req.method === 'POST' ? req.body : req.query;

        const strategyRepository = database.getRepository('strategy');
        strategyRepository.upsert({
            strategy_id,
            strategy_description,
            strategy_type,
            order_type,
            amount,
            price_min,
            price_max,
            amount_traded,
            total_budget,
            extra_config,
            status
        }).then(strategy => {

            if (!strategy_id) {
                BotEngine.registerStrategyTask(strategy);
            }
            else if (strategy.status === 1) {
                BotEngine.reloadStrategyTask(strategy);
            }
            else {
                BotEngine.unRegisterStrategyTask(strategy);
            }

            res.send({
                api_status: 'success',
                strategy
            });
        }).catch(e => res.send({
            api_status : 'fail',
            api_message: `unexpected generic api error: (${e})`
        }));
    }
}


export default new _Dm4LbtkrxBbdXwKw();
