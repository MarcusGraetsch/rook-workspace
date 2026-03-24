#!/usr/bin/env python3
"""
Multi-Provider LLM Interface - CLI Version
Supports: Kimi (CLI), OpenAI Codex (CLI), Anthropic Claude (CLI)
"""

import os
import subprocess
from pathlib import Path

# Load .env file if exists
env_file = Path.home() / ".env"
if env_file.exists():
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ.setdefault(key, value)

class LLMProvider:
    """Unified CLI interface for multiple LLM providers"""
    
    PROVIDERS = {
        'kimi': {
            'name': 'Kimi',
            'check': ['kimi', '--version'],
            'cmd': ['kimi']  # Without --quiet, just pipe
        },
        'codex': {
            'name': 'OpenAI Codex',
            'check': ['codex', '--version'],
            'cmd': ['codex']  # Simple invocation
        },
        'claude': {
            'name': 'Anthropic Claude',
            'check': ['claude', '--version'],
            'cmd': ['claude']  # Simple invocation
        }
    }
    
    def __init__(self, provider="kimi"):
        self.provider = provider
        self.check_provider(provider)
    
    def check_provider(self, provider):
        """Check if provider CLI is available"""
        if provider not in self.PROVIDERS:
            raise ValueError(f"Unknown provider: {provider}")
        
        config = self.PROVIDERS[provider]
        try:
            result = subprocess.run(
                config['check'],
                capture_output=True,
                timeout=5
            )
            if result.returncode == 0:
                print(f"✅ {config['name']} CLI verfügbar")
                return True
        except:
            pass
        
        print(f"❌ {config['name']} CLI nicht gefunden")
        return False
    
    def generate(self, prompt, timeout=60):
        """Generate text using CLI"""
        config = self.PROVIDERS[self.provider]
        
        try:
            result = subprocess.run(
                config['cmd'],
                input=prompt,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            if result.returncode == 0:
                return result.stdout
            else:
                return f"Error: {result.stderr}"
                
        except subprocess.TimeoutExpired:
            return "Error: Timeout"
        except Exception as e:
            return f"Error: {str(e)}"
    
    def switch(self, provider):
        """Switch to different provider"""
        if self.check_provider(provider):
            self.provider = provider
            print(f"🔄 Gewechselt zu: {self.PROVIDERS[provider]['name']}")
        else:
            print(f"⚠️  Kann nicht zu {provider} wechseln")

def setup_api_keys():
    """Setup help for API keys"""
    print("🔑 LLM CLI Setup")
    print("=" * 50)
    print()
    
    # Check installed CLIs
    providers = ['kimi', 'codex', 'claude']
    for provider in providers:
        try:
            result = subprocess.run(
                [provider, '--version'],
                capture_output=True,
                timeout=5
            )
            status = "✅ Installiert" if result.returncode == 0 else "❌ Nicht verfügbar"
        except:
            status = "❌ Nicht installiert"
        
        print(f"{provider}: {status}")
    
    print()
    print("💡 API Keys konfigurieren:")
    print("   1. OpenAI: https://platform.openai.com/api-keys → export OPENAI_API_KEY='sk-...'")
    print("   2. Anthropic: https://console.anthropic.com/ → export ANTHROPIC_API_KEY='sk-ant-...'")
    print("   3. Kimi: Bereits via kimi login konfiguriert")
    print()
    print("   Oder in ~/.env speichern:")
    print("   OPENAI_API_KEY=sk-...")
    print("   ANTHROPIC_API_KEY=sk-ant-...")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "setup":
        setup_api_keys()
    else:
        print("🧪 Teste verfügbare LLM CLIs...")
        print()
        
        for provider in ['kimi', 'codex', 'claude']:
            print(f"\n{'='*40}")
            print(f"Test: {provider.upper()}")
            print('='*40)
            
            llm = LLMProvider(provider)
            result = llm.generate("Say hello in one word", timeout=10)
            print(f"Result: {result[:100]}...")
        
        print()
        print("💡 Run 'python3 llm_provider.py setup' for configuration help")
