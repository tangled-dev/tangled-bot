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
     * @param req
     * @param res
     */
    handler(app, req, res) {
        const configRepository = database.getRepository('config');
        configRepository.getConfig('tangled_exchange_api_key')
                        .then(apiKey => {
                            res.send({
                                api_status              : 'success',
                                tangled_exchange_api_key: apiKey || null
                            });
                        })
                        .catch(e => res.send({
                            api_status : 'fail',
                            api_message: `unexpected generic api error: (${e})`
                        }));
    }
}


export default new _krSnkcU4DLqKDG3x();
