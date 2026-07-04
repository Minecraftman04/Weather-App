from pathlib import Path
import re

path = Path("index.html")
text = path.read_text(encoding="utf-8")


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    text = text.replace(old, new, 1)


replace_once(
    "    * { box-sizing: border-box; }\n    html { scroll-behavior: smooth; }",
    """    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; max-width: 100%; overflow-x: hidden; }
    body { max-width: 100%; overflow-x: hidden; }
    img, svg, canvas { max-width: 100%; }
    .hero > *, .overviewGrid > *, .mainDataGrid > *, .controls > *, .toolbar > *, .launchBest > *, .launchMiniGrid > * { min-width: 0; }
    .subtitle, .chip, .notice, .launchBestTime, .launchReasonTag, footer { overflow-wrap: anywhere; }
""",
    "global overflow rules",
)

replace_once(
    "    .searchGrid { display: grid; grid-template-columns: 1fr auto; gap: 10px; }",
    "    .searchGrid { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; }",
    "search grid",
)

replace_once(
    "    .controls { display: grid; grid-template-columns: repeat(6, minmax(120px, 1fr)); gap: 10px; align-items: end; }",
    "    .controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); gap: 10px; align-items: end; }",
    "controls grid",
)

replace_once(
    "    .overviewGrid { display: grid; grid-template-columns: minmax(310px, 0.86fr) minmax(500px, 1.4fr); gap: 18px; align-items: stretch; }",
    "    .overviewGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(340px, 100%), 1fr)); gap: 18px; align-items: stretch; }",
    "overview grid",
)

replace_once(
    "    .tableWrap { overflow: auto; border-radius: 16px; border: 1px solid rgba(173, 220, 230, 0.16); background: rgba(0, 0, 0, 0.18); }",
    "    .tableWrap { width: 100%; max-width: 100%; overflow: auto; overscroll-behavior-x: contain; -webkit-overflow-scrolling: touch; scrollbar-gutter: stable; border-radius: 16px; border: 1px solid rgba(173, 220, 230, 0.16); background: rgba(0, 0, 0, 0.18); }",
    "table wrapper",
)

replace_once(
    "    th, td { padding: 10px 11px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.08); white-space: nowrap; }",
    "    th, td { padding: 10px 11px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.08); white-space: nowrap; max-width: min(420px, 70vw); text-overflow: ellipsis; }",
    "table cells",
)

replace_once(
    "    .hourlyTable { min-width: 1040px; }",
    "    .hourlyTable { min-width: 1000px; table-layout: auto; }\n    .hourlyCellValue { min-width: 0; max-width: 100%; }\n    .windCell { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }",
    "hourly table base",
)

replace_once(
    "    .toolbar { display: grid; grid-template-columns: minmax(260px, 2fr) minmax(180px, 1fr) auto auto; gap: 10px; align-items: end; margin-bottom: 12px; }",
    "    .toolbar { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(210px, 100%), 1fr)); gap: 10px; align-items: end; margin-bottom: 12px; }\n    .toolbar button { width: 100%; }",
    "toolbar grid",
)

replace_once(
    "    .aloftSvg { width: 100%; min-width: 720px; height: 390px; display: block; }",
    "    .aloftSvg { width: 100%; min-width: 0; height: auto; aspect-ratio: 820 / 390; display: block; }",
    "aloft graph",
)

replace_once(
    "    .launchControls { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; align-items: end; }",
    "    .launchControls { display: flex; width: 100%; min-width: 0; gap: 10px; flex-wrap: wrap; justify-content: flex-end; align-items: end; }",
    "launch controls",
)

replace_once(
    "    .launchBest { display: grid; grid-template-columns: minmax(240px, 1fr) minmax(190px, auto); gap: 12px; align-items: stretch; padding: 14px; border: 1px solid rgba(52, 211, 153, 0.30); border-radius: 18px; background: linear-gradient(135deg, rgba(52, 211, 153, 0.13), rgba(34, 211, 238, 0.08)), rgba(255,255,255,0.035); margin-bottom: 12px; }",
    "    .launchBest { display: grid; grid-template-columns: minmax(0, 1fr) minmax(150px, auto); gap: 12px; align-items: stretch; padding: 14px; border: 1px solid rgba(52, 211, 153, 0.30); border-radius: 18px; background: linear-gradient(135deg, rgba(52, 211, 153, 0.13), rgba(34, 211, 238, 0.08)), rgba(255,255,255,0.035); margin-bottom: 12px; }",
    "launch best grid",
)

