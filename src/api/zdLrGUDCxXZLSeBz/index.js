import Endpoint from '../endpoint';
import database from '../../database/database';
import TangledExchangeApi from '../tangled-exchange-api';


/**
 * api set_tangled_exchange_api_key
 */
class _zdLrGUDCxXZLSeBz extends Endpoint {
    constructor() {
        super('zdLrGUDCxXZLSeBz');
    }

    /**
     * configures tangled exchange api key
     * @param app
     * @param req
     * @param res
     */
    handler(app, req, res) {
        const {
                  p0: apiKey
              } = req.method === 'POST' ? req.body : req.query;

        const configRepository = database.getRepository('config');
        configRepository.upsertConfig('tangled_exchange_api_key', apiKey, 'string')
                        .then(() => {
                            TangledExchangeApi.setApiKey(apiKey);
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


export default new _zdLrGUDCxXZLSeBz();
