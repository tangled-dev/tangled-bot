import axios from 'axios';


class FiatleakApi {
    constructor() {
        this.api = axios.create({baseURL: 'https://fiatleak.com/api'});
    }

    async getPrice(ticker) {
        const tickerParts = ticker.split('_');
        if (tickerParts.length !== 2) {
            throw new Error(`ticker ${ticker} doesn't exist`);
        }

        if (tickerParts[1] === 'usdc') {
            tickerParts[1] = 'usd';
        }

        return (await this.api.get(`/currency/pair/price/${tickerParts[0]}/${tickerParts[1]}`)).data;
    }
}


export default new FiatleakApi;
