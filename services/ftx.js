const axios = require('axios')

var gPrice
var gUSDPrice

const httpClient = axios.create()
httpClient.defaults.timeout = 2500

const getLatestPrice = async () => {
    try {
        let baseSymbol = process.env.BASE_SYMBOL
        let quoteSymbol = process.env.QUOTE_SYMBOL
        if (quoteSymbol === 'usdt') {
            quoteSymbol = 'usd'
        }

        if (quoteSymbol !== 'usd') {
            let response = await httpClient.get(`https://ftx.com/api/markets/${quoteSymbol.toUpperCase()}_USD`)
            let quotePrice = response.data['result'].price

            if (baseSymbol === 'usd') {
                gPrice = 1/quotePrice
            } else {
                response = await httpClient.get(`https://ftx.com/api/markets/${baseSymbol.toUpperCase()}_USD`)
                let tokenPrice = response.data['result'].price

                gPrice = (1/quotePrice) * tokenPrice
            }
            return gPrice
        }


        const response = await axios.get(`https://ftx.com/api/markets/${baseSymbol.toUpperCase()}_USD`)
        gPrice = response.data['result'].price

    } catch (err) {
        console.log(err)
    }
    return gPrice
}

const getUSDPrice = async () => {
    let baseSymbol = process.env.BASE_SYMBOL
    try {

        if (baseSymbol != 'USDT' && baseSymbol != 'USD') {
            let response = await axios.get(`https://ftx.com/api/markets/${baseSymbol.toUpperCase()}_USD`)
            let tokenPrice = response.data['result'].price
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
