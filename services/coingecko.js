const axios = require('axios')
const config = require('config')

const gPrice = {}
const gUSDPrice = {}

const httpClient = axios.create()
httpClient.defaults.timeout = 2500

const getLatestPrice = async (p = false) => {
    try {

        if (p && (config[p] || {}).price) {
            return config[p].price
        }
        let baseName = config[p].baseName
        let quoteName = config[p].quoteName
        let arr = p.split('-')
        let baseSymbol = arr[0].toLowerCase()
        let quoteSymbol = arr[1].toLowerCase()
        if (quoteSymbol === 'usdt') {
            quoteSymbol = 'usd'
        }

        if ( quoteSymbol === 'usd' ) {
            const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${baseName}&vs_currencies=usd`)
            gPrice[p] = response.data[baseName].usd
        } else {
            const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${baseName},${quoteName}&vs_currencies=usd`)
            gPrice[p] = (1/response.data[quoteName].usd) * response.data[baseName].usd
        }

    } catch (err) {
        console.log(err)
    }
    return gPrice[p]
}

const getUSDPrice = async (p = false) => {
    let baseSymbol = 'TOMO'
    try {
        if (p && (config[p] || {}).price) {
            return config[p].price
        }

        let arr = p.split('-')
        baseSymbol = arr[0].toUpperCase()
        let baseName = config[p].baseName

        if (baseSymbol != 'USDT' && baseSymbol != 'USD') {
            let response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${baseName}&vs_currencies=usd`)
            let tokenPrice = response.data[baseName].usd
            gUSDPrice[baseSymbol] = tokenPrice
        } else {
            gUSDPrice[baseSymbol] = 1
        }

    } catch (err) {
        console.log(err)
    }
    return gUSDPrice[baseSymbol]
}

module.exports = { getLatestPrice, getUSDPrice }
