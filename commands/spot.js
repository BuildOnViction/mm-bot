const TomoX = require('tomoxjs')
const TomoJS = require('tomojs')
const BigNumber = require('bignumber.js')
const config = require('config')
const { calcPrecision } = require('../utils')
const { getLatestPrice, getUSDPrice } = require('../services')(config.get('priceProvider'))

let defaultAmount = 1 // TOMO
let defaultMatchedAmount = 1
let minimumPriceStepChange = 1 // TOMO
let buyMinimumPriceStepChange = 1 // TOMO
let sellMinimumPriceStepChange = 1 // TOMO
let randomRange = 20
let FIXA = 5 // amount decimals
let FIXP = 7 // price decimals
let ORDERBOOK_LENGTH = config.get('orderbookLength') // number of order in orderbook
let BUY_ORDERBOOK_LENGTH = config.get('orderbookLength')
let SELL_ORDERBOOK_LENGTH = config.get('orderbookLength')
let tomox = new TomoX()
let pair = 'TOMO-BTC'
let baseToken = 'TOMO'
let quoteToken = 'BTC'
let TOKEN_DECIMALS = 1e18
let BASE_TOKEN_DECIMALS = 1e18
let EX_DECIMALS = 1e8
let buyOrders = []
let sellOrders = []
let randomWallets = []

let sleep = (time) => new Promise((resolve) => setTimeout(resolve, time))
let sellPrices = []
let buyPrices = []
let isFirstOrder = true
let latestPrice = 0
let outOfFundWallet = ''
let balanceRate = 1

const createOrder = async (price, amount, side) => {
    let prec = calcPrecision(price)
    price = new BigNumber(price).toFixed(prec.pricePrecision)
    amount = new BigNumber(amount).toFixed(prec.amountPrecision)
    FIXP = prec.pricePrecision
    FIXA = prec.amountPrecision
    let o = await tomox.createOrder({
        baseToken: baseToken,
        quoteToken: quoteToken,
        price: price,
        amount: amount,
        side: side
    })
    console.log(`${side} pair=${pair} price=${price} amount=${amount} hash=${o.hash} nonce=${o.nonce}`)
    return o
}

const createRandomOrder = async (wallet, price, amount, side) => {
    let prec = calcPrecision(price)
    price = new BigNumber(price).toFixed(prec.pricePrecision)
    amount = new BigNumber(amount).toFixed(prec.amountPrecision)
    FIXP = prec.pricePrecision
    FIXA = prec.amountPrecision
    let o = await wallet.createOrder({
        baseToken: baseToken,
        quoteToken: quoteToken,
        price: price,
        amount: amount,
        side: side
    })
    console.log(`${side} wallet=${wallet.coinbase} pair=${pair} price=${price} amount=${amount} hash=${o.hash} nonce=${o.nonce}`)
    return o
}


