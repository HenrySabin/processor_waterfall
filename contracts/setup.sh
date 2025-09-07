#!/bin/bash

# PayFlow Smart Contract Setup Script
# ==================================

echo "🎯 PayFlow Algorand Smart Contract Setup"
echo "========================================"

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    echo "Please install Python 3 and try again."
    exit 1
fi

echo "✅ Python 3 found"

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is required but not installed."
    echo "Please install pip3 and try again."
    exit 1
fi

echo "✅ pip3 found"

# Install required Python packages
echo "📦 Installing Python dependencies..."
pip3 install pyteal algosdk

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "🚀 Setup complete! You can now:"
echo "   1. Deploy contract: python3 deploy_contract.py"
echo "   2. Test contract: python3 test_contract.py <APP_ID>"
echo ""
echo "📖 See README.md for detailed instructions"