#!/usr/bin/env python3
"""
Wrapper script to run Alembic commands
This script ensures Alembic runs from the correct directory
"""
import sys
import os

# Change to backend directory to ensure alembic.ini is found
backend_dir = os.path.dirname(os.path.dirname(__file__))
os.chdir(backend_dir)

# Import and run Alembic's command line interface
try:
    from alembic.config import main
    # Pass all command line arguments to Alembic
    sys.exit(main())
except ImportError as e:
    print(f"❌ Error: Alembic is not installed. Please install it with:")
    print(f"   pip install alembic")
    print(f"\nOriginal error: {e}")
    sys.exit(1)

