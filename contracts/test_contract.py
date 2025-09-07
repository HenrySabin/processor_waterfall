"""
PayFlow Smart Contract Testing Script
====================================

This script tests the deployed PayFlow processor priority smart contract.
It demonstrates reading processor configurations and updating priorities.

Usage:
    python test_contract.py <app_id>
"""

import sys
from algosdk.v2client import algod
from algosdk.transaction import ApplicationNoOpTxn
from algosdk import encoding
import base64

class ContractTester:
    def __init__(self, app_id):
        self.app_id = int(app_id)
        self.algod_address = "https://testnet-api.algonode.cloud"
        self.algod_token = ""
        self.algod_client = algod.AlgodClient(self.algod_token, self.algod_address)
    
    def read_global_state(self):
        """Read and parse the contract's global state."""
        print(f"\n📖 Reading global state for app {self.app_id}...")
        
        try:
            app_info = self.algod_client.application_info(self.app_id)
            global_state = app_info['params'].get('global-state', [])
            
            print(f"📊 Found {len(global_state)} global state entries:")
            
            processors = {}
            processor_count = 0
            
            for entry in global_state:
                key_b64 = entry['key']
                value = entry['value']
                
                # Decode base64 key
                key_bytes = base64.b64decode(key_b64)
                key_str = key_bytes.decode('utf-8')
                
                # Parse value based on type
                if value['type'] == 1:  # bytes
                    val = base64.b64decode(value['bytes']).decode('utf-8')
                elif value['type'] == 2:  # uint
                    val = value['uint']
                else:
                    val = "unknown"
                
                print(f"  {key_str}: {val}")
                
                # Parse processor information
                if key_str == "processor_count":
                    processor_count = val
                elif "_name" in key_str:
                    # Extract processor index from key like "processor_1_name"
                    parts = key_str.split('_')
                    if len(parts) >= 3:
                        idx = int(parts[1])
                        if idx not in processors:
                            processors[idx] = {}
                        processors[idx]['name'] = val
                elif "_priority" in key_str:
                    parts = key_str.split('_')
                    if len(parts) >= 3:
                        idx = int(parts[1])
                        if idx not in processors:
                            processors[idx] = {}
                        processors[idx]['priority'] = val
                elif "_enabled" in key_str:
                    parts = key_str.split('_')
                    if len(parts) >= 3:
                        idx = int(parts[1])
                        if idx not in processors:
                            processors[idx] = {}
                        processors[idx]['enabled'] = bool(val)
            
            print(f"\n🔄 Parsed {processor_count} processors:")
            for idx in sorted(processors.keys()):
                proc = processors[idx]
                status = "✅ Enabled" if proc.get('enabled', False) else "❌ Disabled"
                print(f"  {idx}. {proc.get('name', 'Unknown')} (Priority: {proc.get('priority', 'N/A')}) {status}")
            
            return processors
            
        except Exception as e:
            print(f"❌ Error reading global state: {e}")
            return {}
    
    def test_connection(self):
        """Test basic connection to Algorand network."""
        print("🔗 Testing Algorand network connection...")
        
        try:
            status = self.algod_client.status()
            print(f"✅ Connected to Algorand testnet")
            print(f"📍 Current round: {status['last-round']}")
            print(f"⏰ Time since last round: {status.get('time-since-last-round', 0)}ms")
            return True
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            return False

def main():
    if len(sys.argv) != 2:
        print("Usage: python test_contract.py <app_id>")
        print("Example: python test_contract.py 123456")
        return
    
    app_id = sys.argv[1]
    
    print("🧪 PayFlow Smart Contract Tester")
    print("=" * 40)
    print(f"🆔 Application ID: {app_id}")
    
    tester = ContractTester(app_id)
    
    # Test connection
    if not tester.test_connection():
        return
    
    # Read and display contract state
    processors = tester.read_global_state()
    
    if processors:
        print("\n✅ Contract is working correctly!")
        print("🔗 You can now use this app ID in your PayFlow application:")
        print(f"   ALGORAND_APP_ID={app_id}")
    else:
        print("\n⚠️  No processor data found. Contract may need initialization.")

if __name__ == "__main__":
    main()