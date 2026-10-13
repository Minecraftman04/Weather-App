# Weather Dashboard

A browser-only weather dashboard hosted on GitHub Pages. No API key or build is needed.

## North Weald flight planner

Open **North Weald · EGSX**, or search `EGSX` / `North Weald`. Choose up to **15 days** in the Forecast selector. The existing town, GPS, favourite, daily, hourly and rain views remain available.

- Choose the flight duration (30–480 minutes), daily available times, individual date blocks and available weekdays.
- Set maximum surface wind, gust and altitude-band wind in knots. Choose up to 5,000 ft **AMSL** or **AGL**; the airfield elevation is 321 ft AMSL.
- Enable the filters you want for precipitation rate/chance, visibility, low cloud, forecast hazards, daylight, gust crosswind, surface–aloft vector difference, or freezing-level clearance.
- Review the best matching period, the full-range wind graph, daily outlook, detailed hourly winds, and exclusion reasons. Click a time to inspect its wind profile. Export the flight periods or copy a profile as CSV.
- Preferences are stored locally in the browser. Auto-refresh checks EGSX every 30 minutes while the page is open. A forecast more than two hours old suppresses the main recommendation until refreshed. This is not background monitoring or a notification service.

All EGSX weather fields come from a single [Open-Meteo GFS request](https://open-meteo.com/en/docs/gfs-api), keeping surface and altitude times aligned. Pressure levels include 1000, 975, 950, 925, 900, 875, 850, 825, 800 and 700 hPa. Wind vectors are interpolated at forecast geopotential heights; points below the surface are discarded and missing altitude coverage is never extrapolated. The near-surface forecast is at 10 m, not a ground anemometer.

Candidate starts are every 30 minutes. The entire requested duration must pass all enabled limits, with hourly samples bracketing the period and precipitation accumulation intervals overlapping it. Missing enabled fields and hourly gaps reject a period. Passing periods are ranked by remaining margin against enabled limits, then earliest start. The interface explains the formula and every exclusion. GMT/BST offsets and real elapsed durations are preserved across the UK clock change.

GFS pressure-level resolution is about 25 km. Beyond day 5, the provider generally interpolates native three-hour forecast steps to hourly. Days 8–15 are labelled as a tentative outlook. Low cloud cover is not a ceiling, and freezing-level clearance is not an icing forecast. The result screens user-selected weather preferences; it does not determine whether a flight is safe or legal. Use an official aviation briefing, operational limits and instructor advice for that decision. The editable 020° runway-axis preset is approximate.

Airfield reference: [Epping Forest District Council layout](https://www.eppingforestdc.gov.uk/app/uploads/2024/03/North-Weald-Airfield-layout.pdf).

## Development

Serve the repository root as static files. The app uses `index.html`, `flight-planner.js`, `flight-ui.js`, `flight.css` and the web manifest/icon.

Run the dependency-free calculation regressions with Node 20 or later:

```sh
node --test tests/flight-planner.test.cjs
```

The calculation module is shared by the browser and tests. Tests cover full-duration screening, date/weekday exclusions, precipitation intervals, missing data, wind peaks, vector interpolation, altitude references, optional filters, daylight, forecast gaps, and the UK clock change.
