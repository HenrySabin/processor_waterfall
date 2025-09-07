"""
PayFlow Smart Payment Processor Priority Contract
=================================================

This Algorand smart contract dynamically manages payment processor priorities based on 
real-world performance metrics and historical data.

Performance-Based Priority Calculation:
- Transaction Count: Total transactions processed by each processor
- Success Rate: Percentage of successful transactions (0-10000 basis points)
- Processing Time: Average response time in milliseconds  
- Processor Tenure: Days since processor was first activated
- Monthly Performance: Rolling 30-day transaction volume and success metrics

Global State Schema (per processor):
- processor_X_name: Processor name (e.g., "Stripe")
- processor_X_enabled: Processor enabled status (1/0)
- processor_X_total_transactions: Total transactions processed
- processor_X_successful_transactions: Successfully completed transactions
- processor_X_total_amount: Total amount processed (in cents)
- processor_X_avg_processing_time: Average processing time (ms)
- processor_X_first_activated: Timestamp when first activated
- processor_X_monthly_transactions: Transactions in last 30 days
- processor_X_monthly_amount: Amount processed in last 30 days
- processor_X_last_updated: Last performance update timestamp
- processor_X_calculated_priority: Dynamically calculated priority (1-10)

Application Calls:
- initialize_processors: Set up processors with default metrics
- update_performance: Submit transaction performance data
- calculate_priorities: Recalculate all processor priorities based on performance
- get_processor_metrics: Read detailed performance data
- toggle_processor: Enable/disable a processor
"""

from pyteal import *

