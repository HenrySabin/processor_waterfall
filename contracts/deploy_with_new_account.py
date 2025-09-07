"""
Deploy with a fresh account that we'll fund during the process
"""

import base64
from algosdk import account
from algosdk.v2client import algod
from algosdk import transaction
from pyteal import *
import time

def simple_approval_program():
    """Simplified contract that stores processor data."""
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
        # Allow all other operations
        Approve()
    ])

def clear_state_program():
    return Approve()

def deploy_contract():
    print("🎯 PayFlow Smart Contract Deployment")
    print("=" * 50)
    
    # Generate a fresh account
    private_key, address = account.generate_account()
    print(f"📝 Generated fresh account: {address}")
    print(f"💰 Please fund this account with testnet ALGO")
    print(f"🚰 Dispenser: https://testnet.algoexplorer.io/dispenser")
    
    # Setup client
    algod_client = algod.AlgodClient("", "https://testnet-api.algonode.cloud")
    
    # Wait for funding
    print("\n⏳ Waiting for account funding (checking every 10 seconds)...")
    funded = False
    attempts = 0
    max_attempts = 30  # 5 minutes
    
    while not funded and attempts < max_attempts:
        try:
            account_info = algod_client.account_info(address)
            balance = account_info['amount'] / 1_000_000
            
            if balance >= 0.1:
                print(f"✅ Account funded! Balance: {balance} ALGO")
                funded = True
            else:
                print(f"⏳ Current balance: {balance} ALGO (need 0.1+)")
                time.sleep(10)
                attempts += 1
                
        except Exception as e:
            print(f"⏳ Checking balance... (attempt {attempts + 1})")
            time.sleep(10)
            attempts += 1
    
    if not funded:
        print("❌ Funding timeout. Please fund the account and run again.")
        return None
    
    # Compile contract
    print("\n🔨 Compiling contract...")
    try:
        approval_teal = compileTeal(simple_approval_program(), Mode.Application, version=8)
        clear_state_teal = compileTeal(clear_state_program(), Mode.Application, version=8)
        
        approval_compiled = algod_client.compile(approval_teal)
        clear_state_compiled = algod_client.compile(clear_state_teal)
        
        approval_bytecode = base64.b64decode(approval_compiled['result'])
        clear_state_bytecode = base64.b64decode(clear_state_compiled['result'])
        
        print("✅ Contract compiled successfully")
        
    except Exception as e:
        print(f"❌ Compilation failed: {e}")
        return None
    
    # Deploy
    print("📤 Deploying contract...")
    try:
        params = algod_client.suggested_params()
        
        txn = transaction.ApplicationCreateTxn(
            sender=address,
            sp=params,
            on_complete=0,  # NoOp
            approval_program=approval_bytecode,
            clear_program=clear_state_bytecode,
            global_schema=transaction.StateSchema(20, 20),
            local_schema=transaction.StateSchema(0, 0)
        )
        
        signed_txn = txn.sign(private_key)
        txid = algod_client.send_transaction(signed_txn)
        print(f"📋 Transaction ID: {txid}")
        
        # Wait for confirmation
        print("⏳ Waiting for confirmation...")
        confirmed = transaction.wait_for_confirmation(algod_client, txid, 10)
        
        app_id = confirmed['application-index']
        print(f"\n🎉 CONTRACT DEPLOYED SUCCESSFULLY!")
        print(f"🆔 Application ID: {app_id}")
        print(f"🌐 Explorer: https://testnet.algoexplorer.io/application/{app_id}")
        
        # Test the contract immediately
        print(f"\n🧪 Testing deployed contract...")
        try:
            app_info = algod_client.application_info(app_id)
            global_state = app_info['params'].get('global-state', [])
            print(f"✅ Contract has {len(global_state)} global state entries")
            
            for entry in global_state:
                key_bytes = base64.b64decode(entry['key'])
                key_str = key_bytes.decode('utf-8')
                
                if entry['value']['type'] == 1:  # bytes
                    value = base64.b64decode(entry['value']['bytes']).decode('utf-8')
                elif entry['value']['type'] == 2:  # uint
                    value = entry['value']['uint']
                else:
                    value = "unknown"
                
                print(f"  {key_str}: {value}")
                
        except Exception as e:
            print(f"⚠️  Contract test failed: {e}")
        
        # Save deployment info
        with open('deployment_info.txt', 'w') as f:
            f.write(f"App ID: {app_id}\n")
            f.write(f"Transaction ID: {txid}\n")
            f.write(f"Address: {address}\n")
            f.write(f"Private Key: {private_key}\n")
        
        print(f"\n📝 PayFlow Environment Variables:")
        print(f"export ALGORAND_APP_ID={app_id}")
        print(f"export ALGORAND_SERVER=https://testnet-api.algonode.cloud")
        print(f"export ALGORAND_TOKEN=")
        print(f"export ALGORAND_PORT=443")
        print(f"export ALGORAND_NETWORK=testnet")
        
        return app_id
        
    except Exception as e:
        print(f"❌ Deployment failed: {e}")
        return None

if __name__ == "__main__":
    deploy_contract()