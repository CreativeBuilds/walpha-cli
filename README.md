# Wrapped Alpha CLI (walpha)

A command-line interface for managing Wrapped Alpha tokens across blockchain networks. Wrap TAO tokens into Wrapped Alpha, bridge between TAO and Ethereum networks, and manage your cross-chain token balances.

## Features

- **Wrap**: Convert TAO tokens to Wrapped Alpha tokens on the TAO network
- **Unwrap**: Convert Wrapped Alpha tokens back to TAO
- **Bridge**: Transfer Wrapped Alpha tokens between TAO and Ethereum networks using LayerZero
- **Account**: View wallet balances across all supported networks

## Prerequisites

Before using walpha-cli, ensure you have:

- **Node.js**: Version 18 or higher
- **TAO Wallet**: An EVM-compatible wallet with:
  - Private key or seed phrase
  - TAO tokens for wrapping and gas fees
  - ETH for gas fees when bridging to Ethereum
- **Network Access**: Connection to TAO and Ethereum networks

## Installation

### Install from source

```bash
# Clone the repository
git clone <repository-url>
cd walpha-cli

# Install dependencies
npm install

```


## Setup

### 1. Configure your wallet

On first run, walpha will prompt you to set up your wallet. You can either:

- Enter an existing EVM-compatible private key or seed phrase
- Generate a new wallet automatically

Your credentials will be encrypted and saved to `private-key.txt` in the project directory.

**Manual setup**: Create `private-key.txt` and add your private key or seed phrase:

```
# Option 1: Seed phrase
word1 word2 word3 ... word12

# Option 2: Private key
0x1234567890abcdef...
```


### 2. Wallet Encryption

**NEW**: walpha now supports password-protected encryption for your wallet! Your private keys and seed phrases are encrypted using industry-standard AES-256-GCM encryption with password-based key derivation (PBKDF2).

#### Features

- **Automatic encryption**: New wallets are automatically encrypted with a password you set during creation
- **Migration support**: Existing plaintext wallets can be encrypted - you'll be prompted on first use
- **Password protection**: Your private keys are protected even if someone accesses your filesystem
- **One password per session**: Enter your password once when you start using the CLI

#### Password Requirements

For security, passwords must meet these requirements:
- At least 8 characters long
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)

Example: `MyWallet123`

#### Setting up encryption

**For new wallets**: You'll be prompted to set a password during wallet creation. Simply follow the prompts.

**For existing plaintext wallets**: The next time you run any command, you'll see:

```bash
$ walpha account

⚠️  Your wallet is not encrypted. It is highly recommended to encrypt it for security.
Would you like to encrypt your wallet now? (Y/n)
```

Choose 'Y' and follow the prompts to set a password. A backup of your plaintext file will be saved to `private-key.txt.backup.plaintext`.

#### Using an encrypted wallet

When you run any command, you'll be prompted for your password:

```bash
$ walpha account
Enter wallet password: ********
```

Enter your password and the command will proceed normally. You only need to enter your password once per session.

#### Important notes

- **Password recovery is impossible**: If you forget your password, you cannot recover your wallet. Keep your password safe!
- **Backup your wallet**: Before encrypting, consider backing up your plaintext `private-key.txt` somewhere secure (offline)
- **Wrong password attempts**: You have 3 attempts to enter the correct password before the CLI exits
- **Encrypted file format**: The encrypted file is stored as JSON with base64-encoded data. Don't edit it manually.

### 3. Fund your wallet

- Send TAO tokens to your EVM address (displayed on first run or with `walpha account`)
- Your TAO (SS58) address will also be displayed for receiving native TAO tokens

## Usage

### Account Information

View your wallet address, TAO balance, and all wrapped token balances across networks:

```bash
walpha account
# or shorthand
walpha a
```

**Output:**
- EVM wallet address
- TAO SS58 address
- TAO balance
- Wrapped token balances (TAO and ETH networks)

### Wrap TAO Tokens

Convert TAO tokens to Wrapped Alpha tokens:

```bash
# Interactive mode
walpha wrap

# With subnet specified
walpha wrap --netuid 77

# With amount specified
walpha wrap --netuid 77 --amount 10

# Shorthand
walpha w --netuid 77 --amount 10
```

**Options:**
- `--netuid [netuid]`: Subnet ID to wrap tokens for (e.g., 77)
- `--amount [amount]`: Amount of TAO to wrap

**Process:**
1. Select subnet (if not specified)
2. View current TAO balance
3. Enter amount to wrap
4. Confirm transaction
5. Receive Wrapped Alpha tokens (wSN{netuid})

### Unwrap Tokens

Convert Wrapped Alpha tokens back to TAO:

```bash
# Interactive mode
walpha unwrap

# With options
walpha unwrap --netuid 77 --amount 10

# Unwrap max balance (leave amount blank in interactive mode)
walpha unwrap --netuid 77

# Shorthand
walpha u --netuid 77
```

**Options:**
- `--netuid [netuid]`: Subnet ID to unwrap tokens from
- `--amount [amount]`: Amount to unwrap (leave blank for max balance)

### Bridge Between Chains

Transfer Wrapped Alpha tokens between TAO and Ethereum networks using LayerZero:

```bash
# Interactive mode
walpha bridge

# With options
walpha bridge --netuid 77 --fromChain tao --toChain eth

# Shorthand
walpha b --netuid 77
```

