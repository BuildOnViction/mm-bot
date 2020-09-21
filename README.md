# mm-bot

# Requirements
- nodejs 10+

## Setup
Using source code
```
npm install
```

Using `mm-bot` binary
```
wget https://github.com/tomochain/mm-bot/releases/download/${MM_BOT_VERSION}/mm-bot.${MM_BOT_VERSION}.linux-x64 \
    && chmod +x mm-bot.${MM_BOT_VERSION}.linux-x64 \
    && mv mm-bot.${MM_BOT_VERSION}.linux-x64 /usr/bin/mm-bot
```

## Usage

Step 1: Init bot by command:

```
mm-bot init
```

The bot will ask you to setup the bot configuration.

You can get base token, quote token information from [TomoDEX pair data](https://dex.tomochain.com/api/pairs)


You can re-check the bot configuration:
```
mm-bot info
```

Step 2: Send quote token, base token to the main address of the bot.

For example, you want to run bot for pair FRONT/USDT. You have to send at least 1000 USD (in FRONT) and 1000 USDT to the main address.


Step 3: Run bot
```
mm-bot start
```


## Configuration
You can update the bot configuration file (`${HOME}/.mm-bot/config`)to custom your bot.
```
MAIN_PKEY=xxx // private of the main wallet
RANDOM_PKEYS=xxx // private key of wash wallets for wash trade
MAIN_ADDR=0x726DA688e2e09f01A2e1aB4c10F25B7CEdD4a0f3
BASE_TOKEN=0xAad540ac542C3688652a3fc7b8e21B3fC1D097e9 // base token address
BASE_SYMBOL=ETH // base token symbol
BASE_NAME=undefined // base token name, requires for coingecko price provider
QUOTE_TOKEN=0x45c25041b8e6CBD5c963E7943007187C3673C7c9 // quote token address
QUOTE_SYMBOL=USDT // quote token symbol
QUOTE_NAME=undefined // quote token name, requires for coingecko price provider
PRICE_PROVIDER=ftx // price provider FTX, BINANCE, COINGECKO, POOL (self price provider)
RELAYER_URL=https://dex.tomochain.com // DEX URL
RPC_URL=https://rpc.tomochain.com // RPC URL
ORDERBOOK_LENGTH=10 // number of orders that will be created by the bot in SELL/BUY side
SEED_PRICE=undefined // seed price for pool, requires for pool price provider
BOT_SPEED=200000 // speed (ms) to reload the bot (update price, cancel, create orders)
WASH_SPEED=200000 // speed (ms) to wash trade
ORDER_SIZE=5 // side of the order in USD
RANDOM_RANGE=50 // percentage for range of side of the orders
WASH_ORDER_SIZE=5 // side of the wash orders
ORDER_STEP=0.02 // Step of orders in per side. Next order = order * (1 +step)

// configuration for uniswap price provider only
BASE_ERC20_ADDRESS= // address of baseToken on Ethereum network
BASE_ERC20_DECIMAL= // decimal of baseToken on Ethereum network
QUOTE_ERC20_ADDRESS= // address of quoteToken on Ethereum network
QUOTE_ERC20_DECIMAL= // decimal of quoteToken on Ethereum network

INFURA_API_KEY= // to retrieve price from uniswap
```

**Run as a service with `pm2`**
```
pm2 start --name MMBOT mm-bot -- start
```

## Contribution
Feel free to create an issue or PR
