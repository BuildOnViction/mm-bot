'use strict'

const commander = require('commander')
const spot = require('./commands/spot')

commander
    .version('1.0.0')
    .description('TomoDEX Market Marker')

commander
    .command('spot <pair>')
    .action(async (pair) => {
        await spot.run(pair)
    })

commander.parse(process.argv)
