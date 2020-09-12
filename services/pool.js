const axios = require('axios')
const TomoX = require('tomoxjs')
const BigNumber = require('bignumber.js')

var gPrice
var gUSDPrice

const httpClient = axios.create()
httpClient.defaults.timeout = 2500

let TOKEN_DECIMALS = 1e18
let tomox = new TomoX()

const init = async ()  => {
    tomox = new TomoX(process.env.RELAYER_URL, '', process.env.MAIN_PKEY)
    let d = (await tomox.getTokenInfo(process.env.QUOTE_TOKEN)).decimals
    TOKEN_DECIMALS = 10 ** parseInt(d)
    gPrice = process.env.TOKEN_PRICE
}

const getLatestPrice = async () => {
    try {
        const orderBookData = await tomox.getOrderBook({
            baseToken: process.env.BASE_TOKEN,
            quoteToken: process.env.QUOTE_TOKEN
        })
        let bestAsk = new BigNumber(orderBookData.asks[0].pricepoint)
        let bestBid = new BigNumber(orderBookData.bids[0].pricepoint)

        let price = bestAsk.plus(bestBid).dividedBy(2)
        gPrice = price.dividedBy(TOKEN_DECIMALS).toFixed(8)

    } catch (err) {
        console.log('Can not get price from orderbook data')
    }
    return gPrice
}

const getUSDPrice = async () => {
    let baseSymbol = process.env.BASE_SYMBOL
    let quoteSymbol = process.env.QUOTE_SYMBOL
    try {
        if (baseSymbol != 'USDT' && baseSymbol != 'USD') {
            if (quoteSymbol != 'USDT') {
                let quoteMarket = await tomox.getMarket({
                    baseToken: process.env.BASE_TOKEN,
                    quoteToken: process.env.QUOTE_TOKEN
                })
                gUSDPrice = parseFloat(gPrice) * parseFloat(quoteMarket.closeBaseUsd)
            } else {
                gUSDPrice = gPrice
            }

        } else {
            gUSDPrice = 1
        }
    } catch (err) {
        console.log('Can not get price in USD from orderbook data')
    }
    return gUSDPrice
}

module.exports = { init, getLatestPrice, getUSDPrice }
