import task from '../task';
import TangledExchangeApi from '../../api/tangled-exchange-api';
import database from '../../database/database';
import {BotStrategyConstant} from './strategy/bot-strategy-constant';
import {BotStrategyPriceChange} from './strategy/bot-strategy-price-change';


class BotEngine {

    static MLX_USDC      = 'mlx_usdc';
    static MLX_USDC_GUID = 'ci6Sm2cKL';

    constructor() {
        this.initialized         = false;
        this.onOrderBookCallback = [];
    }

    fetchOrderBook() {
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
            waitTime    = JSON.parse(strategy.extra_config).frequency;
            botStrategy = new BotStrategyConstant(strategy, BotEngine.MLX_USDC, BotEngine.MLX_USDC_GUID);
        }
        else if (strategy.strategy_type === 'strategy-price-change') {
            const extraConfig = JSON.parse(strategy.extra_config);
            waitTime          = extraConfig.time_frame;
            botStrategy       = new BotStrategyPriceChange(strategy, BotEngine.MLX_USDC, BotEngine.MLX_USDC_GUID, extraConfig.price_change_percentage);
            this.onOrderBookCallback.push(orderBook => botStrategy.setLastPrice(orderBook));
        }
        else {
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

    registerTask(apiKey) {
        TangledExchangeApi.setApiKey(apiKey);

        task.scheduleTask('get_order_book', this.fetchOrderBook.bind(this), 1000, true);

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
        for (const taskId of this.registeredTasks) {
            task.removeTask(taskId);
        }
        this.initialized = false;
    }
}


export default new BotEngine();
