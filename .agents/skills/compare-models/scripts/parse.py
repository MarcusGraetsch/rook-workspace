#!/usr/bin/env python3
"""Parse OpenAI-compatible chat completions response."""
import sys, json

try:
    d = json.load(sys.stdin)
    if 'error' in d:
        err = d['error']
        if isinstance(err, dict):
            print('[Error] ' + str(err.get('message', err)))
        else:
            print('[Error] ' + str(err))
    else:
        choices = d.get('choices', [])
        if choices:
            content = choices[0].get('message', {}).get('content', '(no content)')
            print(content[:1200])
        else:
            print(str(d)[:200])
except Exception as e:
    print('[Parse error: ' + str(e) + ']')