const runMarketMaker = async (cancel = false) => {
    try {
        const orderBookData = await tomox.getOrderBook({ baseToken, quoteToken })
        if (!orderBookData) {
            return
        }
        latestPrice = new BigNumber(await getLatestPrice(pair)).multipliedBy(EX_DECIMALS)

        if (SELL_ORDERBOOK_LENGTH > BUY_ORDERBOOK_LENGTH) {
            latestPrice = latestPrice.minus(buyMinimumPriceStepChange)
        }

        if (SELL_ORDERBOOK_LENGTH < BUY_ORDERBOOK_LENGTH) {
            latestPrice = latestPrice.plus(sellMinimumPriceStepChange)
        }

        let oorders = (await tomox.getOrders({ baseToken, quoteToken, status: 'OPEN' })).orders
        let porders = (await tomox.getOrders({ baseToken, quoteToken, status: 'PARTIAL_FILLED' })).orders
        let orders = [...oorders, ...porders]

        sellOrders = orders.filter(o => (o.side === 'SELL'))
        buyOrders = orders.filter(o => (o.side === 'BUY'))

        let m = {}
        if (sellOrders.length >= SELL_ORDERBOOK_LENGTH
            && buyOrders.length >= BUY_ORDERBOOK_LENGTH) {
            console.log('MATCHED ORDER !!!')
            m = await match(orderBookData)
        }


        sellPrices = []
        buyPrices = []
        orderBookData.asks.forEach(a => sellPrices.push(new BigNumber(a.pricepoint).dividedBy(TOKEN_DECIMALS).toFixed(FIXP)))
        orderBookData.bids.forEach(b => buyPrices.push(new BigNumber(b.pricepoint).dividedBy(TOKEN_DECIMALS).toFixed(FIXP)))

        let buy = await fillOrderbook(BUY_ORDERBOOK_LENGTH - buyOrders.length, 'BUY', 0)
        let sell = await fillOrderbook(SELL_ORDERBOOK_LENGTH - sellOrders.length, 'SELL', (buy || {}).nonce)

        if (cancel === false) return

        await cancelOrders((sell || {}).nonce || (m || {}).nonce)
        return

    } catch (err) {
        console.log(err)
    }
    
    try {
        await cancelOrders()
    } catch (e) {
        console.log('Cancel', e)
    }
}

const findGoodPrice = (side) => {
    let i = 1
    while (true) {
        let step = (side === 'BUY') ? buyMinimumPriceStepChange.multipliedBy(i)
            : sellMinimumPriceStepChange.multipliedBy(i)
        let price = (side === 'BUY') ? latestPrice.minus(step)
            : latestPrice.plus(step)
        let pricepoint = price.dividedBy(EX_DECIMALS).toFixed(FIXP)

        if (side === 'BUY' && buyPrices.indexOf(pricepoint) < 0) {
            buyPrices.push(pricepoint)
            return price
        } else if (side !== 'BUY' && sellPrices.indexOf(pricepoint) < 0) {
            sellPrices.push(pricepoint)
            return price
        } else {
            i = i + 1
        }
    }
}

const cancelOrders = async (nonce) => {
    let lprice = latestPrice.dividedBy(EX_DECIMALS).multipliedBy(TOKEN_DECIMALS)
    let k = 1
    let smmp = sellMinimumPriceStepChange.dividedBy(EX_DECIMALS).multipliedBy(TOKEN_DECIMALS)
    sellOrders.sort((a, b) => new BigNumber(a.pricepoint).isGreaterThan(new BigNumber(b.pricepoint)) ? 1 : -1)
    let sellCancelHashes = sellOrders.filter((order, idx) => {    
        let price = new BigNumber(order.pricepoint)
        if (price.isGreaterThan(lprice.plus(smmp.multipliedBy(SELL_ORDERBOOK_LENGTH)))) {
            return true
        }
        if (price.isLessThan(lprice)) {
            return true
        }
        if (k > SELL_ORDERBOOK_LENGTH) {
            return true
        }
        if (idx === (SELL_ORDERBOOK_LENGTH - 1)) {
            return true
        }
        k++
        return false
    })
    k = 1
    let bmmp = buyMinimumPriceStepChange.dividedBy(EX_DECIMALS).multipliedBy(TOKEN_DECIMALS)
    buyOrders.sort((a, b) => new BigNumber(a.pricepoint).isGreaterThan(new BigNumber(b.pricepoint)) ? -1 : 1)
    let buyCancelHashes = buyOrders.filter((order, idx) => {
        let price = new BigNumber(order.pricepoint)
        if (price.isLessThan(lprice.minus(bmmp.multipliedBy(BUY_ORDERBOOK_LENGTH)))) {
            return true
        }
        if (price.isGreaterThan(lprice)) {
            return true
        }
        if (k > BUY_ORDERBOOK_LENGTH) {
            return true
        }
        if (idx === (BUY_ORDERBOOK_LENGTH - 1)) {
            return true
        }
        k++
        return false
    })
    let cancelHashes = [ ...sellCancelHashes, ...buyCancelHashes ]
    let hashes = cancelHashes.map(c => c.hash)
    let ret = await tomox.cancelManyOrders(hashes, (parseInt(nonce) + 1) || 0)
    ret.forEach(o => {
        console.log('CANCEL', `orderHash=${o.orderHash} orderId=${o.orderID} hash=${o.hash} nonce=${o.nonce}`)
    })
}

