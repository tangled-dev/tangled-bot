import Endpoint from '../endpoint';
import database from '../../database/database';


/**
 * api list_strategy
 */
class _G53BNuerqTA7LSuF extends Endpoint {
    constructor() {
        super('G53BNuerqTA7LSuF');
    }

    /**
     * returns the list of strategies
     * @param app
     * @param req
     * @param res
     */
    handler(app, req, res) {
        const {
                  p0: strategyType,
                  p1: orderBy,
                  p2: limit
              } = req.query;

        const strategyRepository = database.getRepository('strategy');
        strategyRepository.list({
            strategy_type: strategyType,
            'status!'    : 0
        }, orderBy, limit)
                          .then(strategies => {
                              res.send({
                                  api_status   : 'success',
                                  strategy_list: strategies
                              });
                          })
                          .catch(e => res.send({
                              api_status : 'fail',
                              api_message: `unexpected generic api error: (${e})`
                          }));
    }
}


export default new _G53BNuerqTA7LSuF();
