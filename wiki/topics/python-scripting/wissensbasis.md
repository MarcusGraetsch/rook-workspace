# Python Scripting — Snippets & Patterns

## Überblick

Praxisnahe Python-Code-Snippets.

## API-Calls mit Requests

```python
import os
import requests

response = requests.get(
    url,
    headers={'Authorization': f'Bearer {token}'},
    timeout=30
)
data = response.json()
```

## JSON-Manipulation

```python
import json, csv

# JSON aus API holen und filtern
response = requests.get(api_url)
data = response.json()
filtered = [{'title': item['title'], 'id': item['id']} for item in data['results']]

# JSON zu CSV
with open('data.json', 'r') as f:
    data = json.load(f)
with open('output.csv', 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=['key1', 'key2'])
    writer.writeheader()
    for item in data:
        writer.writerow({k: item.get(k, '') for k in ['key1', 'key2']})
```

## Dictionary-Handling

```python
# Zugriff auf verschachtelte Dictionaries
value = my_dict.get('key1', {}).get('key2', {}).get('key3')

# KeyError vermeiden
value = my_dict.get('non_existent_key', 'default')
```

## CKAN + GeoServer API

```python
import base64

# GeoServer REST API
auth = base64.b64encode(f'{user}:{password}'.encode()).decode()
headers = {'Content-Type': 'application/json', 'Authorization': f'Basic {auth}'}
```

## Docker & Python

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "main.py"]
```

## Fehlerbehandlung

```python
def safe_api_call(url, max_retries=3):
    for attempt in range(max_retries):
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            if attempt == max_retries - 1:
                raise
```

## Relevant Conversations

- `Python JSON Manipulation.md`
- `Python Code Assistance.md`
