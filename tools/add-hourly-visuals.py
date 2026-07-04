from pathlib import Path
import re

path = Path("index.html")
text = path.read_text(encoding="utf-8")

css_anchor = "    .toolbar { display: grid; grid-template-columns: minmax(260px, 2fr) minmax(180px, 1fr) auto auto; gap: 10px; align-items: end; margin-bottom: 12px; }"
css = r'''    .hourlyTable { min-width: 1040px; }
    .hourlyTime { display: flex; align-items: center; gap: 8px; }
    .dayNightBadge { display: inline-grid; width: 28px; height: 28px; place-items: center; border-radius: 50%; border: 1px solid var(--border); background: rgba(255,255,255,0.055); color: var(--warn); font-size: 1rem; flex: 0 0 auto; }
    .dayNightBadge.night { color: #c4b5fd; background: rgba(139, 92, 246, 0.10); }
    .hourlyWeather { display: flex; align-items: center; gap: 10px; min-width: 190px; }
    .weatherIcon { display: inline-grid; width: 46px; height: 46px; place-items: center; border-radius: 14px; border: 1px solid var(--border); background: rgba(255,255,255,0.055); flex: 0 0 auto; }
    .weatherIcon svg { width: 38px; height: 38px; overflow: visible; }
    .weatherIcon.weather-clear { color: #fbbf24; background: rgba(251,191,36,0.10); border-color: rgba(251,191,36,0.24); }
    .weatherIcon.weather-cloud { color: #b6c8d4; background: rgba(182,200,212,0.09); }
    .weatherIcon.weather-rain { color: #38bdf8; background: rgba(56,189,248,0.10); border-color: rgba(56,189,248,0.24); }
    .weatherIcon.weather-snow { color: #dbeafe; background: rgba(147,197,253,0.11); border-color: rgba(147,197,253,0.25); }
    .weatherIcon.weather-storm { color: #c084fc; background: rgba(192,132,252,0.11); border-color: rgba(192,132,252,0.26); }
    .weatherIcon.weather-fog { color: #94a3b8; background: rgba(148,163,184,0.10); }
    .weatherLabel strong { display: block; color: var(--text); font-size: 0.92rem; }
    .weatherLabel span { display: block; margin-top: 2px; color: var(--muted); font-size: 0.78rem; }
    .metricVisual { display: grid; gap: 5px; min-width: 108px; }
    .metricVisualTop { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
    .metricVisualTop strong { color: var(--text); }
    .miniMeter { display: block; width: 100%; height: 7px; overflow: hidden; border-radius: 999px; border: 1px solid rgba(173,220,230,0.13); background: rgba(255,255,255,0.055); }
    .miniMeter > span { display: block; height: 100%; width: var(--meter, 0%); border-radius: inherit; background: linear-gradient(90deg, var(--accent), var(--accent-2)); }
    .rainMeter > span { background: linear-gradient(90deg, #38bdf8, #2563eb); }
    .cloudMeter > span { background: linear-gradient(90deg, #94a3b8, #e2e8f0); }
    .visibilityQuality { display: inline-block; margin-left: 7px; padding: 2px 7px; border-radius: 999px; border: 1px solid var(--border); background: rgba(255,255,255,0.055); color: var(--muted); font-size: 0.76rem; font-weight: 750; }
    body.sunMode .weatherIcon.weather-cloud,
    body.sunMode .weatherIcon.weather-snow,
    body.sunMode .weatherIcon.weather-fog { color: #405b6c; }
    body.sunMode .dayNightBadge.night { color: #5b21b6; }
'''
if ".hourlyTable {" not in text:
    if text.count(css_anchor) != 1:
        raise RuntimeError("CSS anchor not found exactly once")
    text = text.replace(css_anchor, css + css_anchor, 1)

function_anchor = "  function dirText(deg) {"
functions = r'''  function weatherIconSvg(code, isDay = true) {
    const c = Number(code);
    const open = `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">`;
    const cloud = `<path d="M18 45h28a10 10 0 0 0 1-19.95A15 15 0 0 0 18.4 28.7 8.2 8.2 0 0 0 18 45Z"/>`;
    const sun = `<circle cx="23" cy="22" r="8"/><path d="M23 7v5M23 32v5M8 22h5M33 22h5M12.4 11.4l3.5 3.5M30.1 29.1l3.5 3.5M33.6 11.4l-3.5 3.5M15.9 29.1l-3.5 3.5"/>`;
    const moon = `<path d="M32 10a14 14 0 1 0 14 20.5A16 16 0 0 1 32 10Z"/>`;
    let kind = "cloud";
    let drawing = cloud;
    if (c === 0) { kind = "clear"; drawing = isDay ? sun : moon; }
    else if (c === 1 || c === 2) drawing = `${isDay ? sun : moon}${cloud}`;
    else if (c === 45 || c === 48) { kind = "fog"; drawing = `${cloud}<path d="M12 51h40M17 57h30"/>`; }
    else if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) { kind = "rain"; drawing = `${cloud}<path d="M23 50l-3 7M34 50l-3 7M45 50l-3 7"/>`; }
    else if ((c >= 71 && c <= 77) || (c >= 85 && c <= 86)) { kind = "snow"; drawing = `${cloud}<path d="M22 51v8M18.5 53l7 4M25.5 53l-7 4M42 51v8M38.5 53l7 4M45.5 53l-7 4"/>`; }
    else if (c >= 95) { kind = "storm"; drawing = `${cloud}<path d="M35 48l-7 10h7l-3 6 11-13h-7l3-3"/>`; }
    return `<span class="weatherIcon weather-${kind}" role="img" aria-label="${escapeHtml(weatherText(c))}">${open}${drawing}</svg></span>`;
  }
  function visibilityQuality(km) {
    if (!finite(km)) return "Unknown";
    if (km >= 10) return "Excellent";
    if (km >= 5) return "Good";
    if (km >= 2) return "Reduced";
    return "Poor";
  }
'''
if "function weatherIconSvg" not in text:
    if text.count(function_anchor) != 1:
        raise RuntimeError("Function anchor not found exactly once")
    text = text.replace(function_anchor, functions + function_anchor, 1)