def approval_program():
    # Global state keys
    PROCESSOR_COUNT = Bytes("processor_count")
    
    # Performance-based processor state keys
    def processor_name_key(index):
        return Concat(Bytes("processor_"), Itob(index), Bytes("_name"))
    
    def processor_enabled_key(index):
        return Concat(Bytes("processor_"), Itob(index), Bytes("_enabled"))
    
    def processor_total_transactions_key(index):
        return Concat(Bytes("processor_"), Itob(index), Bytes("_total_transactions"))
    
    def processor_successful_transactions_key(index):
        return Concat(Bytes("processor_"), Itob(index), Bytes("_successful_transactions"))
    
    def processor_total_amount_key(index):
        return Concat(Bytes("processor_"), Itob(index), Bytes("_total_amount"))
    
    def processor_avg_processing_time_key(index):
        return Concat(Bytes("processor_"), Itob(index), Bytes("_avg_processing_time"))
    
    def processor_first_activated_key(index):
        return Concat(Bytes("processor_"), Itob(index), Bytes("_first_activated"))
    
    def processor_monthly_transactions_key(index):
        return Concat(Bytes("processor_"), Itob(index), Bytes("_monthly_transactions"))
    
    def processor_monthly_amount_key(index):
        return Concat(Bytes("processor_"), Itob(index), Bytes("_monthly_amount"))
    
    def processor_last_updated_key(index):
        return Concat(Bytes("processor_"), Itob(index), Bytes("_last_updated"))
    
    def processor_calculated_priority_key(index):
        return Concat(Bytes("processor_"), Itob(index), Bytes("_calculated_priority"))

    # Initialize processors with performance tracking
    @Subroutine(TealType.none)
    def initialize_processors():
        current_time = Global.latest_timestamp()
        return Seq([
            # Set processor count to 3
            App.globalPut(PROCESSOR_COUNT, Int(3)),
            
            # Initialize Stripe (processor 1) with performance metrics
            App.globalPut(processor_name_key(Int(1)), Bytes("Stripe")),
            App.globalPut(processor_enabled_key(Int(1)), Int(1)),
            App.globalPut(processor_total_transactions_key(Int(1)), Int(0)),
            App.globalPut(processor_successful_transactions_key(Int(1)), Int(0)),
            App.globalPut(processor_total_amount_key(Int(1)), Int(0)),
            App.globalPut(processor_avg_processing_time_key(Int(1)), Int(150)),  # Default 150ms
            App.globalPut(processor_first_activated_key(Int(1)), current_time),
            App.globalPut(processor_monthly_transactions_key(Int(1)), Int(0)),
            App.globalPut(processor_monthly_amount_key(Int(1)), Int(0)),
            App.globalPut(processor_last_updated_key(Int(1)), current_time),
            App.globalPut(processor_calculated_priority_key(Int(1)), Int(1)),
            
            # Initialize PayPal (processor 2) with performance metrics
            App.globalPut(processor_name_key(Int(2)), Bytes("PayPal")),
            App.globalPut(processor_enabled_key(Int(2)), Int(1)),
            App.globalPut(processor_total_transactions_key(Int(2)), Int(0)),
            App.globalPut(processor_successful_transactions_key(Int(2)), Int(0)),
            App.globalPut(processor_total_amount_key(Int(2)), Int(0)),
            App.globalPut(processor_avg_processing_time_key(Int(2)), Int(200)),  # Default 200ms
            App.globalPut(processor_first_activated_key(Int(2)), current_time),
            App.globalPut(processor_monthly_transactions_key(Int(2)), Int(0)),
            App.globalPut(processor_monthly_amount_key(Int(2)), Int(0)),
            App.globalPut(processor_last_updated_key(Int(2)), current_time),
            App.globalPut(processor_calculated_priority_key(Int(2)), Int(2)),
            
            # Initialize Square (processor 3) with performance metrics
            App.globalPut(processor_name_key(Int(3)), Bytes("Square")),
            App.globalPut(processor_enabled_key(Int(3)), Int(1)),
            App.globalPut(processor_total_transactions_key(Int(3)), Int(0)),
            App.globalPut(processor_successful_transactions_key(Int(3)), Int(0)),
            App.globalPut(processor_total_amount_key(Int(3)), Int(0)),
            App.globalPut(processor_avg_processing_time_key(Int(3)), Int(180)),  # Default 180ms
            App.globalPut(processor_first_activated_key(Int(3)), current_time),
            App.globalPut(processor_monthly_transactions_key(Int(3)), Int(0)),
            App.globalPut(processor_monthly_amount_key(Int(3)), Int(0)),
            App.globalPut(processor_last_updated_key(Int(3)), current_time),
            App.globalPut(processor_calculated_priority_key(Int(3)), Int(3)),
        ])

    # Update processor performance metrics and recalculate priority
    @Subroutine(TealType.none)
    def update_performance_metrics():
        processor_index = Btoi(Txn.application_args[1])
        amount_cents = Btoi(Txn.application_args[2])           # Transaction amount in cents
        was_successful = Btoi(Txn.application_args[3])         # 1 for success, 0 for failure
        processing_time_ms = Btoi(Txn.application_args[4])     # Processing time in milliseconds
        
        # Get current metrics
        current_total_txns = App.globalGet(processor_total_transactions_key(processor_index))
        current_successful_txns = App.globalGet(processor_successful_transactions_key(processor_index))
        current_total_amount = App.globalGet(processor_total_amount_key(processor_index))
        current_avg_time = App.globalGet(processor_avg_processing_time_key(processor_index))
        current_monthly_txns = App.globalGet(processor_monthly_transactions_key(processor_index))
        current_monthly_amount = App.globalGet(processor_monthly_amount_key(processor_index))
        
        # Calculate new averages
        new_total_txns = current_total_txns + Int(1)
        new_successful_txns = If(was_successful == Int(1), 
                                current_successful_txns + Int(1), 
                                current_successful_txns)
        new_total_amount = current_total_amount + amount_cents
        new_avg_time = Div(current_avg_time * current_total_txns + processing_time_ms, new_total_txns)
        
        return Seq([
            Assert(processor_index >= Int(1)),
            Assert(processor_index <= App.globalGet(PROCESSOR_COUNT)),
            Assert(amount_cents >= Int(0)),
            Assert(processing_time_ms >= Int(0)),
            Assert(Or(was_successful == Int(0), was_successful == Int(1))),
            
            # Update cumulative metrics
            App.globalPut(processor_total_transactions_key(processor_index), new_total_txns),
            App.globalPut(processor_successful_transactions_key(processor_index), new_successful_txns),
            App.globalPut(processor_total_amount_key(processor_index), new_total_amount),
            App.globalPut(processor_avg_processing_time_key(processor_index), new_avg_time),
            
            # Update monthly metrics (simplified - real implementation would handle 30-day rolling window)
            App.globalPut(processor_monthly_transactions_key(processor_index), current_monthly_txns + Int(1)),
            App.globalPut(processor_monthly_amount_key(processor_index), current_monthly_amount + amount_cents),
            App.globalPut(processor_last_updated_key(processor_index), Global.latest_timestamp()),
        ])

    # Calculate dynamic priority based on performance metrics
    @Subroutine(TealType.uint64)
    def calculate_processor_score(processor_index):
        total_txns = App.globalGet(processor_total_transactions_key(processor_index))
        successful_txns = App.globalGet(processor_successful_transactions_key(processor_index))
        monthly_txns = App.globalGet(processor_monthly_transactions_key(processor_index))
        monthly_amount = App.globalGet(processor_monthly_amount_key(processor_index))
        avg_time = App.globalGet(processor_avg_processing_time_key(processor_index))
        first_activated = App.globalGet(processor_first_activated_key(processor_index))
        
        # Calculate success rate (0-10000 basis points)
        success_rate = If(total_txns > Int(0), 
                         Div(successful_txns * Int(10000), total_txns), 
                         Int(9500))  # Default 95% for new processors
        
        # Calculate tenure score (days since activation, max 365)
        current_time = Global.latest_timestamp()
        tenure_days = If(current_time > first_activated,
                        Div(current_time - first_activated, Int(86400)),  # Convert seconds to days
                        Int(0))
        tenure_score = If(tenure_days > Int(365), Int(365), tenure_days)
        
        # Calculate volume score (monthly transactions, normalized)
        volume_score = If(monthly_txns > Int(1000), Int(1000), monthly_txns)
        
        # Calculate speed score (lower processing time = higher score)
        speed_score = If(avg_time < Int(50), Int(1000),
                        If(avg_time < Int(100), Int(800),
                          If(avg_time < Int(200), Int(600),
                            If(avg_time < Int(500), Int(400), Int(200)))))
        
        # Composite score calculation (weighted average)
        # Success Rate: 40%, Volume: 25%, Speed: 20%, Tenure: 15%
        composite_score = (success_rate * Int(40) +      # Success rate weight: 40%
                          volume_score * Int(25) +       # Volume weight: 25%  
                          speed_score * Int(20) +        # Speed weight: 20%
                          tenure_score * Int(15)) / Int(100)  # Tenure weight: 15%
        
        return composite_score

    # Recalculate priorities for all processors based on performance
    @Subroutine(TealType.none)
    def recalculate_all_priorities():
        processor_count = App.globalGet(PROCESSOR_COUNT)
        
        # Calculate scores for all processors (simplified for 3 processors)
        score1 = calculate_processor_score(Int(1))
        score2 = calculate_processor_score(Int(2))
        score3 = calculate_processor_score(Int(3))
        
        # Assign priorities based on scores (highest score = priority 1)
        return Seq([
            # Processor 1 priority assignment
            If(And(score1 >= score2, score1 >= score3))
            .Then(App.globalPut(processor_calculated_priority_key(Int(1)), Int(1)))
            .ElseIf(And(score1 >= score2, score1 < score3))
            .Then(App.globalPut(processor_calculated_priority_key(Int(1)), Int(2)))
            .Else(App.globalPut(processor_calculated_priority_key(Int(1)), Int(3))),
            
            # Processor 2 priority assignment  
            If(And(score2 >= score1, score2 >= score3))
            .Then(App.globalPut(processor_calculated_priority_key(Int(2)), Int(1)))
            .ElseIf(And(score2 >= score1, score2 < score3))
            .Then(App.globalPut(processor_calculated_priority_key(Int(2)), Int(2)))
            .Else(App.globalPut(processor_calculated_priority_key(Int(2)), Int(3))),
            
            # Processor 3 priority assignment
            If(And(score3 >= score1, score3 >= score2))
            .Then(App.globalPut(processor_calculated_priority_key(Int(3)), Int(1)))
            .ElseIf(And(score3 >= score1, score3 < score2))
            .Then(App.globalPut(processor_calculated_priority_key(Int(3)), Int(2)))
            .Else(App.globalPut(processor_calculated_priority_key(Int(3)), Int(3))),
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
        # Application creation - initialize with default processors and performance tracking
        [Txn.application_id() == Int(0), Seq([
            initialize_processors(),
            Approve()
        ])],
        
        # Update performance metrics: args[0] = "update_performance", args[1] = index, args[2] = amount, args[3] = success, args[4] = time
        [And(
            Txn.on_completion() == OnComplete.NoOp,
            Txn.application_args[0] == Bytes("update_performance"),
            Global.latest_timestamp() < Int(2000000000)  # Simple expiry check
        ), Seq([
            update_performance_metrics(),
            recalculate_all_priorities(),  # Automatically recalculate priorities after each update
            Approve()
        ])],
        
        # Manually recalculate priorities: args[0] = "recalculate_priorities"
        [And(
            Txn.on_completion() == OnComplete.NoOp,
            Txn.application_args[0] == Bytes("recalculate_priorities"),
            Global.latest_timestamp() < Int(2000000000)
        ), Seq([
            recalculate_all_priorities(),
            Approve()
        ])],
        
        # Toggle processor enabled status: args[0] = "toggle", args[1] = index, args[2] = enabled (0/1)
        [And(
            Txn.on_completion() == OnComplete.NoOp,
            Txn.application_args[0] == Bytes("toggle"),
            Global.latest_timestamp() < Int(2000000000)
        ), Seq([
            toggle_processor(),
            Approve()
        ])],
        
        # Read-only operations (NoOp without args) - always approve
        [Txn.on_completion() == OnComplete.NoOp, Approve()],
        
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