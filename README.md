# Weather + Winds Aloft Dashboard

A single-file static weather dashboard for GitHub Pages. It uses Open-Meteo in the browser, so there is no backend and no API key to hide.

## Deploy on GitHub Pages

1. Create a new GitHub repository, for example `weather-aloft`.
2. Upload `index.html` to the root of the repository.
3. Commit/push the file.
4. Go to **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select `main` and `/root`, then save.
7. Open the Pages URL GitHub gives you.

## Notes

- Normal current/hourly/daily weather comes from Open-Meteo's main Forecast API, including mean sea-level pressure and surface pressure.
- Winds aloft and cloud cover aloft come from Open-Meteo's ECMWF pressure-level forecast. The winds-aloft card shows current/modelled MSL pressure plus forecast MSL pressure for the selected aloft time.
- Interpolated wind/cloud-aloft rows are calculated between available pressure levels; they are not extra model levels.
- The **Live weather** button uses browser GPS, switches to a 1-day forecast, selects the winds-aloft time nearest to now, and refreshes every 10 minutes while live mode is on.

- The standard **Copy CSV** export includes forecast/current MSL pressure columns. The OpenRocket-specific export remains limited to OpenRocket-compatible wind-profile columns.
- The **OpenRocket CSV** button downloads the currently selected wind-aloft profile using OpenRocket-compatible lowercase headers: `altitude,speed,direction,stddev`, with altitude in metres AGL, speed/stddev in m/s, direction in degrees, and zero standard deviation. Leave OpenRocket import column names as `altitude`, `speed`, `direction`, and `stddev`.
- Heights are shown as AGL and MSL where possible, using Open-Meteo terrain elevation.
- This should not be used as the sole source for aviation, severe weather, marine, or mountain safety decisions.
