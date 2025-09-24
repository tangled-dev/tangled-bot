import Endpoint from '../endpoint';
import database from '../../database/database';
import ExchangeApi from '../exchange-api';


/**
 * api remove_tangled_exchange_api_key
 */
class _QBXWsEGSGthDhsLn extends Endpoint {
    constructor() {
        super('QBXWsEGSGthDhsLn');
    }

    /**
     * removes tangled exchange api key
     * @param app
     * @param req
     * @param res
     */
    handler(app, req, res) {
        const exchange = this.exchangeIds[p0?.toLowerCase()];
        if (!exchange) {
            return res.status(400).send({
                api_status : 'fail',
                api_message: 'p0<exchange>[tangled.com or fiatleak.com] is required'
            });
        }
        const configRepository = database.getRepository('config');
        configRepository.deleteConfig('tangled_exchange_api_key')
                        .then(() => {
                            ExchangeApi.get(exchange).setApiKey(undefined);
                            res.send({
                                api_status: 'success'
                            });
                        })
                        .catch(e => res.send({
                            api_status : 'fail',
                            api_message: `unexpected generic api error: (${e.message})`
                        }));
    }
}


export default new _QBXWsEGSGthDhsLn();
