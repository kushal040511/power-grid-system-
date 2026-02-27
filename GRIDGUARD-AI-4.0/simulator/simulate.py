import os
import time
import random
import argparse
import requests

API_URL = os.getenv("BACKEND_URL", "http://localhost:5001")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@gridguard.ai")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
INGEST_API_KEY = os.getenv("INGEST_API_KEY", "")


def get_token():
    resp = requests.post(
        f"{API_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    resp.raise_for_status()
    return resp.json()["token"]


def get_meters(token):
    resp = requests.get(
        f"{API_URL}/api/meters?limit=500",
        headers={"Authorization": f"Bearer {token}"}
    )
    resp.raise_for_status()
    return resp.json()


def generate_reading():
    voltage = random.gauss(230, 8)
    current = random.gauss(10, 2)
    power = max(0.2, voltage * current / 1000)
    loss_percent = max(0, random.gauss(6, 2))

    theft_spike = random.random() < 0.08
    if theft_spike:
        loss_percent += random.uniform(10, 20)
        power *= random.uniform(0.3, 0.6)

    temperature = 50 + random.uniform(-5, 20)
    load_percent = 40 + random.uniform(-10, 35)

    return {
        "voltage": voltage,
        "current": current,
        "power": power,
        "loss_percent": loss_percent,
        "temperature": temperature,
        "load_percent": load_percent
    }


def post_reading(payload):
    headers = {}
    if INGEST_API_KEY:
        headers["x-api-key"] = INGEST_API_KEY
    resp = requests.post(
        f"{API_URL}/api/ingest",
        json=payload,
        headers=headers
    )
    resp.raise_for_status()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=1000000)
    parser.add_argument("--interval", type=float, default=3.0)
    parser.add_argument("--fast", action="store_true")
    args = parser.parse_args()

    token = get_token()
    meters = get_meters(token)
    meter_ids = [m["id"] for m in meters]

    print(f"Starting simulator -> count={args.count} interval={args.interval}s fast={args.fast}")

    for i in range(args.count):
        meter_id = random.choice(meter_ids)
        reading = generate_reading()
        payload = {
            "meter_id": meter_id,
            **reading
        }

        post_reading(payload)

        if not args.fast:
            time.sleep(args.interval)

        if (i + 1) % 1000 == 0:
            print(f"Generated {i + 1} readings")


if __name__ == "__main__":
    main()
