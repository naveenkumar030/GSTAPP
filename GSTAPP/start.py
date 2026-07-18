#!/usr/bin/env python3
import os
import sys
import subprocess
import argparse

def main():
    parser = argparse.ArgumentParser(description="GST ReconGraph - Single-Port Startup Script")
    parser.add_argument("--no-build", action="store_true", help="Skip building the React frontend")
    parser.add_argument("--port", type=int, default=8000, help="Port to run the server on (default: 8000)")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host to run the server on (default: 127.0.0.1)")
    args = parser.parse_args()

    root_dir = os.path.dirname(os.path.abspath(__file__))
    dist_dir = os.path.join(root_dir, "dist")
    
    print("=" * 60)
    print("  GST ReconGraph - Single-Port Startup (Python)")
    print("=" * 60)

    # 1. Build the React frontend if requested
    if not args.no_build:
        package_json_path = os.path.join(root_dir, "package.json")
        if os.path.exists(package_json_path):
            print("[*] Building React frontend (npm run build)...")
            try:
                # Use shell=True for Windows compatibility with npm command resolved by PATH
                result = subprocess.run(["npm", "run", "build"], cwd=root_dir, shell=True)
                if result.returncode != 0:
                    print("[-] Error: npm run build failed.")
                    if not os.path.exists(dist_dir):
                        print("[-] Error: No existing frontend build found in 'dist/'. Exiting.")
                        sys.exit(1)
                    else:
                        print("[!] Proceeding with previously built frontend in 'dist/'.")
                else:
                    print("[+] React frontend build complete.")
            except FileNotFoundError:
                print("[-] Warning: 'npm' command not found. Cannot build frontend.")
                if not os.path.exists(dist_dir):
                    print("[-] Error: 'dist/' directory does not exist. Please run npm build first.")
                    sys.exit(1)
                else:
                    print("[!] Proceeding with existing frontend build in 'dist/'.")
        else:
            print("[-] package.json not found in root directory. Skipping build step.")
    else:
        print("[*] Skipping React frontend build step (--no-build).")

    # 2. Start the FastAPI backend
    backend_dir = os.path.join(root_dir, "backend")
    venv_dir = os.path.join(backend_dir, "venv")
    
    # Locate the Python executable in the virtual environment if present
    python_executable = sys.executable
    if os.path.exists(venv_dir):
        if sys.platform == "win32":
            venv_bin = os.path.join(venv_dir, "Scripts")
        else:
            venv_bin = os.path.join(venv_dir, "bin")
            
        venv_python = os.path.join(venv_bin, "python")
        if sys.platform == "win32" and not venv_python.lower().endswith(".exe"):
            venv_python += ".exe"
            
        if os.path.exists(venv_python):
            python_executable = venv_python
            print(f"[+] Using virtual environment python at: {python_executable}")

    print(f"[*] Starting FastAPI backend on http://{args.host}:{args.port} ...")
    print(f"    - Frontend: http://{args.host}:{args.port}")
    print(f"    - API Docs: http://{args.host}:{args.port}/docs")
    print("-" * 60)

    # Command to run uvicorn
    cmd = [
        python_executable, 
        "-m", "uvicorn", 
        "main:app", 
        "--reload", 
        "--port", str(args.port), 
        "--host", args.host
    ]
    
    try:
        # Run and stream output, CWD must be backend_dir so absolute/relative imports work correctly
        subprocess.run(cmd, cwd=backend_dir)
    except KeyboardInterrupt:
        print("\n[+] Server stopped by user.")
    except Exception as e:
        print(f"[-] Error starting server: {e}")

if __name__ == "__main__":
    main()
