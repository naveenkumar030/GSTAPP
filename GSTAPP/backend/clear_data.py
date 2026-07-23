import os
import asyncio
from database import db, recon_results_col, recon_runs_col, uploads_col

async def clear_all_data():
    print("=" * 60)
    print("        Clearing MongoDB & Local Application Data")
    print("=" * 60)
    
    # 1. Clear MongoDB Collections
    try:
        collections = await db.list_collection_names()
        print(f"Found MongoDB collections: {collections}")
        for col_name in collections:
            res = await db[col_name].delete_many({})
            print(f"[+] Cleared MongoDB collection '{col_name}': {res.deleted_count} documents removed.")
    except Exception as e:
        print(f"[-] Error clearing MongoDB: {e}")

    # 2. Clear Local Async Collections (JSON files)
    print("\n[*] Clearing local stored data files...")
    res_recon = await recon_results_col.delete_many({})
    print(f"[+] Cleared local 'reconciliation_results': {res_recon.deleted_count} records removed.")
    
    res_runs = await recon_runs_col.delete_many({})
    print(f"[+] Cleared local 'reconciliation_runs': {res_runs.deleted_count} records removed.")
    
    res_uploads = await uploads_col.delete_many({})
    print(f"[+] Cleared local 'uploads': {res_uploads.deleted_count} records removed.")

    print("=" * 60)
    print("[SUCCESS] All MongoDB database collections and local data cleared.")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(clear_all_data())
