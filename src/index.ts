#!/usr/bin/env node

import { Command } from 'commander'
import { balanceCommand } from './commands/account'
import { wrapCommand } from './commands/wrap'
import { unwrapCommand } from './commands/unwrap'
import { bridgeCommand } from './commands/bridge'

const program = new Command()


program
    .version('1.0.0')
    .description('A CLI interface for Wrapped Alpha')

program
    .command('account')
    .alias('a')
    .description('Check account information')
    .action(balanceCommand)


program
    .command('bridge')
    .alias('b')
    .description('Bridge Wrapped Alpha tokens between networks')
    .option('--netuid [netuid]', 'Netuid to use')
    .option('--fromChain [fromChain]', 'From chain to use')
    .option('--toChain [toChain]', 'To chain to use')
    .option('--amount [amount]', 'Amount to bridge')
    .action(bridgeCommand)
    
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
    .option('--netuid [netuid]', 'Netuid to use')
    .option('--amount [amount]', 'Amount to unwrap')
    .action(unwrapCommand)






program.parse(process.argv)