const fillOrderbook = async (len, side, nonce = 0) => {
    let hash = 0
    if (len <= 0) return { nonce,  hash }

    try {
        let amount = defaultAmount
        if (side === 'SELL') {
            let rate = Math.ceil(ORDERBOOK_LENGTH/BUY_ORDERBOOK_LENGTH)
            amount = amount * rate
        } else {
            let rate = Math.ceil(ORDERBOOK_LENGTH/SELL_ORDERBOOK_LENGTH)
            amount = amount * rate
        }
        let orders = []
        for (let i = 0; i < len; i++) {
            let price = findGoodPrice(side)
            let ranNum = Math.floor(Math.random() * randomRange) / 100 + 1

            let o = {
                baseToken: baseToken,
                quoteToken: quoteToken,
                price: price.dividedBy(EX_DECIMALS).toFixed(FIXP),
                amount: (amount * ranNum).toFixed(FIXA),
                side: side,
            }
            if (nonce != 0) {
                o.nonce = parseInt(nonce) + i
            }
            orders.push(o)
        }

        let ret = await tomox.createManyOrders(orders)
        orders.forEach((or, k) => {
            hash = ret[k].hash
            nonce = ret[k].nonce
            console.log(`${side} pair=${pair} price=${or.price} amount=${or.amount} hash=${ret[k].hash} nonce=${ret[k].nonce}`)
        })
        return { nonce:  parseInt(nonce) + 1, hash: hash }
    } catch (err) {
        console.log(err)
    }
}

const cancel = async (hash, nonce) => {
    const oc = await tomox.cancelOrder(hash, nonce)
    console.log('CANCEL', pair, hash, nonce)
}

