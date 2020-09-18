const getUniswapPrice = require('uniswap-price').getMidPrice

var gPrice
var gUSDPrice

const CHAIN_ID = 1
const INFURA_KEY = process.env.INFURA_KEY


// constants
const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const WETH_DECIMAL = 18
const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
const USDT_DECIMAL = 6
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const USDC_DECIMAL = 6


const getLatestPrice = async () => {
    try {
        let base = process.env.BASE_ERC20_ADDRESS,
            quote = process.env.QUOTE_ERC20_ADDRESS,
            baseDecimal = process.env.BASE_ERC2_DECIMAL,
            quoteDecimal = process.env.QUOTE_ERC20_DECIMAL

        let uniPrice = await getUniswapPrice(base, baseDecimal, quote, quoteDecimal, CHAIN_ID, INFURA_KEY)
        if (uniPrice && uniPrice.base2quote) {
            gPrice = uniPrice.base2quote
        }
    } catch (err) {
        console.log(err)
    }
    return gPrice
}

const getUSDPrice = async () => {
    let base = process.env.BASE_ERC20_ADDRESS,
        baseDecimal = process.env.BASE_ERC2_DECIMAL

    try {
        // get USDT pair
        let uniPrice = await getUniswapPrice(base, baseDecimal, USDT, USDT_DECIMAL, CHAIN_ID, INFURA_KEY)
        if (!uniPrice || !uniPrice.base2quote) {
            // get USDC pair
            uniPrice = await getUniswapPrice(base, baseDecimal, USDC, USDC_DECIMAL, CHAIN_ID, INFURA_KEY)
        }

        if (uniPrice && uniPrice.base2quote) {
            gUSDPrice = uniPrice.base2quote
        }

    } catch (err) {
        console.log(err)
    }
    return gUSDPrice
}

module.exports = {
    getLatestPrice,
    getUSDPrice
}

