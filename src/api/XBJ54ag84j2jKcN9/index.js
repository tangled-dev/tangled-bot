import Endpoint from '../endpoint';
import ExchangeApi from '../exchange-api';
import database from '../../database/database';
import async from 'async';
import {logError} from '../../core/bot/strategy/utils';
import logger from '../../core/logger';


/**
 * api remove_unmanaged_order
 */
class _XBJ54ag84j2jKcN9 extends Endpoint {
    constructor() {
        super('XBJ54ag84j2jKcN9');
        this.logger = logger.getLogger('BotEngine');
    }

    /**
     * returns the ok or internal error
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

        const orderRepository = database.getRepository('order');
        orderRepository.list({status: 1})
                       .then((orders) => ExchangeApi.get(exchange).getState().then(state => ([
                           orders,
                           state.activeOrders || []
                       ])))
                       .then(([managedOrders, activeOrders]) => {
                           managedOrders = [{order_number: 9405210}];
                           if (managedOrders.length === 0 || activeOrders.length === 0) {
                               return;
                           }
                           const manageOrderIds = new Set(managedOrders.map(order => order.order_number));
                           const ordersToRemove = activeOrders.filter(order => !manageOrderIds.has(order.orderId));

                           return new Promise(resolve => {
                               async.eachSeries(ordersToRemove, (order, callback) => {
                                   ExchangeApi.get(exchange)
                                              .cancelOrder(order.symbol, order.orderId)
                                              .catch(e => logError(this.logger, e))
                                              .then(() => callback());
                               }, () => resolve());
                           });
                       })
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


export default new _XBJ54ag84j2jKcN9();