old_hourly = '    const hourly = ["temperature_2m", "apparent_temperature", "precipitation_probability", "precipitation", "weather_code", "cloud_cover", "visibility", "pressure_msl", "surface_pressure", "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m"];'
new_hourly = '    const hourly = ["temperature_2m", "apparent_temperature", "is_day", "precipitation_probability", "precipitation", "weather_code", "cloud_cover", "visibility", "pressure_msl", "surface_pressure", "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m"];'
if old_hourly in text:
    text = text.replace(old_hourly, new_hourly, 1)
elif new_hourly not in text:
    raise RuntimeError("Hourly variables line not found")

new_render = r'''  function renderHourly() {
    const h = state.surface?.hourly;
    if (!h?.time) return;
    const now = state.surface?.current?.time ? localStamp(state.surface.current.time) : Date.now();
    const startIndex = h.time.findIndex(t => localStamp(t) >= now);
    const start = Math.max(0, startIndex);
    const rows = h.time.slice(start, start + 36).map((time, offset) => {
      const i = start + offset;
      const code = h.weather_code?.[i];
      const isDay = h.is_day?.[i] !== 0;
      const wind = windToUser(h.wind_speed_10m?.[i]);
      const gust = windToUser(h.wind_gusts_10m?.[i]);
      const barWidth = Math.min(160, Number(h.wind_speed_10m?.[i] || 0) * 7);
      const rainProbability = Math.max(0, Math.min(100, Number(h.precipitation_probability?.[i] || 0)));
      const rainAmount = Number(h.precipitation?.[i] || 0);
      const cloudCover = Math.max(0, Math.min(100, Number(h.cloud_cover?.[i] || 0)));
      const visibilityKm = h.visibility?.[i] != null ? Number(h.visibility[i]) / 1000 : null;
      return `<tr><td><div class="hourlyTime"><span class="dayNightBadge ${isDay ? "day" : "night"}" title="${isDay ? "Daytime" : "Night-time"}" aria-label="${isDay ? "Daytime" : "Night-time"}">${isDay ? "☀" : "☾"}</span><strong>${formatLocal(time)}</strong></div></td><td><strong>${round(h.temperature_2m?.[i])}°C</strong><div class="muted small">Feels ${round(h.apparent_temperature?.[i])}°C</div></td><td><div class="hourlyWeather">${weatherIconSvg(code, isDay)}<div class="weatherLabel"><strong>${escapeHtml(weatherText(code))}</strong><span>${isDay ? "Daytime" : "Night-time"}</span></div></div></td><td><div class="metricVisual"><div class="metricVisualTop"><strong>${round(rainProbability)}%</strong><span class="muted small">${round(rainAmount, 1)} mm</span></div><span class="miniMeter rainMeter" style="--meter:${rainProbability}%" aria-label="${round(rainProbability)} percent chance of rain"><span></span></span></div></td><td><span class="windArrow" style="transform: rotate(${Number(h.wind_direction_10m?.[i] || 0)}deg)">↓</span>${wind.value} ${wind.unit} ${dirText(h.wind_direction_10m?.[i])}<span class="bar" style="width:${barWidth}px"></span></td><td>${gust.value} ${gust.unit}</td><td><div class="metricVisual"><div class="metricVisualTop"><strong>${round(cloudCover)}%</strong></div><span class="miniMeter cloudMeter" style="--meter:${cloudCover}%" aria-label="${round(cloudCover)} percent cloud cover"><span></span></span></div></td><td>${finite(visibilityKm) ? `${round(visibilityKm, 1)} km<span class="visibilityQuality">${visibilityQuality(visibilityKm)}</span>` : "—"}</td></tr>`;
    }).join("");
    el.hourlyCard.innerHTML = `<h2>Next forecast hours</h2><p class="muted small" style="margin:-5px 0 12px">Weather icons, daylight, rain chance, cloud cover, wind direction and visibility for the next 36 forecast hours.</p><div class="tableWrap"><table class="hourlyTable"><thead><tr><th>Time</th><th>Temperature</th><th>Weather</th><th>Rain</th><th>10 m wind</th><th>Gust</th><th>Cloud</th><th>Visibility</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
'''
pattern = re.compile(r"  function renderHourly\(\) \{.*?\n  \}\n\n  function savedLocationFromButton", re.S)
match = pattern.search(text)
if not match:
    raise RuntimeError("renderHourly block not found")
text = text[:match.start()] + new_render + "\n  function savedLocationFromButton" + text[match.end():]

path.write_text(text, encoding="utf-8")
