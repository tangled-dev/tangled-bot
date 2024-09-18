import task from '../task';
import TangledExchangeApi from '../../api/tangled-exchange-api';
import database from '../../database/database';
import {BotStrategyConstant} from './strategy/bot-strategy-constant';
import {BotStrategyPriceChange} from './strategy/bot-strategy-price-change';
import async from 'async';


class BotEngine {

    static MLX_USDC      = 'mlx_usdc';
    static MLX_USDC_GUID = 'ci6Sm2cKL';

    constructor() {
        this.initialized         = false;
        this.onOrderBookCallback = [];
    }

    fetchOrderBookTask() {
        return TangledExchangeApi.getOrderBook(BotEngine.MLX_USDC)
                                 .then(orderBook => {
                                     this.orderBook = orderBook;
                                     if (this.onOrderBookCallback.length > 0) {
                                         this.onOrderBookCallback.forEach(callback => callback(orderBook));
                                         this.onOrderBookCallback = [];
                                     }
                                 })
                                 .catch(e => console.error(e));
    }

    initialize() {
        if (this.initialized) {
            return;
        }
        this.initialized       = true;
        this.registeredTasks   = [];
        const configRepository = database.getRepository('config');
        configRepository.getConfig('tangled_exchange_api_key')
                        .then(data => this.registerTask(data.value)).catch(() => this.registerTask());
    }

    registerStrategyTask(strategy) {
        if (!strategy) {
            return;
        }
        const taskId = `bot-strategy-${strategy.strategy_id}`;
        let waitTime;
        let botStrategy;
        if (strategy.strategy_type === 'strategy-constant') {
            waitTime    = JSON.parse(strategy.extra_config).time_frequency;
            botStrategy = new BotStrategyConstant(strategy, BotEngine.MLX_USDC, BotEngine.MLX_USDC_GUID, strategy.order_ttl);
        }
        else if (strategy.strategy_type === 'strategy-price-change') {
            const extraConfig = JSON.parse(strategy.extra_config);
            waitTime          = extraConfig.time_frame;
            botStrategy       = new BotStrategyPriceChange(strategy, BotEngine.MLX_USDC, BotEngine.MLX_USDC_GUID, extraConfig.price_change_percentage, strategy.order_ttl);
            this.onOrderBookCallback.push(orderBook => botStrategy.setLastPrice(orderBook));
        }
        else {
            return;
        }

        waitTime *= 1000;

        if (!waitTime || !Number.isFinite(waitTime) || Number.isNaN(waitTime) || waitTime < 1000) {
            return;
        }

        task.scheduleTask(taskId, async() => botStrategy.run(this.orderBook), waitTime, true);
    }

    unRegisterStrategyTask(strategy) {
        task.removeTask(`bot-strategy-${strategy.strategy_id}`);
    }

    reloadStrategyTask(strategy) {
        this.unRegisterStrategyTask(strategy);
        this.registerStrategyTask(strategy);
    }

    orderExpireTask() {
        const orderRepository = database.getRepository('order');
        return orderRepository.list({status: 1}, 'create_date ASC')
                              .then(orders => {
                                  const now = Math.floor(Date.now() / 1000);
                                  return new Promise(resolve => {
                                      async.eachSeries(orders, (order, callback) => {
                                          if (order.timestamp + order.order_ttl < now) {
                                              TangledExchangeApi.cancelOrder(BotEngine.MLX_USDC, order.order_number)
                                                                .then(result => {
                                                                    console.log(result);
                                                                    orderRepository.upsert(order.order_number, order.price, order.order_size, order.order_filled, order.state, order.action, order.order_type, order.symbol, order.timestamp, order.order_ttl, 2)
                                                                                   .then(_ => callback()).catch(_ => callback());
                                                                });
                                          }
                                          else {
                                              callback();
                                          }
                                      }, () => resolve());
                                  });
                              });
    }

    registerTask(apiKey) {
        TangledExchangeApi.setApiKey(apiKey);

        task.scheduleTask('get_order_book', this.fetchOrderBookTask.bind(this), 1000, true);
        task.scheduleTask('expire_orders', this.orderExpireTask.bind(this), 1000, true);

        const strategyRepository = database.getRepository('strategy');
        strategyRepository.list({'status': 1})
                          .then(strategies => {
                              for (const strategy of strategies) {
                                  this.registerStrategyTask(strategy);
                              }
                          })
                          .catch(e => console.error(e));
    }

    stop() {
        task.removeTask('get_order_book');
        task.removeTask('expire_orders');
        for (const taskId of this.registeredTasks) {
            task.removeTask(taskId);
        }
        this.initialized = false;
    }
}


export default new BotEngine();
