# PayFlow Smart Contract

This directory contains the Algorand smart contract for PayFlow's processor priority management system.

## Files

- `processor_priority.py` - Main PyTeal smart contract code
- `deploy_contract.py` - Deployment script for testnet
- `test_contract.py` - Testing and debugging utilities
- `README.md` - This documentation

## Quick Start

### 1. Install Dependencies

```bash
pip install pyteal algosdk
```

### 2. Deploy Contract

```bash
cd contracts
python deploy_contract.py
```

The script will:
- Generate a deployment account
- Show you the account address for funding
- Wait for you to fund it with testnet ALGO
- Deploy the contract and return the Application ID

### 3. Fund the Account

Visit https://testnet.algoexplorer.io/dispenser and send testnet ALGO to the generated address.

### 4. Test Contract

```bash
python test_contract.py <APP_ID>
```

### 5. Configure PayFlow

Add the Application ID to your environment:

```bash
export ALGORAND_APP_ID=<YOUR_APP_ID>
export ALGORAND_SERVER=https://testnet-api.algonode.cloud
export ALGORAND_TOKEN=""
export ALGORAND_PORT=443
export ALGORAND_NETWORK=testnet
```

## Contract Functionality

### Global State

The contract stores processor configurations in global state:

- `processor_count`: Number of configured processors
- `processor_1_name`: First processor name (e.g., "Stripe")
- `processor_1_priority`: First processor priority (1-10)
- `processor_1_enabled`: First processor enabled status (1/0)

### Application Calls

- **Read**: Call with no arguments to read current state
- **Update Priority**: Call with args `["update_priority", index, new_priority]`
- **Toggle Enabled**: Call with args `["toggle", index, enabled]`

## Security Notes

- The contract has basic validation but is designed for demonstration
- In production, add proper access controls and admin management
- Store private keys securely, never commit them to version control
- Consider using multisig for contract updates

## Testnet Explorer

View deployed contracts at: https://testnet.algoexplorer.io/application/{APP_ID}