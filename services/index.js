const Binance = require('./binance')
const Ftx = require('./ftx')
const Coingecko = require('./coingecko')
const Pool = require('./pool')

module.exports = (priceProvider = 'binance', p = false) => {
    switch(priceProvider) {
    case 'binance':
        return Binance
    case 'ftx':
        return Ftx
    case 'coingecko':
        return Coingecko
    case 'pool':
        Pool.init()
        return Pool
    default:
        return Binance
    }
}
