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
        let arr = p.split('-')
        let baseSymbol = arr[0].toLowerCase()
        let quoteSymbol = arr[1].toLowerCase()
        if (quoteSymbol === 'usdt') {
            quoteSymbol = 'usd'
        }

        if (quoteSymbol !== 'usd') {
            let response = await httpClient.get(`https://ftx.com/api/markets/${quoteSymbol.toUpperCase()}_USD`)
            let quotePrice = response.data['result'].price

            if (baseSymbol === 'usd') {
                gPrice[p] = 1/quotePrice
            } else {
                response = await httpClient.get(`https://ftx.com/api/markets/${baseSymbol.toUpperCase()}_USD`)
                let tokenPrice = response.data['result'].price

                gPrice[p] = (1/quotePrice) * tokenPrice
            }
            return gPrice[p]
        }


        const response = await axios.get(`https://ftx.com/api/markets/${baseSymbol.toUpperCase()}_USD`)
        gPrice[p] = response.data['result'].price

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

        if (baseSymbol != 'USDT' && baseSymbol != 'USD') {
            let response = await axios.get(`https://ftx.com/api/markets/${baseSymbol.toUpperCase()}_USD`)
            let tokenPrice = response.data['result'].price
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
