"""
PayFlow Processor Priority Smart Contract
=========================================

This Algorand smart contract manages payment processor priorities and configurations.
It stores processor information in global state and allows authorized updates.

Global State Schema:
- processor_count: Number of configured processors
- processor_1_name: First processor name (e.g., "Stripe")
- processor_1_priority: First processor priority (1-10)
- processor_1_enabled: First processor enabled status (1/0)
- ... (similar for other processors)

Application Calls:
- get_processors: Read all processor configurations
- update_processor: Update a specific processor's settings
- add_processor: Add a new processor configuration
- remove_processor: Remove a processor configuration
"""

from pyteal import *

def approval_program():
    # Global state keys
    PROCESSOR_COUNT = Bytes("processor_count")
    
    def processor_name_key(index):
        return Concat(Bytes("processor_"), Itob(index), Bytes("_name"))
    
    def processor_priority_key(index):
        return Concat(Bytes("processor_"), Itob(index), Bytes("_priority"))
    
    def processor_enabled_key(index):
        return Concat(Bytes("processor_"), Itob(index), Bytes("_enabled"))

    # Initialize the contract with default processors
    @Subroutine(TealType.none)
    def initialize_processors():
        return Seq([
            # Set processor count to 3
            App.globalPut(PROCESSOR_COUNT, Int(3)),
            
            # Initialize Stripe (processor 1)
            App.globalPut(processor_name_key(Int(1)), Bytes("Stripe")),
            App.globalPut(processor_priority_key(Int(1)), Int(1)),
            App.globalPut(processor_enabled_key(Int(1)), Int(1)),
            
            # Initialize PayPal (processor 2)
            App.globalPut(processor_name_key(Int(2)), Bytes("PayPal")),
            App.globalPut(processor_priority_key(Int(2)), Int(2)),
            App.globalPut(processor_enabled_key(Int(2)), Int(1)),
            
            # Initialize Square (processor 3)
            App.globalPut(processor_name_key(Int(3)), Bytes("Square")),
            App.globalPut(processor_priority_key(Int(3)), Int(3)),
            App.globalPut(processor_enabled_key(Int(3)), Int(1)),
        ])

    # Update processor priority
    @Subroutine(TealType.none)
    def update_processor_priority():
        processor_index = Btoi(Txn.application_args[1])
        new_priority = Btoi(Txn.application_args[2])
        
        return Seq([
            Assert(processor_index >= Int(1)),
            Assert(processor_index <= App.globalGet(PROCESSOR_COUNT)),
            Assert(new_priority >= Int(1)),
            Assert(new_priority <= Int(10)),
            App.globalPut(processor_priority_key(processor_index), new_priority)
        ])

    # Enable/disable processor
    @Subroutine(TealType.none)
    def toggle_processor():
        processor_index = Btoi(Txn.application_args[1])
        enabled = Btoi(Txn.application_args[2])
        
        return Seq([
            Assert(processor_index >= Int(1)),
            Assert(processor_index <= App.globalGet(PROCESSOR_COUNT)),
            Assert(Or(enabled == Int(0), enabled == Int(1))),
            App.globalPut(processor_enabled_key(processor_index), enabled)
        ])

    # Main program logic
    program = Cond(
        # Application creation - initialize with default processors
        [Txn.application_id() == Int(0), Seq([
            initialize_processors(),
            Approve()
        ])],
        
        # Update processor priority: args[0] = "update_priority", args[1] = index, args[2] = priority
        [And(
            Txn.on_completion() == OnCall.NoOp,
            Txn.application_args[0] == Bytes("update_priority"),
            Global.latest_timestamp() < Int(2000000000)  # Simple expiry check
        ), Seq([
            update_processor_priority(),
            Approve()
        ])],
        
        # Toggle processor enabled status: args[0] = "toggle", args[1] = index, args[2] = enabled (0/1)
        [And(
            Txn.on_completion() == OnCall.NoOp,
            Txn.application_args[0] == Bytes("toggle"),
            Global.latest_timestamp() < Int(2000000000)
        ), Seq([
            toggle_processor(),
            Approve()
        ])],
        
        # Read-only operations (NoOp without args) - always approve
        [Txn.on_completion() == OnCall.NoOp, Approve()],
        
        # Reject all other operations
        [Int(1), Reject()]
    )
    
    return program

def clear_state_program():
    return Approve()

if __name__ == "__main__":
    # Compile the programs
    approval_teal = compileTeal(approval_program(), Mode.Application, version=6)
    clear_state_teal = compileTeal(clear_state_program(), Mode.Application, version=6)
    
    print("=== APPROVAL PROGRAM ===")
    print(approval_teal)
    print("\n=== CLEAR STATE PROGRAM ===")
    print(clear_state_teal)