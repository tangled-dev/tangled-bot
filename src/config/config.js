const const_value_default = {
    'FIATLEAK_EXCHANGE_API_ENDPOINT': 'https://exchange.fiatleak.com',
    'TANGLED_EXCHANGE_API_ENDPOINT' : 'https://tangled.com'
};

let environment;
try {
    environment = require('./environment');
    environment = environment.default;
}
catch (ex) {
}

function get_const_value(const_name) {
    if (!const_value_default[const_name]) {
        throw 'const_value_default is not defined for ' + const_name;
    }

    let value = const_value_default[const_name];
    if (environment && typeof (environment[const_name]) !== 'undefined') {
        value = environment[const_name];
    }

    return value;
}

export const DEBUG            = false;
export const DEBUG_LOG_FILTER = [];
export const VERSION          = '1.0.0';
export const NAME             = 'tangled-bot';
export const DATABASE_ENGINE  = 'sqlite';
export const NODE_HOST_FORCE  = false;
export const NODE_BIND_IP     = '0.0.0.0';
export const NODE_PORT_API    = 16666;

export const TANGLED_EXCHANGE_API_ENDPOINT  = get_const_value('TANGLED_EXCHANGE_API_ENDPOINT');
export const FIATLEAK_EXCHANGE_API_ENDPOINT = get_const_value('FIATLEAK_EXCHANGE_API_ENDPOINT');

export const EXCHANGE_CONFIG = {
    mlx_usdc: {
        base                       : 'millix',
        currency                   : 'usdc',
        order_price_min            : 0.000000001,
        order_price_max            : 100,
        order_price_float_precision: 9,
        order_size_float           : false,
        order_size_float_precision : 0,
        order_size_min             : 100000,
        order_size_max             : 100000000000
    },
    btc_usdc: {
        base                       : 'bitcoin',
        currency                   : 'usdc',
        order_price_min            : 0.01,
        order_price_max            : 10000000,
        order_price_float_precision: 2,
        order_size_float           : true,
        order_size_float_precision : 7,
        order_size_min             : 0.000001,
        order_size_max             : 10
    },
    eth_usdc: {
        base                       : 'ethereum',
        currency                   : 'usdc',
        order_price_min            : 0.001,
        order_price_max            : 100000,
        order_price_float_precision: 3,
        order_size_float           : true,
        order_size_float_precision : 6,
        order_size_min             : 0.000025,
        order_size_max             : 1000
    },
    pol_usdc: {
        base                       : 'polygon',
        currency                   : 'usdc',
        order_price_min            : 0.0000001,
        order_price_max            : 10000,
        order_price_float_precision: 7,
        order_size_float           : true,
        order_size_float_precision : 2,
        order_size_min             : 0.5,
        order_size_max             : 10000000
    },
    sol_usdc: {
        base                       : 'solana',
        currency                   : 'usdc',
        order_price_min            : 0.0001,
        order_price_max            : 100000,
        order_price_float_precision: 4,
        order_size_float           : true,
        order_size_float_precision : 5,
        order_size_min             : 0.0005,
        order_size_max             : 10000
    },
    xrp_usdc: {
        base                       : 'xrp',
        currency                   : 'usdc',
        order_price_min            : 0.000001,
        order_price_max            : 100000,
        order_price_float_precision: 6,
        order_size_float           : true,
        order_size_float_precision : 3,
        order_size_min             : 0.05,
        order_size_max             : 1000000
    }
};

export const DATABASE_CONNECTION       = {};
let DATA_BASE_DIR                      = './millix-tangled';
export const NODE_KEY_PATH             = DATA_BASE_DIR + '/node.json';
export const NODE_CERTIFICATE_KEY_PATH = DATA_BASE_DIR + '/node_certificate_key.pem';
export const NODE_CERTIFICATE_PATH     = DATA_BASE_DIR + '/node_certificate.pem';

if (DATABASE_ENGINE === 'sqlite') {
    DATABASE_CONNECTION.FOLDER               = DATA_BASE_DIR + '/';
    DATABASE_CONNECTION.FILENAME_TANGLED_BOT = 'tangled-bot.sqlite';
    DATABASE_CONNECTION.SCHEMA_VERSION       = '3';
}

export default {
    NAME,
    DEBUG,
    VERSION,
    NODE_KEY_PATH,
    DATABASE_ENGINE,
    DATABASE_CONNECTION,
    NODE_CERTIFICATE_PATH,
    NODE_CERTIFICATE_KEY_PATH,
    TANGLED_EXCHANGE_API_ENDPOINT,
    FIATLEAK_EXCHANGE_API_ENDPOINT,
    DEBUG_LOG_FILTER,
    NODE_HOST_FORCE,
    EXCHANGE_CONFIG,
    NODE_PORT_API,
    NODE_BIND_IP
};
