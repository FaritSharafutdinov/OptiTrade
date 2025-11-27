"""
Fix database: Add equity_curve column to backtests table if it exists
If table doesn't exist, it will be created automatically by SQLAlchemy with the new schema
"""

import sqlite3
from pathlib import Path

db_path = Path("optitrade.db")

if not db_path.exists():
    print("Database doesn't exist yet. It will be created with the correct schema on next startup.")
    exit(0)

print(f"Checking database: {db_path}")
conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()

try:
    # Check if table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='backtests'")
    table_exists = cursor.fetchone() is not None
    
    if not table_exists:
        print("✅ Table 'backtests' doesn't exist yet. It will be created with the correct schema automatically.")
        conn.close()
        exit(0)
    
    # Check if column exists
    cursor.execute("PRAGMA table_info(backtests)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'equity_curve' in columns:
        print("✅ Column 'equity_curve' already exists")
    else:
        print("Adding 'equity_curve' column...")
        cursor.execute("ALTER TABLE backtests ADD COLUMN equity_curve JSON")
        conn.commit()
        print("✅ Successfully added 'equity_curve' column")
        
except sqlite3.Error as e:
    print(f"❌ Error: {e}")
    conn.rollback()
finally:
    conn.close()

print("Migration complete!")

