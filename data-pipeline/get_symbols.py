import requests

def get_symbols():
    url = "https://psxterminal.com/api/symbols"
    response = requests.get(url, timeout=10)
    response.raise_for_status()
    json_data = response.json()

    if json_data.get("success") and "data" in json_data:
        return json_data["data"]
    else:
        return []
