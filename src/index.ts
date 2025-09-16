#!/usr/bin/env node

import { Command } from 'commander'
import { balanceCommand } from './commands/balance'

const allowedNetuids: Record<string, boolean> = {
    '1': true,
    '2': true,
    '3': true
}

const allowedNetworks: Record<string, { psudeonyms: string[], rpcUrls: string[] }> = {
    'eth': {
        psudeonyms: ['ethereum', 'eth'],
        rpcUrls: ['https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID']
    },
    'tao': {
        psudeonyms: ['subtensor', 'bittensor', 'tao'],
        rpcUrls: ['https://lite.chain.opentensor.ai']
    }
}

const program = new Command()


program
    .version('1.0.0')
    .description('A CLI interface for Wrapped Alpha')

program
    .command('wrap')
    .alias('w')
    .description('Acquire Wrapped Alpha tokens with TAO')
    .option('--netuid <netuid>', 'Netuid to use')
    .option('--network <network>', 'Network to use')
    .action((options: { netuid?: string }) => {
        if (!options.netuid || !allowedNetuids[options.netuid]) { console.error(`Netuid ${options.netuid ?? ''} is not allowed.`); process.exit(1) }

        // wrap logic placeholder
        console.warn('Wrap command is not implemented yet.')
    })

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