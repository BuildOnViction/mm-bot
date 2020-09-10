#!/usr/bin/env node

const pjson = require('./package.json')
const commander = require('commander')
const spot = require('./commands/spot')
const { prompt, Separator } = require('inquirer')
const dotenv = require('dotenv')
const ethers = require('ethers')
const path = require('path')
const fs = require('fs')
const TomoX = require('tomoxjs')

let profileDir = path.resolve(require('os').homedir(), '.mm-bot')
if (!fs.existsSync(profileDir)){
    fs.mkdirSync(profileDir)
}

let configPath = path.resolve(path.resolve(profileDir, 'config'))

commander
    .version(pjson.version)
    .allowUnknownOption()
    .option('-C --config <path>', 'set config path. defaults to $HOME/.tomojs')
    .description('MM-BOT CLI')
    .action(async (params) => {
        configPath = params.config || configPath
        dotenv.config({ path: configPath })

        if ((process.argv.indexOf('--help') < 0) && (process.argv.indexOf('init') < 0)
            && (process.argv.indexOf('info') < 0)) {
            if (!process.env.ENDPOINT || !process.env.USER_PKEY) {
                console.log('Run `mm-bot init` to setup environment')
                process.exit(1)
            }
        }
    })

if (process.argv.indexOf('--help') < 0 && process.argv.indexOf('-h') < 0) {
    commander.parseAsync(process.argv).then(() => {
        run()
    })
} else {
    run()
}

function run() {
    commander
        .command('init')
        .description('setup/init environment')
        .option('-p, --password <password>', 'password', '')
        .option('-k, --keystore <keystore>', 'path to keystore file')
        .action(async (params) => {
            const questions = [{
                type : 'input',
                name : 'baseToken',
                message : 'Enter base token address...'
            }, {
                type : 'input',
                name : 'quoteToken',
                message : 'Enter quote token address...'
            }]
            if (!params.keystore) {
                questions.push({
                    type : 'password',
                    name : 'mainPKey',
                    message : 'Enter private key for bot main wallet (default: generate random pkey)...'
                })
            }
            questions.push({
                type : 'list',
                name : 'priceProvider',
                message : 'Select the price provider:',
                default: 'pool',
                choices: ['pool', new Separator(), 'coingecko', 'binance', 'ftx']
            })
            questions.push({
                type : 'input',
                name : 'baseName',
                message : 'If price provider is coingecko, enter your base token name...',
                default: ''
            })
            questions.push({
                type : 'input',
                name : 'quoteName',
                message : 'If price provider is coingecko, enter your base quote name...',
                default: ''
            })
            prompt(questions).then(async answers => {
                try {
                    let tomojsPath = path.resolve(configPath)
                    let address = ''

                    if (params.keystore) {
                        let keydata = fs.readFileSync(params.keystore);
                        let json = JSON.parse(keydata);
                        let wallet = await ethers.Wallet.fromEncryptedJson(JSON.stringify(json), params.password)
                        answers.mainPKey = wallet.privateKey
                        address = wallet.address
                    }

                    if (!answers.mainPKey) {
                        let randomWallet = ethers.Wallet.createRandom()
                        answers.mainPKey = randomWallet.privateKey
                        address = randomWallet.address
                    } else {
                        let wallet = new ethers.Wallet(answers.mainPKey)
                        address = wallet.address
                    }
                    let relayerUrl = 'https://dex.devnet.tomochain.com'
                    let tomox = new TomoX(relayerUrl, '', answers.mainPKey)
                    let quoteSymbol = (await tomox.getTokenInfo(answers.quoteToken)).symbol
                    let baseSymbol = (await tomox.getTokenInfo(answers.baseToken)).symbol
                    fs.writeFile(
                        tomojsPath,
`MAIN_PKEY=${answers.mainPKey}
MAIN_ADDR=${address}
BASE_TOKEN=${answers.baseToken}
BASE_SYMBOL=${baseSymbol}
BASE_NAME=${answers.baseName}
QUOTE_TOKEN=${answers.baseToken}
QUOTE_SYMBOL=${quoteSymbol}
QUOTE_NAME=${answers.quoteName}
PRICE_PROVIDER=${answers.priceProvider}
RELAYER_URL=${relayerUrl}
RPC=https://rpc.devnet.tomochain.com
ORDERBOOK_LENGTH=5
BOT_SPEED=200000
WASH_SPEED=200000
ORDER_SIZE=5
WASH_ORDER_SIDE=5
ORDER_STEP=0.02`
                        , function (err) {
                        if (err) throw err;
                        console.log('Address:', address);
                        console.log('Saved!');
                    })
                } catch(e) {
                    console.log(e)
                }
            })
        })

    commander
        .command('info')
        .description('show environment')
        .action(async () => {
            let info = await TomoJS.networkInformation(process.env.ENDPOINT)
            info.configPath = configPath
            info.ChainID = info.NetworkId
            info.ENDPOINT = process.env.ENDPOINT
            info.USER_ADDR = process.env.USER_ADDR
            info.USER_PKEY = '******'
            console.log(info)
        })

    commander
        .version('1.0.0')
        .description('TomoDEX Market Marker')

    commander
        .command('spot <pair>')
        .action(async (pair) => {
            await spot.run(pair)
        })

    commander.parse(process.argv)
}

