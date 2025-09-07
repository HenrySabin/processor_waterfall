"""
Very simple deployment script
"""

import base64
from algosdk import account
from algosdk.v2client import algod
from algosdk import transaction
from pyteal import *

# Replace this with a funded account
ACCOUNT_ADDRESS = "ZGVU6HRO4BST2E6LS2CIUWFTMNWXD4EZW25WJFU2FONFMJAQ6244Y472FY"  
ACCOUNT_PRIVATE_KEY = "2ea9rJ7uIWqIISUSj+bdGX36w54/Qy34bC7EhNTQYoHJq08eLuBlPRPLloSKWLNjbXHwmba7ZJaaK5pWJBD2uQ=="

def approval_program():
    return Seq([
        If(Txn.application_id() == Int(0)).Then(Seq([
            # Initialize with processors
            App.globalPut(Bytes("processor_count"), Int(3)),
            App.globalPut(Bytes("proc_1_name"), Bytes("Stripe")),
            App.globalPut(Bytes("proc_1_priority"), Int(1)),
            App.globalPut(Bytes("proc_2_name"), Bytes("PayPal")),
            App.globalPut(Bytes("proc_2_priority"), Int(2)),
            App.globalPut(Bytes("proc_3_name"), Bytes("Square")),
            App.globalPut(Bytes("proc_3_priority"), Int(3)),
            Approve()
        ])),
        Approve()
    ])

def deploy():
    # Check if account details are provided
    if "PASTE_YOUR" in ACCOUNT_ADDRESS:
        print("❌ Please update the script with your funded account details!")
        return
    
    algod_client = algod.AlgodClient("", "https://testnet-api.algonode.cloud")
    
    # Check balance
    try:
        info = algod_client.account_info(ACCOUNT_ADDRESS)
        balance = info['amount'] / 1_000_000
        print(f"💰 Balance: {balance} ALGO")
        if balance < 0.1:
            print("❌ Need more ALGO!")
            return
    except:
        print("❌ Account check failed!")
        return
    
    # Compile
    approval_teal = compileTeal(approval_program(), Mode.Application, version=8)
    clear_teal = compileTeal(Approve(), Mode.Application, version=8)
    
    approval_compiled = algod_client.compile(approval_teal)
    clear_compiled = algod_client.compile(clear_teal)
    
    approval_bytecode = base64.b64decode(approval_compiled['result'])
    clear_bytecode = base64.b64decode(clear_compiled['result'])
    
    # Deploy
    params = algod_client.suggested_params()
    
    txn = transaction.ApplicationCreateTxn(
        sender=ACCOUNT_ADDRESS,
        sp=params,
        on_complete=0,
        approval_program=approval_bytecode,
        clear_program=clear_bytecode,
        global_schema=transaction.StateSchema(10, 10),
        local_schema=transaction.StateSchema(0, 0)
    )
    
    signed = txn.sign(ACCOUNT_PRIVATE_KEY)
    txid = algod_client.send_transaction(signed)
    
    result = transaction.wait_for_confirmation(algod_client, txid, 10)
    app_id = result['application-index']
    
    print(f"🎉 SUCCESS! App ID: {app_id}")
    print(f"🌐 Explorer: https://testnet.algoexplorer.io/application/{app_id}")
    print(f"📝 ALGORAND_APP_ID={app_id}")

if __name__ == "__main__":
    deploy()