import sqlite3
import os
import glob

def search_dbs(search_term):
    db_patterns = [
        r"C:\Users\victo\.gemini\antigravity-ide\conversations\*.db",
        r"C:\Users\victo\.gemini\antigravity\conversations\*.db"
    ]
    
    for pattern in db_patterns:
        for db_path in glob.glob(pattern):
            print(f"Searching database: {db_path}")
            try:
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                
                # Check for tables
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                tables = [row[0] for row in cursor.fetchall()]
                
                for table in tables:
                    # Search text columns
                    cursor.execute(f"PRAGMA table_info({table});")
                    columns = [row[1] for row in cursor.fetchall() if row[2] in ('TEXT', 'BLOB', 'text', 'blob')]
                    
                    for col in columns:
                        query = f"SELECT {col} FROM {table} WHERE {col} LIKE ?"
                        cursor.execute(query, (f"%{search_term}%",))
                        results = cursor.fetchall()
                        if results:
                            print(f"  Found in table '{table}', column '{col}': {len(results)} matches")
                            for res in results[:3]:
                                text = str(res[0])
                                print(f"    Match snippet: {text[:300]}...")
                conn.close()
            except Exception as e:
                print(f"  Error searching {db_path}: {e}")

if __name__ == "__main__":
    search_dbs("edital")
