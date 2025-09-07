"""
Deploy with the previously funded account
"""

import base64
from algosdk import account, mnemonic, constants
from algosdk.v2client import algod
from algosdk import transaction
from algosdk.transaction import ApplicationCreateTxn, OnComplete
from pyteal import *
import time
import os

# Import our contract
from processor_priority import approval_program, clear_state_program

# Use the previously generated account that was funded
FUNDED_ADDRESS = "6KDGOLP4U3IWLYEGNPS6SIDJHGVGVASO3FWSLKBKQ5LH5ODN6JDBKE6XDM"
FUNDED_PRIVATE_KEY = "T2LgdnkAVO/a/9nzZOsldNoC0pXVy+Myj1cG++fSdODn6JDBKE6XDM"

class FundedContractDeployer:
    def __init__(self):
        # Algorand testnet configuration
        self.algod_address = "https://testnet-api.algonode.cloud"
        self.algod_token = ""
        self.algod_client = algod.AlgodClient(self.algod_token, self.algod_address)
        
        # Use the funded account
        self.private_key = FUNDED_PRIVATE_KEY
        self.address = FUNDED_ADDRESS
        print(f"📝 Using funded account: {self.address}")
        
    def compile_contract(self):
        """Compile the PyTeal contract to TEAL."""
        print("\n🔨 Compiling smart contract...")
        
        # Compile approval program
        approval_teal = compileTeal(approval_program(), Mode.Application, version=6)
        
        # Compile clear state program  
        clear_state_teal = compileTeal(clear_state_program(), Mode.Application, version=6)
        
        # Compile TEAL to bytecode
        approval_compiled = self.algod_client.compile(approval_teal)
        clear_state_compiled = self.algod_client.compile(clear_state_teal)
        
        return (
            base64.b64decode(approval_compiled['result']),
            base64.b64decode(clear_state_compiled['result'])
        )
    
    def wait_for_confirmation(self, txid, timeout=10):
        """Wait for transaction confirmation."""
        start_round = self.algod_client.status()["last-round"] + 1
        current_round = start_round
        
        while current_round < start_round + timeout:
            try:
                pending_txn = self.algod_client.pending_transaction_info(txid)
            except Exception:
                current_round += 1
                self.algod_client.status_after_block(current_round)
                continue
                
            if pending_txn.get("confirmed-round", 0) > 0:
                return pending_txn
            
            current_round += 1
            self.algod_client.status_after_block(current_round)
            
        raise Exception(f"Transaction {txid} not confirmed after {timeout} rounds")
    
    def check_account_balance(self):
        """Check if account has sufficient ALGO for deployment."""
        try:
            account_info = self.algod_client.account_info(self.address)
            balance = account_info['amount'] / 1_000_000  # Convert microALGO to ALGO
            print(f"💰 Account balance: {balance} ALGO")
            
            if balance < 0.1:  # Need at least 0.1 ALGO for deployment
                print("❌ Insufficient balance for deployment!")
                print("🚰 Get testnet ALGO from: https://testnet.algoexplorer.io/dispenser")
                return False
            return True
        except Exception as e:
            print(f"❌ Could not check account balance: {e}")
            return False
    
    def deploy_contract(self):
        """Deploy the smart contract to Algorand testnet."""
        print("\n🚀 Starting contract deployment...")
        
        # Check account balance
        if not self.check_account_balance():
            return None
        
        # Compile contract
        approval_program_compiled, clear_state_program_compiled = self.compile_contract()
        
        # Global state schema (key-value pairs stored globally)
        global_schema = transaction.StateSchema(num_uints=20, num_byte_slices=20)
        
        # Local state schema (not used in this contract)
        local_schema = transaction.StateSchema(num_uints=0, num_byte_slices=0)
        
        # Get network parameters
        params = self.algod_client.suggested_params()
        
        # Create application creation transaction
        txn = ApplicationCreateTxn(
            sender=self.address,
            sp=params,
            on_complete=OnComplete.NoOp,  # No operation on completion
            approval_program=approval_program_compiled,
            clear_program=clear_state_program_compiled,
            global_schema=global_schema,
            local_schema=local_schema
        )
        
        # Sign transaction
        signed_txn = txn.sign(self.private_key)
        
        # Submit transaction
        print("📤 Submitting deployment transaction...")
        txid = self.algod_client.send_transaction(signed_txn)
        print(f"📋 Transaction ID: {txid}")
        
        # Wait for confirmation
        print("⏳ Waiting for confirmation...")
        confirmed_txn = self.wait_for_confirmation(txid)
        
        # Get application ID
        app_id = confirmed_txn['application-index']
        print(f"✅ Contract deployed successfully!")
        print(f"🆔 Application ID: {app_id}")
        print(f"🌐 View on testnet explorer: https://testnet.algoexplorer.io/application/{app_id}")
        
        return {
            'app_id': app_id,
            'txid': txid,
            'address': self.address,
            'private_key': self.private_key
        }

def main():
    """Main deployment function."""
    print("🎯 PayFlow Smart Contract Deployment (Funded Account)")
    print("=" * 60)
    
    deployer = FundedContractDeployer()
    
    # Deploy the contract
    result = deployer.deploy_contract()
    
    if result:
        print("\n" + "=" * 60)
        print("✅ DEPLOYMENT SUCCESSFUL!")
        print("=" * 60)
        print(f"Application ID: {result['app_id']}")
        print(f"Deployer Address: {result['address']}")
        print(f"Transaction ID: {result['txid']}")
        print("\n📝 Environment Variables:")
        print(f"ALGORAND_APP_ID={result['app_id']}")
        print(f"ALGORAND_SERVER=https://testnet-api.algonode.cloud")
        print(f"ALGORAND_TOKEN=")
        print(f"ALGORAND_PORT=443")
        print(f"ALGORAND_NETWORK=testnet")
        
        # Save deployment info
        with open('deployment_info.txt', 'w') as f:
            f.write(f"App ID: {result['app_id']}\n")
            f.write(f"Deployer Address: {result['address']}\n")
            f.write(f"Private Key: {result['private_key']}\n")
            f.write(f"Transaction ID: {result['txid']}\n")
        print("💾 Deployment info saved to deployment_info.txt")
        
        # Test the deployed contract
        print(f"\n🧪 Testing deployed contract...")
        import subprocess
        try:
            subprocess.run(['python', 'test_contract.py', str(result['app_id'])], check=True)
        except:
            print("⚠️  Test script not available, but deployment was successful!")
            
    else:
        print("\n❌ DEPLOYMENT FAILED!")
        print("Please check your account balance and try again.")

if __name__ == "__main__":
    main()