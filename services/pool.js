const axios = require('axios')
const config = require('config')
const TomoX = require('tomoxjs')
const BigNumber = require('bignumber.js')

const gPrice = {}
const gUSDPrice = {}

const httpClient = axios.create()
httpClient.defaults.timeout = 2500

let TOKEN_DECIMALS = 1e18
let tomox = new TomoX()

const init = async (p)  => {
    tomox = new TomoX(config.get('relayerUrl'), '', config[p].pkey)
    const orderBookData = await tomox.getOrderBook({
        baseToken: config[p].baseToken,
        quoteToken: config[p].quoteToken
    })
    let bestAsk = new BigNumber(orderBookData.asks[0].pricepoint)
    let bestBid = new BigNumber(orderBookData.bids[0].pricepoint)

    let price = bestAsk.plus(bestBid).dividedBy(2)
    let d = (await tomox.getTokenInfo(config[p].quoteToken)).decimals
    TOKEN_DECIMALS = 10 ** parseInt(d)
    gPrice[p] = price.dividedBy(TOKEN_DECIMALS).toFixed(8)

}

const getLatestPrice = async (p = false) => {
    await init(p)
    try {
        const orderBookData = await tomox.getOrderBook({
            baseToken: config[p].baseToken,
            quoteToken: config[p].quoteToken
        })
        let bestAsk = new BigNumber(orderBookData.asks[0].pricepoint)
        let bestBid = new BigNumber(orderBookData.bids[0].pricepoint)

        let price = bestAsk.plus(bestBid).dividedBy(2)
        gPrice[p] = price.dividedBy(TOKEN_DECIMALS).toFixed(8)

    } catch (err) {
        console.log(err)
    }
    return gPrice[p]
}

const getUSDPrice = async (p = false) => {
    let baseSymbol = 'TOMO'
    let quoteSymbol = 'USDT'
    try {
        if (p && (config[p] || {}).price) {
            return config[p].price
        }

        let arr = p.split('-')
        baseSymbol = arr[0].toUpperCase()
        quoteSymbol = arr[1].toUpperCase()

        if (baseSymbol != 'USDT' && baseSymbol != 'USD') {
            if (quoteSymbol != 'USDT') {
                let quoteMarket = await tomox.getMarket({
                    baseToken: config[p].quoteToken,
                    quoteToken: config[p].usdtAddress
                })
                gUSDPrice[baseSymbol] = parseFloat(gPrice[p]) * parseFloat(quoteMarket.closeBaseUsd)
            } else {
                gUSDPrice[baseSymbol] = gPrice[p]
            }

        } else {
            gUSDPrice[baseSymbol] = 1
        }
    } catch (err) {
        console.log(err)
    }
    return gUSDPrice[baseSymbol]
}

module.exports = { init, getLatestPrice, getUSDPrice }
