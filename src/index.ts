#!/usr/bin/env node

import { Command } from 'commander'
import { balanceCommand } from './commands/balance'
import { allowedNetuids } from './helpers/netuids'
import { wrapCommand } from './commands/wrap'

const program = new Command()


program
    .version('1.0.0')
    .description('A CLI interface for Wrapped Alpha')

program
    .command('wrap')
    .alias('w')
    .description('Acquire Wrapped Alpha tokens with TAO')
    .option('--netuid [netuid]', 'Netuid to use')
    .option('--network [network]', 'Network to use')
    .option('--amount [amount]', 'Amount to wrap')
    .action(wrapCommand)

program
    .command('unwrap')
    .alias('u')
    .description('Unwrap Wrapped Alpha tokens back to TAO')
    .option('--netuid <netuid>', 'Netuid to use')
    .action((options: { netuid?: string }) => {
        if (!options.netuid || !allowedNetuids[options.netuid]) { console.error(`Netuid ${options.netuid ?? ''} is not allowed.`); process.exit(1) }
        // unwrap logic placeholder
        console.warn('Unwrap command is not implemented yet.')
    })

program
    .command('balance')
    .alias('bal')
    .alias('b')
    .description('Check balance of Wrapped Alpha tokens')
    .action(balanceCommand)




program.parse(process.argv)