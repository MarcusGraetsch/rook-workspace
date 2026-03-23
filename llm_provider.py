#!/usr/bin/env python3
"""
Multi-Provider LLM Interface
Supports: Kimi, OpenAI (Codex), Anthropic (Claude)
"""

import os
from pathlib import Path

class LLMProvider:
    """Unified interface for multiple LLM providers"""
    
    def __init__(self, provider="kimi"):
        self.provider = provider
        self.setup_provider(provider)
    
    def setup_provider(self, provider):
        """Setup the selected provider"""
        if provider == "kimi":
            # Kimi is already configured via kimi-cli
            self.client = None
            print("✅ Using Kimi (via kimi-cli)")
            
        elif provider == "openai":
            try:
                from openai import OpenAI
                api_key = os.getenv("OPENAI_API_KEY")
                if not api_key:
                    raise ValueError("OPENAI_API_KEY not set")
                self.client = OpenAI(api_key=api_key)
                print("✅ Using OpenAI")
            except Exception as e:
                print(f"❌ OpenAI setup failed: {e}")
                self.client = None
                
        elif provider == "anthropic":
            try:
                import anthropic
                api_key = os.getenv("ANTHROPIC_API_KEY")
                if not api_key:
                    raise ValueError("ANTHROPIC_API_KEY not set")
                self.client = anthropic.Anthropic(api_key=api_key)
                print("✅ Using Anthropic (Claude)")
            except Exception as e:
                print(f"❌ Anthropic setup failed: {e}")
                self.client = None
        else:
            raise ValueError(f"Unknown provider: {provider}")
    
    def generate(self, prompt, model=None, max_tokens=1000):
        """Generate text using the configured provider"""
        
        if self.provider == "kimi":
            # Use kimi CLI
            import subprocess
            result = subprocess.run(
                ["kimi", "--print", "--quiet"],
                input=prompt,
                capture_output=True,
                text=True,
                timeout=60
            )
            return result.stdout if result.returncode == 0 else f"Error: {result.stderr}"
        
        elif self.provider == "openai":
            if not self.client:
                return "Error: OpenAI not configured"
            
            model = model or "gpt-4o"
            response = self.client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens
            )
            return response.choices[0].message.content
        
        elif self.provider == "anthropic":
            if not self.client:
                return "Error: Anthropic not configured"
            
            model = model or "claude-3-5-sonnet-20241022"
            response = self.client.messages.create(
                model=model,
                max_tokens=max_tokens,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text
    
    def switch(self, provider):
        """Switch to a different provider"""
        self.provider = provider
        self.setup_provider(provider)

# Configuration helper
def setup_api_keys():
    """Interactive setup for API keys"""
    config_dir = Path.home() / ".llm_config"
    config_dir.mkdir(exist_ok=True)
    
    print("🔑 LLM Provider Setup")
    print("=" * 50)
    print()
    
    # Check existing keys
    openai_key = os.getenv("OPENAI_API_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    
    if openai_key:
        print("✅ OPENAI_API_KEY: bereits gesetzt")
    else:
        print("❌ OPENAI_API_KEY: nicht gesetzt")
        print("   Hol dir einen Key unter: https://platform.openai.com/api-keys")
    
    if anthropic_key:
        print("✅ ANTHROPIC_API_KEY: bereits gesetzt")
    else:
        print("❌ ANTHROPIC_API_KEY: nicht gesetzt")
        print("   Hol dir einen Key unter: https://console.anthropic.com/")
    
    print()
    print("💡 Um Keys zu setzen:")
    print("   export OPENAI_API_KEY='sk-...'")
    print("   export ANTHROPIC_API_KEY='sk-ant-...'")
    print()
    print("   Oder erstelle ~/.env mit den Keys")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "setup":
        setup_api_keys()
    else:
        # Test all configured providers
        print("🧪 Testing LLM Providers...")
        print()
        
        # Test Kimi (always available)
        print("1. Testing Kimi...")
        kimi = LLMProvider("kimi")
        print()
        
        # Test OpenAI if key exists
        if os.getenv("OPENAI_API_KEY"):
            print("2. Testing OpenAI...")
            openai = LLMProvider("openai")
            print()
        else:
            print("2. ⏭️  OpenAI skipped (no API key)")
        
        # Test Anthropic if key exists
        if os.getenv("ANTHROPIC_API_KEY"):
            print("3. Testing Anthropic...")
            anthropic = LLMProvider("anthropic")
            print()
        else:
            print("3. ⏭️  Anthropic skipped (no API key)")
        
        print()
        print("💡 Run 'python3 llm_provider.py setup' for configuration help")
