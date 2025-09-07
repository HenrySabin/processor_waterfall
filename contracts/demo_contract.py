"""
PayFlow Smart Contract Demo
===========================

This demonstrates the PayFlow smart contract functionality without requiring
testnet funds. It shows what the deployed contract would look like.
"""

from algosdk.v2client import algod
import base64

# Simulated contract state that matches our PyTeal contract
DEMO_CONTRACT_STATE = {
    "processor_count": 3,
    "processor_1_name": "Stripe",
    "processor_1_priority": 1,
    "processor_1_enabled": 1,
    "processor_2_name": "PayPal", 
    "processor_2_priority": 2,
    "processor_2_enabled": 1,
    "processor_3_name": "Square",
    "processor_3_priority": 3,
    "processor_3_enabled": 1
}

# Demo app ID for testing
DEMO_APP_ID = 999999

def demo_contract_functionality():
    """Demonstrate what the deployed contract would return."""
    print("🎯 PayFlow Smart Contract Demo")
    print("=" * 50)
    print(f"🆔 Demo Application ID: {DEMO_APP_ID}")
    print(f"🌐 Network: Algorand Testnet")
    print(f"📊 Contract State: {len(DEMO_CONTRACT_STATE)} entries")
    
    print(f"\n📖 Global State Simulation:")
    for key, value in DEMO_CONTRACT_STATE.items():
        print(f"  {key}: {value}")
    
    # Parse processors like our real implementation would
    processors = []
    processor_count = DEMO_CONTRACT_STATE["processor_count"]
    
    for i in range(1, processor_count + 1):
        name = DEMO_CONTRACT_STATE.get(f"processor_{i}_name")
        priority = DEMO_CONTRACT_STATE.get(f"processor_{i}_priority")
        enabled = DEMO_CONTRACT_STATE.get(f"processor_{i}_enabled") == 1
        
        if name and priority is not None:
            processors.append({
                "processorId": str(i),
                "name": name,
                "priority": priority,
                "enabled": enabled
            })
    
    print(f"\n🔄 Parsed Processors ({len(processors)}):")
    for proc in processors:
        status = "✅ Enabled" if proc["enabled"] else "❌ Disabled"
        print(f"  {proc['processorId']}. {proc['name']} (Priority: {proc['priority']}) {status}")
    
    print(f"\n✅ Contract demo successful!")
    print(f"💡 This shows what PayFlow would receive from a deployed contract")
    
    return {
        "app_id": DEMO_APP_ID,
        "processors": processors,
        "global_state": DEMO_CONTRACT_STATE
    }

def test_algorand_connection():
    """Test connection to Algorand testnet."""
    print("\n🔗 Testing Algorand Testnet Connection...")
    
    algod_client = algod.AlgodClient("", "https://testnet-api.algonode.cloud")
    
    try:
        status = algod_client.status()
        print(f"✅ Connected successfully!")
        print(f"📍 Current round: {status['last-round']}")
        print(f"⏰ Time since last round: {status.get('time-since-last-round', 0)}ms")
        print(f"🌍 Network: testnet")
        return True
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

if __name__ == "__main__":
    # Test connection first
    connected = test_algorand_connection()
    
    if connected:
        # Run demo
        result = demo_contract_functionality()
        
        print(f"\n" + "=" * 50)
        print("🎉 DEMO COMPLETE!")
        print("=" * 50)
        print("To use this with PayFlow, set:")
        print(f"ALGORAND_APP_ID={result['app_id']}")
        print("ALGORAND_SERVER=https://testnet-api.algonode.cloud")
        print("ALGORAND_TOKEN=")
        print("ALGORAND_PORT=443")
        print("ALGORAND_NETWORK=testnet")
        print("\n📝 Note: This uses demo data until you deploy the real contract")
    else:
        print("❌ Cannot proceed with demo - network connection failed")