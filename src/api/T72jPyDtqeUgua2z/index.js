import Endpoint from '../endpoint';
import TangledExchangeApi from '../tangled-exchange-api';


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
     * @param req
     * @param res
     */
    handler(app, req, res) {
        const {
                  p0: symbol,
                  p1: timeFrame
              } = req.query;
        TangledExchangeApi.getStats(symbol, timeFrame)
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
