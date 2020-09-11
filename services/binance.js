const axios = require('axios')

var gPrice
var gUSDPrice

const httpClient = axios.create()
httpClient.defaults.timeout = 2500

const getLatestPrice = async () => {
    try {
        let baseSymbol = process.env.BASE_SYMBOL
        let quoteSymbol = process.env.QUOTE_SYMBOL

        if (quoteSymbol === 'TOMO') {
            let response = await httpClient.get(`https://www.binance.com/api/v3/ticker/price?symbol=TOMOBTC`)
            let tomoPrice = response.data.price

            if (baseSymbol === 'BTC') {
                gPrice = 1/tomoPrice
            } else {
                response = await httpClient.get(`https://www.binance.com/api/v3/ticker/price?symbol=${baseSymbol.toUpperCase()}BTC`)
                let tokenPrice = response.data.price

                gPrice = (1/tomoPrice) * tokenPrice
            }
            return gPrice
        }

        if ( quoteSymbol === 'USDT' ) {
            const response = await httpClient.get(`https://www.binance.com/api/v3/ticker/price?symbol=${baseSymbol.toUpperCase()}USDT`)
            gPrice = response.data.price

        } else {
            const response = await httpClient.get(
                `https://www.binance.com/api/v3/ticker/price?symbol=${baseSymbol.toUpperCase()}${quoteSymbol.toUpperCase()}`
            )
            gPrice = response.data.price
        }
    } catch (err) {
        console.log(err)
    }
    return gPrice
}

const getUSDPrice = async () => {
    let baseSymbol = process.env.BASE_SYMBOL
    try {

        if (baseSymbol != 'USDT' && baseSymbol != 'USD') {
            response = await httpClient.get(`https://www.binance.com/api/v3/ticker/price?symbol=${baseSymbol}USDT`)
            let tokenPrice = response.data.price

            gUSDPrice = tokenPrice
        } else {
            gUSDPrice = 1
        }
    } catch (err) {
        console.log(err)
    }
    return gUSDPrice
}

module.exports = { getLatestPrice, getUSDPrice }
