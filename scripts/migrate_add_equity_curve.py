#!/usr/bin/env python3
"""
Migration script to add equity_curve column to backtests table
"""

import sqlite3
import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

def migrate_database():
    """Add equity_curve column to backtests table if it doesn't exist"""
    
    # Find database file
    db_path = project_root / "optitrade.db"
    
    if not db_path.exists():
        print(f"Database file not found at {db_path}")
        print("Database will be created automatically on next backend startup.")
        return
    
    print(f"Connecting to database: {db_path}")
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(backtests)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'equity_curve' in columns:
            print("✅ Column 'equity_curve' already exists in backtests table")
            return
        
        # Add column
        print("Adding 'equity_curve' column to backtests table...")
        cursor.execute("ALTER TABLE backtests ADD COLUMN equity_curve JSON")
        conn.commit()
        
        print("✅ Successfully added 'equity_curve' column to backtests table")
        
    except sqlite3.Error as e:
        print(f"❌ Error migrating database: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database()

