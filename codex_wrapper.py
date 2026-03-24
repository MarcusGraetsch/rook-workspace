#!/usr/bin/env python3
"""
Wrapper für Codex CLI mit Fake-TTY (script Befehl)
Ermöglicht automatische Nutzung ohne interaktives Terminal
"""

import subprocess
import tempfile
import os

def run_codex_with_tty(prompt, timeout=60):
    """
    Run codex with fake TTY using 'script' command
    This tricks codex into thinking it has an interactive terminal
    """
    # Create temp files for input/output
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as input_file:
        input_file.write(prompt)
        input_file.write("\n\n")  # Extra newline to trigger processing
        input_file_path = input_file.name
    
    output_file_path = input_file_path.replace('.txt', '_output.txt')
    
    try:
        # Use 'script' to create a fake TTY
        # Format: script -q -c "command" output_file
        cmd = [
            'script', 
            '-q',  # Quiet mode
            '-c',  # Execute command
            f'cat {input_file_path} | codex',
            output_file_path  # Output goes here (includes terminal noise)
        ]
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        
        # Read the output
        if os.path.exists(output_file_path):
            with open(output_file_path, 'r') as f:
                output = f.read()
            
            # Clean up terminal escape sequences and noise
            import re
            # Remove ANSI escape sequences
            output = re.sub(r'\x1b\[[0-9;]*[mGKH]', '', output)
            # Remove script header/footer
            lines = output.split('\n')
            # Skip first few lines (script header) and last few lines (script footer)
            clean_lines = []
            for line in lines[3:-2]:  # Skip header/footer
                if line.strip() and not line.startswith('Script'):
                    clean_lines.append(line)
            
            return '\n'.join(clean_lines)
        else:
            return "Error: No output file generated"
            
    except subprocess.TimeoutExpired:
        return "Error: Timeout - Codex took too long"
    except Exception as e:
        return f"Error: {str(e)}"
    finally:
        # Cleanup
        for f in [input_file_path, output_file_path]:
            if os.path.exists(f):
                os.remove(f)

if __name__ == "__main__":
    # Test
    print("🧪 Testing Codex with Fake-TTY wrapper...")
    print()
    
    result = run_codex_with_tty("Say 'Hello from automated script' in one sentence", timeout=30)
    print("Result:")
    print(result)
