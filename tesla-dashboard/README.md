# My Tesla Dashboard

A responsive, read-only Tesla dashboard designed for GitHub Pages and the Tesla in-car browser.

## Features

- Battery, estimated range, charging, climate, speed, odometer, security, tyre pressure, software and location
- Dark and sunlight modes
- Full-screen and optional screen wake lock
- Local battery/range history
- Installable PWA with an offline shell
- Supports Tesla Fleet API-shaped JSON, Tesla Fleet Telemetry fields, custom JSON endpoints, and imported snapshots
- No command endpoints: it cannot unlock, start, wake, charge or control the vehicle

## Connect real data

Open **Connect** in the dashboard and choose one of these sources:

1. **Tesla Fleet API (advanced):** paste a short-lived OAuth access token. The token is stored in `sessionStorage`, not in GitHub or persistent browser storage. The page lists the account's vehicles and calls the read-only `vehicle_data` endpoint. Browser CORS policies may require a small proxy.
2. **JSON endpoint / your proxy:** point the dashboard at an HTTPS endpoint that returns Tesla Fleet API data, Fleet Telemetry fields, or a simple flat object. The endpoint must allow CORS from the GitHub Pages origin.
3. **Imported snapshot:** upload or paste a saved JSON response.

## Security and privacy

- Never commit Tesla access or refresh tokens to this public repository.
- Tokens entered in the page are kept only for the current browser session.
- Vehicle location is blurred until manually revealed.
- The service worker caches only same-origin dashboard assets, not API responses or tokens.
- The dashboard does not wake a sleeping vehicle and includes no vehicle command code.

## Typical JSON shape

```json
{
  "response": {
    "display_name": "My Tesla",
    "state": "online",
    "charge_state": {
      "battery_level": 72,
      "battery_range": 224.3,
      "charging_state": "Disconnected"
    },
    "drive_state": { "speed": 0 },
    "climate_state": { "inside_temp": 20.2 },
    "vehicle_state": { "locked": true, "odometer": 36420.4 }
  }
}
```

## GitHub Pages URL

When merged into the parent site, this folder is available at:

`https://minecraftman04.github.io/Weather-App/tesla-dashboard/`
