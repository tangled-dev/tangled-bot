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

export const logError = (logger, error) => {
    if (error.response) {
        // The server responded with a status code outside the 2xx range
        logger.error('Error code:' + error.code);
        logger.error('Error status:' + error.response.status);
        logger.error('Error data:' + JSON.stringify(error.response?.data || ''));
    }
    else if (error.request) {
        // No response was received
        logger.error('Error code:' + error.code);
        logger.error('No response received');
    }
    else {
        // Other errors
        logger.error('Error message:' + JSON.stringify(error?.message || ''));
    }
    logger.error(error);
    logger.error(JSON.stringify(error));
};
