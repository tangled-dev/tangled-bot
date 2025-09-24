import Endpoint from '../endpoint';
import ExchangeApi from '../exchange-api';


/**
 * api get_trading_pair_stats
 */
class _T72jPyDtqeUgua2z extends Endpoint {
    constructor() {
        super('T72jPyDtqeUgua2z');
    }

    /**
     * returns the statistics for a trading pair
     * @param app
     * @param req (p0<symbol>, p1<timeFrame>, p2<exchange>)
     * @param res
     */
    handler(app, req, res) {
        const {
                  p0: symbol,
                  p1: timeFrame,
                  p2
              }        = req.query;
        const exchange = this.exchangeIds[p2?.toLowerCase()];
        if (!exchange) {
            return res.status(400).send({
                api_status : 'fail',
                api_message: 'p2<exchange>[tangled.com or fiatleak.com] is required'
            });
        }

        ExchangeApi.get(exchange).getStats(symbol, timeFrame)
                   .then(result => {
                       res.send({
                           api_status: 'success',
                           data      : result
                       });
                   })
                   .catch(e => res.send({
                       api_status : 'fail',
                       api_message: `unexpected generic api error: (${e})`
                   }));
    }
}


export default new _T72jPyDtqeUgua2z();
