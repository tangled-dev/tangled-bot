export const getOrderAmountAndPrice = (prices, volumes, amount, priceMin, priceMax) => {
    let aggVolume = 0;
    let price;
    for (let i = 0; i < prices.length; i++) {
        const tmpPrice = prices[i];
        if (priceMin !== null && tmpPrice < priceMin || priceMax !== null && tmpPrice > priceMax) {
            break;
        }
        price = tmpPrice;
        aggVolume += volumes[i];
        if (aggVolume >= amount) {
            break;
        }
    }
    return {
        price,
        size: Math.min(aggVolume, amount)
    };
};

export const getOrderAmountAndMarginPrice = (askPrice, bidPrice, amount, priceMin, priceMax, isBid) => {
    const delta = 0.000000001;
    let price   = parseFloat(isBid ? (bidPrice + delta).toFixed(9) : (askPrice - delta).toFixed(9));
    if (isBid) {
        if (price >= askPrice) {
            price = bidPrice;
        }
    }
    else {
        if (price <= bidPrice) {
            price = askPrice;
        }
    }
    return {
        price,
        size: amount
    };
};

export const getActionFromOrderType = (orderType) => {
    switch (orderType) {
        case 'buy':
            return 'bid';
        case 'sell':
            return 'ask';
        default:
            return orderType;
    }
};
