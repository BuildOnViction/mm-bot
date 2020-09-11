const axios = require('axios')
const config = require('config')

var gPrice
var gUSDPrice

const httpClient = axios.create()
httpClient.defaults.timeout = 2500

const getLatestPrice = async () => {
    try {
        let baseName = process.env.BASE_NAME
        let quoteName = process.env.QUOTE_NAME
        let baseSymbol = process.env.BASE_SYMBOL
        let quoteSymbol = process.env.QUOTE_SYMBOL
        if (quoteSymbol === 'usdt') {
            quoteSymbol = 'usd'
        }

        if ( quoteSymbol === 'usd' ) {
            const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${baseName}&vs_currencies=usd`)
            gPrice = response.data[baseName].usd
        } else {
            const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${baseName},${quoteName}&vs_currencies=usd`)
            gPrice = (1/response.data[quoteName].usd) * response.data[baseName].usd
        }

    } catch (err) {
        console.log(err)
    }
    return gPrice
}

const getUSDPrice = async () => {
    let baseSymbol = process.env.BASE_SYMBOL
    try {

        let baseName = process.env.BASE_NAME

        if (baseSymbol != 'USDT' && baseSymbol != 'USD') {
            let response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${baseName}&vs_currencies=usd`)
            let tokenPrice = response.data[baseName].usd
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
