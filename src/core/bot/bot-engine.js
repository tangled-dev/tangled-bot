import task from '../task';
import ExchangeApi from '../../api/exchange-api';
import database from '../../database/database';
import {BotStrategyConstant} from './strategy/bot-strategy-constant';
import {BotStrategyPriceChange} from './strategy/bot-strategy-price-change';
import async from 'async';
import logger from '../logger';
import {logError} from './strategy/utils';
import _ from 'lodash';
import {BotStrategySpread} from './strategy/bot-strategy-spread';


class BotEngine {

    static MLX_USDC = 'mlx_usdc';
    static POL_USDC = 'pol_usdc';
    static ETH_USDC = 'eth_usdc';
    static BTC_USDC = 'btc_usdc';
    static XRP_USDC = 'xrp_usdc';
    static SOL_USDC = 'sol_usdc';

    static SUPPORTED_TRADING_PAIRS_BY_EXCHANGE = {
        'fiatleak': [
            BotEngine.MLX_USDC,
            BotEngine.POL_USDC,
            BotEngine.ETH_USDC,
            BotEngine.BTC_USDC,
            BotEngine.XRP_USDC,
            BotEngine.SOL_USDC
        ],
        'tangled' : [BotEngine.MLX_USDC]
    };

    constructor() {
        this.initialized         = false;
        this.orderBooks          = {};
        this.onOrderBookCallback = {};
        this._initializeExchangeSymbolsValues(this.orderBooks, undefined);
        this._initializeExchangeSymbolsValues(this.onOrderBookCallback, []);
    }

    _initializeExchangeSymbolsValues(ref, value) {
        _.keys(BotEngine.SUPPORTED_TRADING_PAIRS_BY_EXCHANGE).forEach(exchange => {
            _.each(BotEngine.SUPPORTED_TRADING_PAIRS_BY_EXCHANGE[exchange], symbol => {
                if (!ref[exchange]) {
                    ref[exchange] = {};
                }
                if (!ref[exchange][symbol]) {
                    ref[exchange][symbol] = value;
                }
            });
        });
    }

    _applyExchangeSymbols(fun) {
        _.keys(BotEngine.SUPPORTED_TRADING_PAIRS_BY_EXCHANGE).forEach(exchange => {
            _.each(BotEngine.SUPPORTED_TRADING_PAIRS_BY_EXCHANGE[exchange], symbol => {
                fun && fun(exchange, symbol);
            });
        });
    }

    fetchOrderBookTask(exchange, symbol) {
        return ExchangeApi.get(exchange).getOrderBook(symbol)
                          .then(orderBook => {
                              this.orderBooks[exchange][symbol] = orderBook;
                              if (orderBook && this.onOrderBookCallback[exchange][symbol].length > 0) {
                                  this.onOrderBookCallback[exchange][symbol].forEach(callback => callback(orderBook));
                                  this.onOrderBookCallback[exchange][symbol] = [];
                              }
                          })
                          .catch(e => logError(this.logger, e));
    }

    initialize() {
        if (this.initialized) {
            return;
        }
        this.initialized     = true;
        this.registeredTasks = [];
        this.logger          = logger.getLogger('BotEngine');

        this.logger.debug('bot initialized - v0.1');
        return this.registerTask();
    }

    registerStrategyTask(strategy) {
        if (!strategy) {
            return;
        }
        const taskId = `bot-strategy-${strategy.strategy_id}`;
        let waitTime;
        let botStrategy;
        strategy.extra_config = JSON.parse(strategy.extra_config);
        if (strategy.strategy_type === 'strategy-constant') {
            waitTime    = strategy.extra_config.time_frequency;
            botStrategy = new BotStrategyConstant(strategy, strategy.symbol, strategy.order_ttl);
        }
        else if (strategy.strategy_type === 'strategy-price-change') {
            waitTime          = strategy.extra_config.time_frame;
            botStrategy       = new BotStrategyPriceChange(strategy, strategy.symbol, strategy.extra_config.price_change_percentage, strategy.order_ttl);
            this.onOrderBookCallback[strategy.exchange_id][strategy.symbol].push(orderBook => botStrategy.setLastPrice(orderBook));
        }
        else if (strategy.strategy_type === 'strategy-spread') {
            waitTime          = strategy.extra_config.time_frequency;
            try {
                const spreadPercentageFrom = parseFloat(strategy.extra_config.spread_percentage_begin);
                const spreadPercentageTo   = parseFloat(strategy.extra_config.spread_percentage_end);

                botStrategy = new BotStrategySpread(strategy, strategy.symbol, spreadPercentageFrom, spreadPercentageTo, strategy.order_ttl);
            }
            catch (e) {
                return;
            }
        }
        else {
            return;
        }

        if (!waitTime || !Number.isFinite(waitTime) || Number.isNaN(waitTime) || waitTime < 1) {
            return;
        }

        botStrategy.setWaitTime(waitTime);

        task.scheduleTask(taskId, async() => {
            const orderBook = this.orderBooks[strategy.exchange_id][strategy.symbol];
            if (!orderBook) {
                return;
            }
            botStrategy.run(orderBook);
        }, 1000, true);
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
                                  return new Promise(resolve => {
                                      async.eachSeries(orders, (order, callback) => {
                                          const now = Math.floor(Date.now() / 1000);
                                          if (order.timestamp + order.order_ttl < now) {
                                              ExchangeApi.get(order.exchange_id)
                                                         .cancelOrder(order.symbol, order.order_number)
                                                         .then(() => {
                                                             return orderRepository.upsert(order.exchange_id, order.order_number, order.price, order.order_size, order.order_filled, order.state, order.action, order.order_type, order.symbol, order.timestamp, order.order_ttl, 2);
                                                         })
                                                         .catch(e => logError(this.logger, e))
                                                         .then(() => callback());
                                          }
                                          else {
                                              callback();
                                          }
                                      }, () => resolve());
                                  });
                              });
    }

    registerTask() {
        return new Promise(resolve => {
            const configRepository = database.getRepository('config');
            async.eachSeries(_.keys(BotEngine.SUPPORTED_TRADING_PAIRS_BY_EXCHANGE), (exchange, callback) => {
                configRepository.getConfig(`${exchange}_exchange_api_key`)
                                .then(data => ExchangeApi.get(exchange).setApiKey(data.value))
                                .catch(_ => _)
                                .then(callback);
            }, resolve);
        }).then(() => {
            this._applyExchangeSymbols((exchange, symbol) => task.scheduleTask(`get_order_book_${exchange}_${symbol}`, this.fetchOrderBookTask.bind(this, exchange, symbol), 1000, true));
            task.scheduleTask('expire_orders', this.orderExpireTask.bind(this), 1000, true);

            const strategyRepository = database.getRepository('strategy');
            strategyRepository.list({'status': 1})
                              .then(strategies => {
                                  for (const strategy of strategies) {
                                      this.registerStrategyTask(strategy);
                                  }
                              })
                              .catch(e => console.error(e));
        });
    }

    stop() {
        try {
            this._applyExchangeSymbols((exchange, symbol) => task.removeTask(`get_order_book_${exchange}_${symbol}`));
            task.removeTask('expire_orders');
            for (const taskId of this.registeredTasks) {
                task.removeTask(taskId);
            }
        }
        catch (e) {
        }
        this.initialized = false;
    }
}


export default new BotEngine();
