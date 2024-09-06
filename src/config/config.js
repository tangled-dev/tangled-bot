const const_value_default = {
    'EXCHANGE_API_ENDPOINT': 'https://tangled.com'
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

export const EXCHANGE_API_ENDPOINT = get_const_value('EXCHANGE_API_ENDPOINT');
export const DATABASE_CONNECTION   = {};
let DATA_BASE_DIR                  = './millix-tangled';
export const NODE_KEY_PATH             = DATA_BASE_DIR + '/node.json';
export const NODE_CERTIFICATE_KEY_PATH = DATA_BASE_DIR + '/node_certificate_key.pem';
export const NODE_CERTIFICATE_PATH     = DATA_BASE_DIR + '/node_certificate.pem';

if (DATABASE_ENGINE === 'sqlite') {
    DATABASE_CONNECTION.FOLDER               = DATA_BASE_DIR + '/';
    DATABASE_CONNECTION.FILENAME_TANGLED_BOT = 'tangled-bot.sqlite';
    DATABASE_CONNECTION.SCHEMA_VERSION       = '1';
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
    EXCHANGE_API_ENDPOINT,
    DEBUG_LOG_FILTER,
    NODE_HOST_FORCE,
    NODE_PORT_API,
    NODE_BIND_IP
};
