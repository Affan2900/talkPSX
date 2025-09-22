import requests
from get_symbols import get_symbols


def fetch_data():
    companies = []  
    symbols = get_symbols()

    for s in symbols:  
        url = f"https://psxterminal.com/api/companies/{s}"
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            json_data = response.json()

            if json_data and "data" in json_data:
                companies.append(json_data["data"])
            else:
                print(f"No data found for symbol: {s}")

        except Exception as e:
            print(f"Error fetching {s}: {e}")

    return companies
