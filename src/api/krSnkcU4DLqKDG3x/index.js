import Endpoint from '../endpoint';
import database from '../../database/database';


/**
 * api get_tangled_exchange_api_key
 */
class _krSnkcU4DLqKDG3x extends Endpoint {
    constructor() {
        super('krSnkcU4DLqKDG3x');
    }

    /**
     * returns returns tangled exchange api key if configured
     * @param app
     * @param req (p0<exchange>)
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

        const configRepository = database.getRepository('config');
        configRepository.getConfig(`${exchange}_exchange_api_key`)
                        .then(apiKey => {
                            res.send({
                                api_status              : 'success',
                                exchange_api_key: apiKey || null
                            });
                        })
                        .catch(e => res.send({
                            api_status : 'fail',
                            api_message: `unexpected generic api error: (${e})`
                        }));
    }
}


export default new _krSnkcU4DLqKDG3x();
