import axios from 'axios';
import config from '../config/config';

const api = axios.create({
    baseURL: config.EXCHANGE_API_ENDPOINT
});


/*
 type OrderState = "NEW" | "ACTIVE" | "PARTIALLY_FILLED" | "COMPLETED" | "CANCELLED" | "REJECTED";
 type OrderAction = "BID" | "ASK";
 type OrderType = "GTC" | "IOC" | "IOC_BUDGET" | "FOK" | "FOK_BUDGET";
 type Symbol = "MLX_USDC";
 type TimeFrame = 'M1' | 'M5' | 'M15' | 'H1' | 'H4' | 'D1' | 'W1';
 type Order = {
 price: number;
 size: number;
 userCookie: number;
 action: OrderAction;
 orderType: OrderType;
 deals: any;
 }
 */

class TangledExchangeApi {

    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }

    _withApiKey(url) {
        if (!this.apiKey) {
            throw Error('tangled_exchange_api_key_not_configured');
        }
        console.log(`${url}&api_token=${this.apiKey}`);
        return `${url}&api_token=${this.apiKey}`;
    }

    async getState() {
        return (await api.get(this._withApiKey(`/api_public.php?endpoint=exchange_get_user_state`))).data;
    }

    async getOrderBook(symbol, depth = 100) {
        return (await api.get(this._withApiKey(`/api_public.php?endpoint=exchange_get_order_book&currency_pair_name=${symbol}&depth=${depth}`))).data;
    }

    async listOpenOrders(symbol, timestamp = Math.floor(Date.now() / 1000), limit = 100) {
        return (await api.get(this._withApiKey(`/api_public.php?endpoint=exchange_get_order_list&currency_pair_name=${symbol}&timestamp=${timestamp}&limit=${limit}`))).data;
    }

    async listTrades(symbol, timestamp = Math.floor(Date.now() / 1000), limit = 100) {
        return (await api.get(this._withApiKey(`/api_public.php?endpoint=exchange_get_trade_list&currency_pair_name=${symbol}&timestamp=${timestamp}&limit=${limit}`))).data;
    }

    async getStats(symbol, timeFrame) {
        return (await api.get(this._withApiKey(`/api_public.php?endpoint=exchange_get_currency_pair_stat&currency_pair_name=${symbol}&time_frame=${timeFrame}`))).data;
    }

    async insertOrder(symbolGUID, order) {
        return (await api.post(this._withApiKey(`/api_public.php?endpoint=exchange_insert_order`), {
            currency_pair_guid: symbolGUID,
            amount            : order.size,
            price             : order.price,
            action            : order.action
        })).data;
    }

    async cancelOrder(symbol, orderId) {
        return (await api.post(this._withApiKey(`/api_public.php?endpoint=exchange_cancel_order`), {
            currency_pair_name: symbol,
            order_id          : orderId
        })).data;
    }
}


export default new TangledExchangeApi;
