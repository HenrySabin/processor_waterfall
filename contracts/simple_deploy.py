"""
Simplified deployment script for current algosdk version
"""

import base64
from algosdk import account
from algosdk.v2client import algod
from algosdk import transaction
from pyteal import *

# Use the funded account
FUNDED_ADDRESS = "6KDGOLP4U3IWLYEGNPS6SIDJHGVGVASO3FWSLKBKQ5LH5ODN6JDBKE6XDM"
FUNDED_PRIVATE_KEY = "T2LgdnkAVO/a/9nzZOsldNoC0pXVy+Myj1cG++fSdODn6JDBKE6XDM"

def simple_approval_program():
    """Simplified contract that just stores processor data."""
    return Seq([
        # Initialize with default processors on creation
        If(Txn.application_id() == Int(0)).Then(Seq([
            App.globalPut(Bytes("processor_count"), Int(3)),
            App.globalPut(Bytes("processor_1_name"), Bytes("Stripe")),
            App.globalPut(Bytes("processor_1_priority"), Int(1)),
            App.globalPut(Bytes("processor_1_enabled"), Int(1)),
            App.globalPut(Bytes("processor_2_name"), Bytes("PayPal")),
            App.globalPut(Bytes("processor_2_priority"), Int(2)),
            App.globalPut(Bytes("processor_2_enabled"), Int(1)),
            App.globalPut(Bytes("processor_3_name"), Bytes("Square")),
            App.globalPut(Bytes("processor_3_priority"), Int(3)),
            App.globalPut(Bytes("processor_3_enabled"), Int(1)),
            Approve()
        ])),
        # Allow reads
        Approve()
    ])

def clear_state_program():
    """Clear state program."""
    return Approve()

def main():
    print("🎯 Simplified PayFlow Contract Deployment")
    print("=" * 50)
    
    # Setup client
    algod_client = algod.AlgodClient("", "https://testnet-api.algonode.cloud")
    
    # Check balance
    try:
        account_info = algod_client.account_info(FUNDED_ADDRESS)
        balance = account_info['amount'] / 1_000_000
        print(f"💰 Account balance: {balance} ALGO")
        
        if balance < 0.1:
            print("❌ Insufficient balance!")
            return
    except Exception as e:
        print(f"❌ Error checking balance: {e}")
        return
    
    # Compile programs
    print("🔨 Compiling contract...")
    try:
        approval_teal = compileTeal(simple_approval_program(), Mode.Application, version=8)
        clear_state_teal = compileTeal(clear_state_program(), Mode.Application, version=8)
        
        # Compile to bytecode
        approval_compiled = algod_client.compile(approval_teal)
        clear_state_compiled = algod_client.compile(clear_state_teal)
        
        approval_bytecode = base64.b64decode(approval_compiled['result'])
        clear_state_bytecode = base64.b64decode(clear_state_compiled['result'])
        
        print("✅ Contract compiled successfully")
        
    except Exception as e:
        print(f"❌ Compilation failed: {e}")
        return
    
    # Create transaction
    print("📤 Creating deployment transaction...")
    try:
        params = algod_client.suggested_params()
        
        # Create the transaction with minimal parameters
        txn = transaction.ApplicationCreateTxn(
            sender=FUNDED_ADDRESS,
            sp=params,
            on_complete=0,  # NoOp
            approval_program=approval_bytecode,
            clear_program=clear_state_bytecode,
            global_schema=transaction.StateSchema(20, 20),
            local_schema=transaction.StateSchema(0, 0)
        )
        
        # Sign and submit
        signed_txn = txn.sign(FUNDED_PRIVATE_KEY)
        txid = algod_client.send_transaction(signed_txn)
        print(f"📋 Transaction ID: {txid}")
        
        # Wait for confirmation
        print("⏳ Waiting for confirmation...")
        confirmed = transaction.wait_for_confirmation(algod_client, txid, 10)
        
        app_id = confirmed['application-index']
        print(f"✅ CONTRACT DEPLOYED SUCCESSFULLY!")
        print(f"🆔 Application ID: {app_id}")
        print(f"🌐 Explorer: https://testnet.algoexplorer.io/application/{app_id}")
        
        # Save result
        with open('deployment_info.txt', 'w') as f:
            f.write(f"App ID: {app_id}\n")
            f.write(f"Transaction ID: {txid}\n")
            f.write(f"Address: {FUNDED_ADDRESS}\n")
        
        print(f"\n📝 Environment Variables:")
        print(f"ALGORAND_APP_ID={app_id}")
        print(f"ALGORAND_SERVER=https://testnet-api.algonode.cloud")
        print(f"ALGORAND_TOKEN=")
        print(f"ALGORAND_PORT=443")
        print(f"ALGORAND_NETWORK=testnet")
        
        return app_id
        
    except Exception as e:
        print(f"❌ Deployment failed: {e}")
        return None

if __name__ == "__main__":
    main()