const match = async (orderBookData) => {
    try {
        let bestAsk = new BigNumber(orderBookData.asks[0].pricepoint)
        let bestBid = new BigNumber(orderBookData.bids[0].pricepoint)

        let price = bestAsk.plus(bestBid).dividedBy(2)

        if (SELL_ORDERBOOK_LENGTH > BUY_ORDERBOOK_LENGTH) {
            price = bestAsk.minus(bestAsk.minus(bestBid).dividedBy(balanceRate))
        }

        if (SELL_ORDERBOOK_LENGTH < BUY_ORDERBOOK_LENGTH) {
            price = bestBid.plus(bestAsk.minus(bestBid).dividedBy(balanceRate))
        }

        let lprice = latestPrice.dividedBy(EX_DECIMALS).multipliedBy(TOKEN_DECIMALS)

        if (lprice.isGreaterThan(bestBid) && lprice.isLessThan(bestAsk)) {
            price = lprice
        }

        let wallet = randomWallets[Math.floor(Math.random() * randomWallets.length)]

        let tokenBalances = await wallet.getAccount()
        if (tokenBalances[baseToken].inOrderBalance !== '0') {
            let open = (await wallet.getOrders({ baseToken, quoteToken, status: 'OPEN' })).orders
            let pf = (await wallet.getOrders({ baseToken, quoteToken, status: 'PARTIAL_FILLED' })).orders
            let hashes = [ ...open, ...pf].map(o => o.hash)
            await wallet.cancelManyOrders(hashes)
            return {}
        }

        if (tokenBalances[quoteToken].inOrderBalance !== '0') {
            let open = (await wallet.getOrders({ baseToken, quoteToken, status: 'OPEN' })).orders
            let pf = (await wallet.getOrders({ baseToken, quoteToken, status: 'PARTIAL_FILLED' })).orders
            let hashes = [ ...open, ...pf].map(o => o.hash)
            await wallet.cancelManyOrders(hashes)
            return {}
        }

        let quoteBalance = tokenBalances[quoteToken].inUsdBalance
        let baseBalance = tokenBalances[baseToken].inUsdBalance

        let side = (parseFloat(quoteBalance) > parseFloat(baseBalance)) ? 'BUY' : 'SELL'
        let iside = (side === 'BUY') ? 'SELL' : 'BUY'

        let ROUNDING_MODE = (side === 'SELL') ? 1 : 0
        let ranNum = Math.floor(Math.random() * randomRange) / 100 + 1
        pricepoint = price
        price = price.dividedBy(TOKEN_DECIMALS).toFixed(FIXP, ROUNDING_MODE)
        amount = (defaultMatchedAmount * ranNum).toFixed(FIXA)

        if (side === 'SELL' && new BigNumber(tokenBalances[baseToken].balance).isLessThan(new BigNumber(amount).multipliedBy(10 ** tokenBalances[baseToken].decimals))) {
            amount = new BigNumber(tokenBalances[baseToken].balance).multipliedBy(95).dividedBy(100).dividedBy(10 ** tokenBalances[baseToken].decimals).toFixed(FIXA, 1)
            console.log(`SELL Use current random wallet ${wallet.coinbase} balance`, amount.toString(10))
        }

        if (side === 'BUY' && new BigNumber(tokenBalances[quoteToken].balance).dividedBy(pricepoint).isLessThan(new BigNumber(amount))) {
            amount = new BigNumber(tokenBalances[quoteToken].balance).dividedBy(pricepoint).multipliedBy(95).dividedBy(100).toFixed(FIXA, 1)
            console.log(`BUY Use current random wallet ${wallet.coinbase} balance`, amount.toString(10))
        }

        if (parseFloat(amount) < (defaultMatchedAmount/2)) {
            console.log(`Out of fund ${wallet.coinbase}`)
            outOfFundWallet = wallet.coinbase
        }

        await createRandomOrder(wallet, price, amount, side)

        let o = await createOrder(price, amount, iside)
        return o

    } catch (err) {
        console.log(err)
    }
}

