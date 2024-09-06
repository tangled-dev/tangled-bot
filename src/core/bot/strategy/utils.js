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
