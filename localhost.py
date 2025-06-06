import subprocess
import sys
import os
import signal
import webbrowser
import re

# Determine the directory of the script.
# This assumes localhost.py is in the root of the project.
project_dir = os.path.dirname(os.path.abspath(__file__))
process = None

def signal_handler(sig, frame):
    print("\nScript interrupted by user (Ctrl+C). Terminating 'npm run dev'...")
    global process
    if process:
        if sys.platform == "win32":
            # On Windows, sending CTRL_C_EVENT is more effective for console apps like npm
            # For this to work reliably, Popen needs creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
            try:
                # Terminate the entire process group
                os.kill(process.pid, signal.CTRL_C_EVENT)
                process.wait(timeout=10) # Give it time to shut down
            except (ProcessLookupError, subprocess.TimeoutExpired, OSError) as e:
                print(f"Could not send CTRL_C_EVENT or wait cleanly ({e}), trying to kill process {process.pid}")
                # Fallback to terminate/kill if os.kill with CTRL_C_EVENT fails or isn't enough
                try:
                    # Try terminating the main process
                    # For shell=True, process.pid is the shell's pid, not npm's directly.
                    # This is a best-effort for shell=True.
                    # A more robust solution might involve finding child processes.
                    # However, for npm run dev, the shell usually passes signals.
                    subprocess.run(f"taskkill /PID {process.pid} /T /F", shell=True, check=False)
                except Exception as kill_e:
                    print(f"Error during taskkill: {kill_e}")
        else:
            # On Unix-like systems, SIGTERM is standard, then SIGKILL
            os.killpg(os.getpgid(process.pid), signal.SIGTERM) # Send to process group
            try:
                process.wait(timeout=10) 
            except subprocess.TimeoutExpired:
                print("'npm run dev' did not terminate gracefully after 10s, forcing kill (SIGKILL).")
                os.killpg(os.getpgid(process.pid), signal.SIGKILL)
        print("'npm run dev' termination process initiated.")
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

print(f"Attempting to run 'npm run dev' in directory: {project_dir}")

try:
    # On Windows, npm is often npm.cmd. shell=True helps find it.
    # subprocess.CREATE_NEW_PROCESS_GROUP is used on Windows to allow sending CTRL_C_EVENT to the process group.
    # For non-Windows, start_new_session=True creates a new process group.
    kwargs = {
        'cwd': project_dir, 
        'shell': True,
        'stdout': subprocess.PIPE,
        'stderr': subprocess.STDOUT,
        'text': True,
        'bufsize': 1
    }
    if sys.platform == "win32":
        kwargs['creationflags'] = subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        kwargs['preexec_fn'] = os.setsid
        
    process = subprocess.Popen(
        'npm run dev', 
        **kwargs
    )
    
    url_opened = False
    url_pattern = re.compile(r'http://localhost:\d+')

    if process.stdout:
        for line in iter(process.stdout.readline, ''):
            sys.stdout.write(line)
            sys.stdout.flush()
            if not url_opened:
                match = url_pattern.search(line)
                if match:
                    url = match.group(0)
                    print(f"Server is running on {url}. Opening in your browser.")
                    webbrowser.open_new_tab(url)
                    url_opened = True
    
    # Wait for the process to complete. 
    process.wait()

except FileNotFoundError:
    print("Error: 'npm' command not found. Please ensure Node.js and npm are installed and in your system's PATH.")
except Exception as e:
    print(f"An unexpected error occurred: {e}")
finally:
    # This block will run if process.wait() finishes normally (e.g. server exits on its own)
    # or if an exception other than KeyboardInterrupt occurs.
    # If KeyboardInterrupt, sys.exit(0) is called in handler.
    if process and process.poll() is None: 
        print("Python script is ending, ensuring 'npm run dev' is terminated...")
        if sys.platform == "win32":
            # Re-attempt termination if it's still running for some reason
            try:
                os.kill(process.pid, signal.CTRL_C_EVENT)
                process.wait(timeout=5)
            except:
                subprocess.run(f"taskkill /PID {process.pid} /T /F", shell=True, check=False)
        else:
            try:
                os.killpg(os.getpgid(process.pid), signal.SIGTERM)
                process.wait(timeout=5)
            except:
                 os.killpg(os.getpgid(process.pid), signal.SIGKILL)
    print("Python script finished.") 