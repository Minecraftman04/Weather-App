(function () {
  "use strict";
  const P = window.FlightPlanner;
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = (value, dp = 1) => typeof value === "number" && Number.isFinite(value) ? value.toFixed(dp) : "—";
  const day = value => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
  const hm = iso => iso?.slice(11, 16) || "—";
  const label = c => { const changing = c.startIso.slice(-6) !== c.endIso.slice(-6); const zone = iso => iso.endsWith("+01:00") ? "BST" : "GMT"; return `${day(c.date)} · ${hm(c.startIso)}${changing ? " " + zone(c.startIso) : ""}–${hm(c.endIso)}${changing ? " " + zone(c.endIso) : ""}`; };
  function field(config, key, title, type = "number", attrs = "") {
    return `<div class="field"><label for="flight-${key}">${title}</label><input id="flight-${key}" data-setting="${key}" type="${type}" value="${esc(config[key])}" ${attrs}></div>`;
  }
  function toggle(config, key, title) {
    return `<label class="flightToggle"><input id="flight-${key}" type="checkbox" data-setting="${key}" ${config[key] ? "checked" : ""}><span>${title}</span></label>`;
  }
  function select(config, key, title, options) {
    return `<div class="field"><label for="flight-${key}">${title}</label><select id="flight-${key}" data-setting="${key}">${options.map(([v, text]) => `<option value="${esc(v)}" ${String(config[key]) === String(v) ? "selected" : ""}>${esc(text)}</option>`).join("")}</select></div>`;
  }
  function controls(c, dates) {
    const limits = (key, title, min, max, step = 1) => field(c, key, title, "number", `min="${min}" max="${max}" step="${step}"`);
    return `<fieldset class="flightFieldset"><legend>Your flight &amp; availability</legend><div class="flightControlGrid">
      ${select(c, "date", "Find a window", [["all", "Best across loaded days"], ...dates.map(d => [d, day(d)])])}
      ${limits("duration", "Flight period (minutes)", 30, 480, 30)}
      ${field(c, "start", "Available from (UK time)", "time", 'step="1800"')}${field(c, "end", "Available until (UK time)", "time", 'step="1800"')}
      ${limits("altitude", "Monitor up to (feet)", 500, 5000, 500)}${select(c, "basis", "Height reference", [["amsl", "AMSL — above sea level"], ["agl", "AGL — above airfield"]])}
      </div><div class="flightWeekdays" role="group" aria-label="Available weekdays">${[1, 2, 3, 4, 5, 6, 0].map(n => `<label class="flightToggle"><input type="checkbox" data-weekday="${n}" ${c.weekdays.includes(n) ? "checked" : ""}>${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][n]}</label>`).join("")}</div>
      <p class="muted small">Tap dates you cannot fly. Blocked dates and unavailable weekdays are excluded from every recommendation.</p>
      <div class="flightDates">${dates.map(d => `<button type="button" class="secondary tiny ${c.blocked.includes(d) ? "flightBlocked" : ""}" data-block-date="${d}" aria-pressed="${c.blocked.includes(d)}">${esc(day(d))}${c.blocked.includes(d) ? " · blocked" : ""}</button>`).join("")}</div>
      <button type="button" class="secondary tiny" data-clear-blocks>Clear date blocks</button>
    </fieldset>
    <fieldset class="flightFieldset"><legend>Wind limits · knots</legend><div class="flightControlGrid">
      ${limits("surface", "Maximum surface wind (kt)", 1, 100)}${limits("gust", "Maximum surface gust (kt)", 1, 150)}
      <div>${toggle(c, "checkAloft", "Check whole altitude band")}${limits("aloft", "Maximum wind in band (kt)", 1, 150)}</div>
      <div>${toggle(c, "checkCrosswind", "Check gust crosswind")}${limits("crosswind", "Maximum crosswind (kt)", 1, 100)}</div>
      ${limits("heading", "Runway axis (° true, editable)", 0, 359)}
      <div>${toggle(c, "checkDifference", "Check surface–aloft vector difference")}${limits("difference", "Maximum vector difference (kt)", 1, 100)}</div>
      </div><p class="muted small">Surface uses the model’s 10 m (33 ft) wind. Crosswind uses gust speed and mean wind direction against the entered runway axis; 020° is an approximate preset for 02/20, not a surveyed heading. Vector difference is a broad wind-change indicator, not a turbulence or wind-shear forecast.</p></fieldset>
    <fieldset class="flightFieldset"><legend>Optional weather filters</legend><div class="flightControlGrid">
      <div>${toggle(c, "checkRain", "Check rain / precipitation")}${limits("rain", "Maximum precipitation (mm/h)", 0, 20, 0.1)}${limits("probability", "Maximum precipitation chance (%)", 0, 100)}</div>
      <div>${toggle(c, "checkVisibility", "Check visibility")}${limits("visibility", "Minimum visibility (km)", 0.1, 100, 0.5)}</div>
      <div>${toggle(c, "checkCloud", "Check low cloud cover")}${limits("cloud", "Maximum low cloud (%)", 0, 100)}</div>
      <div>${toggle(c, "checkFreezing", "Check freezing-level clearance")}${limits("freezingMargin", "Clearance above selected altitude (ft)", 0, 5000, 100)}</div>
      <div class="flightToggleStack">${toggle(c, "checkHazards", "Exclude forecast fog, snow, freezing precipitation and thunderstorms")}${toggle(c, "daylight", "Entire period between sunrise and sunset")}${toggle(c, "autoRefresh", "Refresh EGSX every 30 minutes while open")}</div>
      </div><p class="muted small">Low cloud percentage is not cloud base or ceiling. Freezing level alone cannot establish icing conditions. These are your planning preferences; confirm aircraft, instructor and operational limits separately.</p></fieldset>`;
  }
  function timeline(hours, config) {
    if (hours.length < 2) return "";
    const w = 1100, height = 230, left = 45, right = 12, top = 20, bottom = 47;
    const start = hours[0].epoch, span = hours.at(-1).epoch - start;
    const valid = hours.flatMap(h => [h.surface, h.gust, h.aloft]).filter(Number.isFinite);
    const max = Math.max(10, Math.ceil(Math.max(config.surface, config.gust, config.aloft, ...valid) / 10) * 10);
    const x = t => left + (t - start) / span * (w - left - right), y = v => top + (1 - v / max) * (height - top - bottom);
    const paths = ["surface", "gust", "aloft"].map(key => {
      let prev = false;
      const d = hours.map(h => { if (!Number.isFinite(h[key])) { prev = false; return ""; } const point = `${prev ? "L" : "M"}${x(h.epoch).toFixed(1)} ${y(h[key]).toFixed(1)}`; prev = true; return point; }).join(" ");
      return `<path d="${d}" class="flightLine flightLine-${key}"/>`;
    }).join("");
    const dates = [...new Set(hours.map(h => h.time.slice(0, 10)))];
    const axis = dates.map(date => { const h = hours.find(h => h.time.startsWith(date)); const pos = x(h.epoch); return `<line x1="${pos}" x2="${pos}" y1="${top}" y2="${height - bottom}" class="graphGrid"/><text x="${pos + 2}" y="${height - 26}" class="graphText">${esc(day(date).split(" ").slice(0, 2).join(" "))}</text>`; }).join("");
    const ticks = [0, max / 2, max].map(v => `<line x1="${left}" x2="${w - right}" y1="${y(v)}" y2="${y(v)}" class="graphGrid"/><text x="${left - 8}" y="${y(v) + 4}" text-anchor="end" class="graphText">${v}</text>`).join("");
    return `<div class="flightLegend"><span class="flightSurface">● Surface</span><span class="flightGust">● Gust</span><span class="flightAloft">● Maximum in altitude band</span><span class="muted">kt · UK local dates</span></div><div class="graphScroll"><svg class="flightTimeline" viewBox="0 0 ${w} ${height}" role="img" aria-label="Surface wind, gust and maximum wind in selected altitude band through the loaded forecast">${axis}${ticks}${paths}<path d="M${left} ${y(config.surface)}H${w - right}" class="flightLimit"/><text x="${w - right}" y="${y(config.surface) - 5}" text-anchor="end" class="graphText">Surface limit ${config.surface} kt</text></svg></div>`;
  }
  function dailyOverview(result) {
    const peak = (hours, key) => { const a = hours.map(h => h[key]).filter(Number.isFinite); return a.length ? Math.max(...a) : null; };
    return `<div class="tableWrap"><table><caption>Daily outlook · all loaded dates</caption><thead><tr><th>UK date</th><th>Availability</th><th>Best period meeting limits</th><th>Passing starts</th><th>Surface / gust max</th><th>Altitude band max</th><th>Precipitation max / chance</th></tr></thead><tbody>${result.dates.map(date => {
      const candidates = result.allCandidates?.filter(c => c.date === date) || [], passing = candidates.filter(c => c.pass).sort((a, b) => b.margin - a.margin || a.start - b.start), best = passing[0];
      const hours = result.hours.filter(h => h.time.startsWith(date));
      const blocked = result.config.blocked.includes(date) || !result.config.weekdays.includes(new Date(`${date}T12:00:00Z`).getUTCDay());
      const failures = [...new Set(candidates.flatMap(c => c.reasons))];
      return `<tr class="${blocked ? "flightExcludedRow" : best ? "bestFlightRow" : ""}"><td><button type="button" class="secondary tiny" data-inspect-date="${date}">${esc(day(date))}</button></td><td>${blocked ? "Unavailable" : "Available"}</td><td>${best ? `${hm(best.startIso)}–${hm(best.endIso)} · margin ${best.margin}` : `<span title="${esc(failures.join("; "))}">${blocked ? "Excluded" : candidates.length ? esc(failures.slice(0, 2).join("; ")) : "No complete future period"}</span>`}</td><td>${passing.length} / ${candidates.length}</td><td>${num(peak(hours, "surface"))} / ${num(peak(hours, "gust"))} kt</td><td>${num(peak(hours, "aloft"))} kt</td><td>${num(peak(hours, "rain"))} mm/h · ${num(peak(hours, "probability"), 0)}%</td></tr>`;
    }).join("")}</tbody></table></div>`;
  }
  function candidateTable(candidates, canInspect = true) {
    return `<div class="tableWrap"><table><thead><tr><th>Flight period · UK time</th><th>Result</th><th>Margin /100</th><th>Surface / gust</th><th>Altitude band</th><th>Precipitation / chance</th><th>Visibility min</th><th>Low cloud max</th><th>Reasons</th></tr></thead><tbody>${candidates.map(c => `<tr class="${c.pass ? "bestFlightRow" : "badFlightRow"}"><td>${canInspect ? `<button class="secondary tiny" type="button" data-inspect-hour="${c.first}">${esc(label(c))}</button>` : esc(label(c))}</td><td>${c.pass ? "Meets enabled limits" : "Excluded"}</td><td>${c.pass ? c.margin : "—"}</td><td>${num(c.surface)} / ${num(c.gust)} kt</td><td>${num(c.aloft)} kt</td><td>${num(c.rain)} mm/h · ${num(c.probability, 0)}%</td><td>${num(c.visibility)} km</td><td>${num(c.cloud, 0)}%</td><td>${esc(c.reasons.join("; ") || "All enabled checks pass")}</td></tr>`).join("")}</tbody></table></div>`;
  }
  function hourlyTable(result, date) {
    const config = result.config, elevation = 321 / P.FT;
    const heights = [1000, 2000, 3000, 4000, 5000].filter(h => h <= config.altitude);
    if (!heights.includes(config.altitude)) heights.push(config.altitude);
    return `<div class="tableWrap"><table><thead><tr><th>UK time / profile</th><th>Surface wind</th><th>Gust</th>${heights.map(ft => `<th>${ft.toLocaleString()} ft ${config.basis.toUpperCase()}</th>`).join("")}<th>Precipitation / chance</th><th>Visibility</th><th>Low cloud</th><th>Freezing level AMSL</th></tr></thead><tbody>${result.hours.map((h, i) => ({ ...h, i })).filter(h => h.time.startsWith(date)).map(h => `<tr><td><button type="button" class="secondary tiny" data-inspect-hour="${h.i}">${hm(h.time)} ${h.time.includes("+01:00") ? "BST" : "GMT"}</button></td><td>${num(h.surface)} kt / ${num(h.dir, 0)}°T</td><td>${num(h.gust)} kt</td>${heights.map(ft => {
      const point = P.interpolate(h.points, ft / P.FT + (config.basis === "agl" ? elevation : 0));
      return `<td>${point ? `${num(point.speed * P.KT)} kt / ${num(point.dir, 0)}°T` : "Unavailable"}</td>`;
    }).join("")}<td>${num(h.rain)} mm/h · ${num(h.probability, 0)}%</td><td>${num(h.visibility)} km</td><td>${num(h.cloud, 0)}%</td><td>${num(h.freezing, 0)} ft</td></tr>`).join("")}</tbody></table></div>`;
  }
  function csv(result) {
    const rows = [["start_uk", "end_uk", "meets_enabled_limits", "margin_100", "surface_max_kt", "gust_max_kt", "altitude_band_max_kt", "precipitation_max_mm_h", "precipitation_chance_max_pct", "visibility_min_km", "reasons"], ...result.candidates.map(c => [c.startIso, c.endIso, c.pass, c.margin, c.surface, c.gust, c.aloft, c.rain, c.probability, c.visibility, c.reasons.join("; ")])];
    return rows.map(r => r.map(v => `"${String(v ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  }
  window.FlightPlannerUI = {
    render({ card, result, fetchedAt, detailDate, onChange, onDetailDate, onTime, onDownload }) {
      const c = result.config;
      const stale = !fetchedAt || Date.now() - fetchedAt > 2 * 60 * 60 * 1000;
      const best = !stale && !result.error ? result.best : null;
      const chosenDate = result.dates.includes(detailDate) ? detailDate : result.best?.date || result.dates[0];
      const forecastDay = best ? result.dates.indexOf(best.date) + 1 : 0;
      const recommendation = best ? `<div class="flightBest"><div><span class="chip">Best period meeting your enabled limits</span><div class="flightBestTime">${esc(label(best))}</div><p>${c.duration} minutes · ${c.altitude.toLocaleString()} ft ${c.basis.toUpperCase()}</p><div class="chips"><span class="chip">Surface ${num(best.surface)} kt</span><span class="chip">Gust ${num(best.gust)} kt</span><span class="chip">Altitude band ${num(best.aloft)} kt</span><span class="chip">Precipitation ${num(best.rain)} mm/h · ${num(best.probability, 0)}%</span><span class="chip">Visibility ${num(best.visibility)} km</span></div><button type="button" class="secondary tiny" data-inspect-hour="${best.first}">Inspect wind profile at start</button></div><div class="flightScoreBox"><span class="muted small">Weather margin</span><strong class="flightScoreValue">${best.margin}<small>/100</small></strong><span class="small">Higher = more room below your limits</span></div></div>` : `<div class="flightEmpty" role="status"><strong>${stale ? "Refresh forecast before choosing a flight period." : result.error ? esc(result.error) : "No complete flight period meets your enabled limits."}</strong><p class="muted">${stale ? "The forecast on this screen is more than two hours old." : "Check your availability, blocked dates and weather limits. The tables below explain excluded periods."}</p></div>`;
      card.innerHTML = `<div class="flightHeader"><div><span class="kicker">EGSX · North Weald</span><h2>Find your flight window</h2><p class="muted">Surface to 5,000 feet · ${result.dates.length}-day forecast · UK local time (GMT/BST)</p></div><span class="chip">Updated ${fetchedAt ? new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" }).format(fetchedAt) : "—"}</span></div>
      ${controls(c, result.dates)}<div id="flightResults" aria-live="polite">${recommendation}${best ? `<p class="muted small"><strong>Forecast day ${forecastDay}${forecastDay >= 8 ? " · tentative long-range outlook" : ""}.</strong> ${forecastDay >= 8 ? "Recheck closer to the date before making a booking decision." : "Recheck the latest aviation forecast before flying."}</p>` : ""}<p class="muted small">${result.ranked?.length || 0} passing starts in the selected range. A period must pass every enabled check throughout its duration. Turning a filter off excludes it from both screening and ranking.</p></div>
      <details class="flightExplanation"><summary>Calculation &amp; forecast detail</summary><p>Candidate starts are 30 minutes apart. Wind and other instantaneous fields use the hourly samples bracketing the whole period; hourly precipitation totals use every accumulation interval overlapping it. No invented 30-minute weather data. Missing enabled data or gaps exclude the period.</p><p>Margin = 100 × (1 − [75% worst enabled limit ratio + 25% average ratio]), bounded below by zero. Minimum limits use the inverse ratio. Highest margin wins; ties choose the earliest start. This is a preference score, not a probability of a safe flight.</p><p>GFS model via <a href="https://open-meteo.com/en/docs/gfs-api" target="_blank" rel="noreferrer">Open-Meteo</a>. Altitude winds are interpolated as vectors using forecast geopotential heights and North Weald’s 321 ft elevation. Pressure-level data is about 25 km resolution. Beyond day 5, native steps are generally three hours and Open-Meteo interpolates to hourly. Days 8–15 are a tentative outlook, not precise booking guidance.</p><p>10 m wind represents near-surface conditions, not a ground sensor. Low-cloud percentage does not verify a VFR ceiling; turbulence, terrain effects, actual runway state and airspace are not screened. Use the official aviation briefing, METAR/TAF, NOTAMs and your instructor for the flight decision. Monitoring refreshes only while this page is open.</p></details>
      <h3>Wind outlook across the forecast</h3>${timeline(result.hours, c)}${dailyOverview(result)}
      <details class="flightDetails"><summary>Best matching periods (${Math.min(10, result.ranked?.length || 0)} shown)</summary>${result.ranked?.length ? candidateTable(result.ranked.slice(0, 10)) : '<p class="muted">No periods meet the enabled limits.</p>'}</details>
      <div class="flightHeader"><h3>Detailed winds &amp; weather by hour</h3><div class="field"><label for="flightDetailDate">Inspect UK date</label><select id="flightDetailDate">${result.dates.map(d => `<option value="${d}" ${d === chosenDate ? "selected" : ""}>${esc(day(d))}</option>`).join("")}</select></div></div><p class="muted small">Click a time for its altitude profile. Wind directions are degrees true, showing where wind comes from. All thresholds and flight tables use knots.</p>${hourlyTable(result, chosenDate)}
      <details class="flightDetails"><summary>Every candidate on ${esc(day(chosenDate))} · including exclusion reasons</summary>${candidateTable((result.allCandidates || []).filter(x => x.date === chosenDate))}</details>
      <button type="button" class="secondary" data-download-flight>Download flight-window CSV</button>`;
      card.onchange = event => {
        const target = event.target;
        if (target.id === "flightDetailDate") { onDetailDate(target.value); return; }
        const next = { ...c, blocked: [...c.blocked], weekdays: [...c.weekdays] };
        if (target.dataset.setting) {
          if (target.type === "number" && !target.checkValidity()) { target.reportValidity(); return; }
          next[target.dataset.setting] = target.type === "checkbox" ? target.checked : target.type === "number" ? Number(target.value) : target.value;
        } else if (target.dataset.weekday !== undefined) {
          const n = Number(target.dataset.weekday); next.weekdays = target.checked ? [...next.weekdays, n] : next.weekdays.filter(x => x !== n);
        } else return;
        onChange(P.settings(next));
      };
      card.onclick = event => {
        const button = event.target.closest("button");
        if (!button) return;
        if (button.dataset.blockDate) { const date = button.dataset.blockDate; onChange({ ...c, blocked: c.blocked.includes(date) ? c.blocked.filter(d => d !== date) : [...c.blocked, date] }); }
        else if (button.hasAttribute("data-clear-blocks")) onChange({ ...c, blocked: [] });
        else if (button.dataset.inspectDate) onDetailDate(button.dataset.inspectDate);
        else if (button.dataset.inspectHour !== undefined) onTime(result.hours[Number(button.dataset.inspectHour)].time);
        else if (button.hasAttribute("data-download-flight")) onDownload(csv(result));
      };
    }
  };
})();