replace_once(
    "    .launchScoreBox { display: grid; place-items: center; text-align: center; min-width: 156px; padding: 12px; border-radius: 16px; border: 1px solid rgba(173, 220, 230, 0.16); background: rgba(0, 0, 0, 0.16); }",
    "    .launchScoreBox { display: grid; place-items: center; text-align: center; min-width: 0; padding: 12px; border-radius: 16px; border: 1px solid rgba(173, 220, 230, 0.16); background: rgba(0, 0, 0, 0.16); }",
    "launch score box",
)

replace_once(
    "    .scoreReasons { min-width: 230px; max-width: 330px; white-space: normal; line-height: 1.35; }",
    "    .scoreReasons { min-width: 0; width: min(330px, 70vw); max-width: 330px; white-space: normal; line-height: 1.35; overflow-wrap: anywhere; }",
    "score reasons",
)

start = text.index("  function renderHourly() {")
end = text.index("\n  function savedLocationFromButton", start)
block = text[start:end]
new_row = r'''      return `<tr><td data-label="Time"><div class="hourlyCellValue hourlyTime"><span class="dayNightBadge ${isDay ? "day" : "night"}" title="${isDay ? "Daytime" : "Night-time"}" aria-label="${isDay ? "Daytime" : "Night-time"}">${isDay ? "☀" : "☾"}</span><strong>${formatLocal(time)}</strong></div></td><td data-label="Temperature"><div class="hourlyCellValue"><strong>${round(h.temperature_2m?.[i])}°C</strong><div class="muted small">Feels ${round(h.apparent_temperature?.[i])}°C</div></div></td><td data-label="Weather"><div class="hourlyCellValue hourlyWeather">${weatherIconSvg(code, isDay)}<div class="weatherLabel"><strong>${escapeHtml(weatherText(code))}</strong><span>${isDay ? "Daytime" : "Night-time"}</span></div></div></td><td data-label="Rain"><div class="hourlyCellValue metricVisual"><div class="metricVisualTop"><strong>${round(rainProbability)}%</strong><span class="muted small">${round(rainAmount, 1)} mm</span></div><span class="miniMeter rainMeter" style="--meter:${rainProbability}%" aria-label="${round(rainProbability)} percent chance of rain"><span></span></span></div></td><td data-label="10 m wind"><div class="hourlyCellValue windCell"><span class="windArrow" style="transform: rotate(${Number(h.wind_direction_10m?.[i] || 0)}deg)">↓</span><span>${wind.value} ${wind.unit} ${dirText(h.wind_direction_10m?.[i])}</span><span class="bar" style="width:${barWidth}px"></span></div></td><td data-label="Gust"><div class="hourlyCellValue">${gust.value} ${gust.unit}</div></td><td data-label="Cloud"><div class="hourlyCellValue metricVisual"><div class="metricVisualTop"><strong>${round(cloudCover)}%</strong></div><span class="miniMeter cloudMeter" style="--meter:${cloudCover}%" aria-label="${round(cloudCover)} percent cloud cover"><span></span></span></div></td><td data-label="Visibility"><div class="hourlyCellValue">${finite(visibilityKm) ? `${round(visibilityKm, 1)} km<span class="visibilityQuality">${visibilityQuality(visibilityKm)}</span>` : "—"}</div></td></tr>`;'''
block, count = re.subn(r"      return `<tr>.*?</tr>`;", new_row, block, count=1)
if count != 1:
    raise RuntimeError(f"hourly row: expected one match, found {count}")
text = text[:start] + block + text[end:]

