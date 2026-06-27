# Weather + Winds Aloft Dashboard

Static GitHub Pages weather dashboard using Open-Meteo. It includes current weather, daily/hourly forecast, 15-minute rain nowcast where available, sea-level pressure, pressure-level cloud cover, winds aloft to 3000 m AGL, and OpenRocket wind CSV export.

## Deploy on GitHub Pages

1. Upload `index.html` to a GitHub repository.
2. Go to **Settings → Pages**.
3. Set the source to deploy from your branch and root folder.
4. Open the Pages URL after it finishes deploying.

## Notes

- Winds aloft come from ECMWF pressure-level forecast data.
- Interpolated 100 m / 250 m / 500 m wind rows are interpolated between returned pressure levels.
- Rain nowcast rows use returned 15-minute precipitation steps; the page does not interpolate them into 1-minute values.
- OpenRocket export uses lowercase headers: `altitude,speed,direction,stddev`.
- This is not an aviation safety product.