**Options:**
- `--netuid [netuid]`: Subnet ID
- `--fromChain [chain]`: Source chain (tao or eth)
- `--toChain [chain]`: Destination chain (tao or eth)
- `--amount [amount]`: Amount to bridge

**Process:**
1. Select subnet, source chain, and destination chain
2. View available wrapped token balances
3. Select token to bridge
4. Enter amount (or "all" for full balance)
5. Enter destination address (or use your own)
6. Review and confirm bridge transaction
7. Wait for LayerZero message delivery
8. Track transaction on [LayerZero Scan](https://layerzeroscan.com)

**Note:** Bridging requires wrapped tokens. If you don't have any, the CLI will offer to wrap TAO first.

## Examples

### Complete workflow example

```bash
# 1. Check your account
walpha account

# 2. Wrap 100 TAO tokens
walpha wrap --netuid 77 --amount 100

# 3. Bridge 50 tokens to Ethereum
walpha bridge --netuid 77 --fromChain tao --toChain eth

# 4. Check balances on both networks
walpha account

# 5. Unwrap remaining tokens back to TAO
walpha unwrap --netuid 77
```

### Interactive mode example

```bash
$ walpha bridge

Please select a subnet:
1: 77
> 1

Which chain are you bridging from?
1: tao
2: eth
> 1

Which chain are you bridging to?
Only one destination chain available, automatically selecting: eth

Balance: 10.5000
╔═══════╤═══════════╗
║ Token │ Balance   ║
╟───────┼───────────╢
║ wSN77 │ 100.0000  ║
╚═══════╧═══════════╝

Select token to bridge:
Which token?
1: wSN77
> 1

Available balance: 100.0000 wSN77
How much do you want to bridge? (enter amount or "all" for full balance):
> 50

Enter destination address or leave blank for (0xYourAddress)
>

Native fee (wei): 1234567890

Would you like to bridge tokens? (y/n)
> y

Bridged tx confirmed!
Track tx on LayerZero Scan: https://layerzeroscan.com/tx/0x...
```

## Supported Networks

- **TAO**: Bittensor EVM network
- **Ethereum**: Ethereum mainnet

## Supported Subnets

Currently configured subnets in `netuids.json`:
- **Subnet 77**: TAO and ETH contract addresses

Additional subnets can be added by updating the `netuids.json` configuration file.

## Transaction Explorers

- **TAO Network**: https://evm.taostats.io/
- **LayerZero Bridge**: https://layerzeroscan.com/

## Troubleshooting

### "No private key found"
Create a `private-key.txt` file with your private key or seed phrase, or follow the interactive setup.

### "Wrong password" or "Decryption failed"
You entered an incorrect password for your encrypted wallet. You have 3 attempts to enter the correct password. If you've forgotten your password, you'll need to restore your wallet from a backup seed phrase or private key.

### "Failed to decrypt wallet"
The encrypted wallet file may be corrupted, or you've exceeded the maximum password attempts (3). Check if you have a backup file (`private-key.txt.backup.plaintext` or `private-key.txt.backup`).

### I forgot my wallet password
Unfortunately, if you forget your password, there is no way to recover it. You will need to:
1. Create a new wallet, or
2. Import your wallet using your original seed phrase or private key (if you have a backup)

This is why it's crucial to keep your password safe and maintain backups of your seed phrase or private key.

### "Insufficient balance"
Ensure your wallet has enough TAO for the transaction and gas fees. Check your balance with `walpha account`.

### "Invalid netuid"
Currently only subnet 77 is supported. Check `netuids.json` for available subnets.

### Bridge transaction pending
Bridge transactions can take several minutes. Track your transaction on LayerZero Scan using the provided link.

### "Failed to fetch balance"
Check your network connection and ensure the RPC endpoints are accessible.

## Development

### Project structure

```
walpha-cli/
├── src/
│   ├── commands/          # Command implementations
│   │   ├── account.ts     # Account/balance viewing
│   │   ├── wrap.ts        # TAO wrapping
│   │   ├── unwrap.ts      # Token unwrapping
│   │   └── bridge.ts      # Cross-chain bridging
│   ├── helpers/           # Utility functions
│   │   ├── contract.ts    # Contract interactions
│   │   ├── balances.ts    # Balance fetching
│   │   ├── netuids.ts     # Subnet validation
│   │   ├── networks.ts    # Network configuration
│   │   ├── encryption.ts  # Wallet encryption/decryption
│   │   └── password.ts    # Password prompts and validation
│   ├── index.ts           # CLI entry point
│   ├── wallet.ts          # Wallet management
│   └── provider.ts        # RPC provider
├── netuids.json           # Subnet contract addresses
├── eids.json              # LayerZero endpoint IDs
└── package.json
```

### Scripts

- `npm run cli`: Run CLI directly with bun

## Security

- **Use encryption**: Always encrypt your wallet with a strong password
- **Password safety**: Never share your wallet password. If you forget it, your wallet cannot be recovered
- **Backup your keys**: Keep a secure backup of your seed phrase or private key separate from the encrypted wallet
- **Never share your `private-key.txt` file**: Even encrypted, this file should be kept private
- The `private-key.txt` file is gitignored by default
- **Verify contract addresses**: Always verify contract addresses before transactions
- **Double-check destination addresses**: Verify recipient addresses when bridging
- **Encryption details**: walpha uses AES-256-GCM encryption with PBKDF2 key derivation (600,000 iterations) following OWASP 2023 recommendations

## License

MIT
