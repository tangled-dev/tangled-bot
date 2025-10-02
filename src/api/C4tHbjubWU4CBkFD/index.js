import Endpoint from '../endpoint';
import ExchangeApi from '../exchange-api';


/**
 * api get_user_state
 */
class _C4tHbjubWU4CBkFD extends Endpoint {
    constructor() {
        super('C4tHbjubWU4CBkFD');
    }

    /**
     * returns the account state
     * @param app
     * @param req (p0: exchange)
     * @param res
     */
    handler(app, req, res) {
        const exchange = this.exchangeIds[req.query.p0?.toLowerCase()];
        if (!exchange) {
            return res.status(400).send({
                api_status : 'fail',
                api_message: 'p0<exchange>[tangled.com or fiatleak.com] is required'
            });
        }

        ExchangeApi.get(exchange).getState()
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


export default new _C4tHbjubWU4CBkFD();
