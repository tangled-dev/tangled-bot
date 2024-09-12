import Endpoint from '../endpoint';
import database from '../../database/database';
import async from 'async';


/**
 * api import_strategies
 */
class _nh8Ck5RTxgxYgStT extends Endpoint {
    constructor() {
        super('nh8Ck5RTxgxYgStT');
    }

    /**
     * import strategies
     * @param app
     * @param req
     * @param res
     */
    handler(app, req, res) {
        if (req.method !== 'POST') {
            return res.send({
                api_status : 'fail',
                api_message: `invalid http method ${req.method}`
            });
        }

        const {p0: strategies} = req.body;

        const strategyRepository = database.getRepository('strategy');
        async.eachSeries(strategies || [], ({
                                                strategy_description,
                                                strategy_type,
                                                order_type,
                                                order_ttl,
                                                amount,
                                                price_min,
                                                price_max,
                                                amount_traded,
                                                total_budget,
                                                extra_config,
                                                status
                                            }, callback) => {
            strategyRepository.upsert({
                strategy_description,
                strategy_type,
                order_type,
                amount,
                price_min,
                price_max,
                amount_traded,
                total_budget,
                extra_config,
                order_ttl: order_ttl || 60,
                status   : 2
            }).then(_ => callback()).catch(e => {
                console.error(e);
                callback();
            });
        }, () => res.send({
            api_status: 'success'
        }));
    }
}


export default new _nh8Ck5RTxgxYgStT();
