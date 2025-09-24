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

        const {
                  p0: strategies,
                  p1,
                  p2: symbol
              } = req.body;

        const exchange = this.exchangeIds[p1?.toLowerCase()];
        if (!exchange) {
            return res.status(400).send({
                api_status : 'fail',
                api_message: 'p1<exchange>[tangled.com or fiatleak.com] is required'
            });
        }

        if (!symbol) {
            return res.status(400).send({
                api_status : 'fail',
                api_message: 'p2<symbol> is required'
            });
        }

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
                exchange_id: exchange,
                symbol,
                strategy_description,
                strategy_type,
                order_type,
                amount,
                price_min,
                price_max,
                amount_traded,
                total_budget,
                extra_config,
                order_ttl  : order_ttl || 60,
                status     : 2
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