const run = async (p) => {
    tomox = new TomoX(config.get('relayerUrl'), '', config[p].pkey)
    tomojs = await TomoJS.setProvider(config.get('rpc'), config[p].pkey)
    pair = p || 'BTC-TOMO'

    SELL_ORDERBOOK_LENGTH = BUY_ORDERBOOK_LENGTH = ORDERBOOK_LENGTH = config[p].orderbookLength || config.get('orderbookLength') || 5
    if (config[p].orderbookLength === 0) {
        ORDERBOOK_LENGTH = 0
    }

    baseToken = config[p].baseToken
    quoteToken = config[p].quoteToken
    defaultVolume = config[p].volume || config.volume
    defaultMatchedVolume = config[p].matchedVolume || config.matchedVolume || defaultVolume
    let randomPkeys = config[p].matches
    for (let k of randomPkeys) {
        randomWallets.push(new TomoX(config.get('relayerUrl'), '', k))
    }

    let remotePrice = parseFloat(await getLatestPrice(pair))
    latestPrice = new BigNumber(remotePrice).multipliedBy(EX_DECIMALS)
    let usdPrice = parseFloat(await getUSDPrice(pair))
    let step = config[p].step || config.step || 0.01
    buyMinimumPriceStepChange = sellMinimumPriceStepChange = minimumPriceStepChange = latestPrice.multipliedBy(step)

    let d = (await tomox.getTokenInfo(quoteToken)).decimals
    TOKEN_DECIMALS = 10 ** parseInt(d)
    d = (await tomox.getTokenInfo(baseToken)).decimals
    BASE_TOKEN_DECIMALS = 10 ** parseInt(d)

    let prec = calcPrecision(remotePrice)
    FIXP = prec.pricePrecision
    FIXA = prec.amountPrecision

    defaultAmount = parseFloat(new BigNumber(defaultVolume).dividedBy(usdPrice).toFixed(FIXA))
    defaultMatchedAmount = parseFloat(new BigNumber(defaultMatchedVolume).dividedBy(usdPrice).toFixed(FIXA))

    randomRange = config[pair].randomRange || config.randomRange|| 20
    let speed = config[pair].speed || config.speed || 50000
    let matchedSpeed = config[pair].matchedSpeed || config.matchedSpeed || speed

    let k = matchedSpeed
    let cancel = false
    let s = (speed > matchedSpeed) ? matchedSpeed : speed

    while(true) {

        if (outOfFundWallet !== '') {
            console.log(`SEND ${defaultMatchedAmount} ${pair.split('-')[0]} from ${tomojs.coinbase} to ${outOfFundWallet}`)
            if (baseToken !== '0x0000000000000000000000000000000000000001') {
                await tomojs.tomoz.transfer({
                    tokenAddress: baseToken,
                    to: outOfFundWallet,
                    amount: String(defaultMatchedAmount * 2)
                })
            } else {
                await tomojs.send({
                    address: outOfFundWallet,
                    value: String(defaultMatchedAmount * 2)
                })
            }
            outOfFundWallet = ''
        }

        buyMinimumPriceStepChange = sellMinimumPriceStepChange = minimumPriceStepChange = latestPrice.multipliedBy(step)

        let baseTokenBalance = new BigNumber((await tomox.getAccount(false, baseToken)).inUsdBalance)
        let quoteTokenBalance = new BigNumber((await tomox.getAccount(false, quoteToken)).inUsdBalance)
        balanceRate = getStepRate(baseTokenBalance, quoteTokenBalance)

        SELL_ORDERBOOK_LENGTH = BUY_ORDERBOOK_LENGTH = ORDERBOOK_LENGTH

        if (baseTokenBalance.isGreaterThan(quoteTokenBalance)) {
            buyMinimumPriceStepChange = minimumPriceStepChange.multipliedBy(balanceRate)
            if (quoteTokenBalance.isGreaterThan(new BigNumber(defaultVolume).multipliedBy(ORDERBOOK_LENGTH).multipliedBy(2))) {
                BUY_ORDERBOOK_LENGTH = ORDERBOOK_LENGTH - 1
            } else {
                BUY_ORDERBOOK_LENGTH = Math.ceil(ORDERBOOK_LENGTH/balanceRate)
            }
        } else {
            sellMinimumPriceStepChange = minimumPriceStepChange.multipliedBy(balanceRate)
            if (baseTokenBalance.isGreaterThan(new BigNumber(defaultVolume).multipliedBy(ORDERBOOK_LENGTH).multipliedBy(2))) {
                SELL_ORDERBOOK_LENGTH = ORDERBOOK_LENGTH - 1
            } else {
                SELL_ORDERBOOK_LENGTH = Math.ceil(ORDERBOOK_LENGTH/balanceRate)
            }
        }

        await runMarketMaker(cancel)
        await sleep(s)
        k = k + matchedSpeed
        if (k >= speed) {
            cancel = true
            k = matchedSpeed
            usdPrice = parseFloat(await getUSDPrice(pair))
            defaultAmount = parseFloat(new BigNumber(defaultVolume).dividedBy(usdPrice).toFixed(FIXA))
        } else {
            cancel = false
        }
    }
}

function getStepRate(baseTokenBalance, quoteTokenBalance) {
    let rate = 10 * parseFloat(baseTokenBalance.multipliedBy(2).dividedBy(quoteTokenBalance.plus(baseTokenBalance)).toFixed(FIXP))
    if (baseTokenBalance.isGreaterThan(quoteTokenBalance)) {
        rate = 10 * parseFloat(quoteTokenBalance.multipliedBy(2).dividedBy(quoteTokenBalance.plus(baseTokenBalance)).toFixed(FIXP))
    }

    for (let i = 1; i <= 10; i++) {
        if ((rate <= i) && (rate > (i - 1))) {
            return 10 - (i - 1)
        }
    }
    return 10
}

module.exports = { run }
