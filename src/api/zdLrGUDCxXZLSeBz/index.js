import Endpoint from '../endpoint';
import database from '../../database/database';
import ExchangeApi from '../exchange-api';


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
     * @param req (p0<api_key>, p1<exchange>)
     * @param res
     */
    handler(app, req, res) {
        const {
                  p0: apiKey,
                  p1
              } = req.method === 'POST' ? req.body : req.query;

        const exchange = this.exchangeIds[p1?.toLowerCase()];
        if (!exchange) {
            return res.status(400).send({
                api_status : 'fail',
                api_message: 'p1<exchange>[tangled.com or fiatleak.com] is required'
            });
        }

        const configRepository = database.getRepository('config');
        configRepository.upsertConfig(`${exchange}_exchange_api_key`, apiKey, 'string')
                        .then(() => {
                            ExchangeApi.get(exchange).setApiKey(apiKey);
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