media_pattern = re.compile(r"    @media \(max-width: 1120px\) \{.*?    \}\n  </style>", re.S)
media_css = r'''    @media (max-width: 1120px) {
      .hero { grid-template-columns: 1fr; }
      .heroCopy { min-height: auto; }
    }
    @media (max-width: 900px) {
      .launchMiniGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .launchControls { justify-content: stretch; }
      .launchControls .field { flex: 1 1 min(220px, 100%); min-width: 0; }
      .launchBest { grid-template-columns: minmax(0, 1fr); }
      .launchScoreBox { place-items: start; text-align: left; }
    }
    @media (max-width: 760px) {
      .wrap { width: min(100% - 18px, 1420px); padding-top: 12px; }
      .searchGrid, .toolbar { grid-template-columns: minmax(0, 1fr); }
      .controls { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .heroCopy, .searchPanel, .card { border-radius: 19px; }
      h1 { max-width: 100%; font-size: clamp(2rem, 12vw, 3.8rem); }
      .launchMiniGrid { grid-template-columns: minmax(0, 1fr); }
      .launchDurationControl, .launchDayControl { min-width: 0; width: 100%; }
      .launchControls .field { flex-basis: 100%; }
      .graphScroll { overflow: hidden; }
      .aloftGraphPanel { padding: 10px; }
      .aloftSvg { min-height: 230px; }
      table:not(.hourlyTable) { min-width: 680px; }

      #hourlyCard { padding: 14px; }
      #hourlyCard .tableWrap { overflow: visible; border: 0; background: transparent; scrollbar-gutter: auto; }
      .hourlyTable, .hourlyTable tbody { display: block; width: 100%; min-width: 0; }
      .hourlyTable thead { display: none; }
      .hourlyTable tbody { display: grid; gap: 10px; }
      .hourlyTable tr { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); overflow: hidden; border: 1px solid var(--border); border-radius: 16px; background: rgba(255,255,255,0.035); }
      .hourlyTable td { display: block; min-width: 0; max-width: none; padding: 10px; white-space: normal; overflow-wrap: anywhere; text-overflow: clip; }
      .hourlyTable td::before { content: attr(data-label); display: block; margin-bottom: 6px; color: var(--muted); font-size: 0.72rem; font-weight: 850; letter-spacing: 0.07em; text-transform: uppercase; }
      .hourlyTable td:nth-last-child(-n+2) { border-bottom: 0; }
      .hourlyWeather { min-width: 0; align-items: flex-start; }
      .metricVisual { min-width: 0; }
      .windCell .bar { max-width: 100%; }
      .visibilityQuality { margin: 4px 0 0; }
    }
    @media (max-width: 520px) {
      .wrap { width: calc(100% - 12px); padding-bottom: 24px; }
      .hero { gap: 10px; margin-bottom: 10px; }
      .heroCopy, .searchPanel, .card { padding: 14px; border-radius: 16px; }
      .searchPanel { gap: 10px; }
      .controls { grid-template-columns: minmax(0, 1fr); }
      .searchGrid button, .controls button, .toolbar button, .launchControls button { width: 100%; white-space: normal; }
      .savedLocations { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .savedLabel { grid-column: 1 / -1; }
      .savedLocationBtn { width: 100%; min-width: 0; white-space: normal; }
      .heroStats { display: grid; grid-template-columns: minmax(0, 1fr); }
      .heroStat { text-align: center; }
      .chips { align-items: stretch; }
      .chip { max-width: 100%; white-space: normal; }
      .rainDropdown > summary { align-items: flex-start; flex-wrap: wrap; padding: 14px; }
      .rainDropdown > summary::after { margin-left: auto; }
      .rainDropdownBody { padding: 0 12px 12px; }
      .hourlyTable tr { grid-template-columns: minmax(0, 1fr); }
      .hourlyTable td { border-bottom: 1px solid rgba(255,255,255,0.08); }
      .hourlyTable td:last-child { border-bottom: 0; }
      .weatherIcon { width: 42px; height: 42px; }
      .weatherIcon svg { width: 34px; height: 34px; }
      .launchHeader { align-items: stretch; }
      .launchScoreValue { font-size: 1.9rem; }
      footer { padding: 0; }
    }
  </style>'''
text, count = media_pattern.subn(media_css, text, count=1)
if count != 1:
    raise RuntimeError(f"responsive media block: expected one match, found {count}")

path.write_text(text, encoding="utf-8")
