/* North Weald forecast screening. No aircraft or regulatory limits are implied. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.FlightPlanner = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const KT = 1.9438444924406, FT = 3.2808398950131;
  const LEVELS = [1000, 975, 950, 925, 900, 875, 850, 825, 800, 700];
  const DEFAULTS = { duration: 60, start: "09:00", end: "18:00", date: "all", altitude: 5000, basis: "amsl",
    surface: 15, gust: 22, aloft: 25, checkAloft: true, checkRain: true, rain: 0.1, probability: 30,
    checkVisibility: true, visibility: 8, checkCloud: false, cloud: 70, checkHazards: true,
    daylight: true, checkCrosswind: false, crosswind: 10, heading: 20,
    checkFreezing: false, freezingMargin: 500, checkDifference: false, difference: 20,
    weekdays: [0, 1, 2, 3, 4, 5, 6], blocked: [], autoRefresh: true };
  const finite = x => typeof x === "number" && Number.isFinite(x);
  const epoch = iso => Date.parse(iso);
  const clamp = (x, min, max, fallback) => finite(Number(x)) ? Math.min(max, Math.max(min, Number(x))) : fallback;
  function settings(input = {}) {
    const out = { ...DEFAULTS, ...input };
    for (const key of Object.keys(DEFAULTS).filter(k => typeof DEFAULTS[k] === "boolean")) out[key] = typeof input[key] === "boolean" ? input[key] : DEFAULTS[key];
    const limits = { duration: [30, 480], altitude: [500, 5000], surface: [1, 100], gust: [1, 150], aloft: [1, 150], rain: [0, 20], probability: [0, 100], visibility: [0.1, 100], cloud: [0, 100], crosswind: [1, 100], heading: [0, 359], freezingMargin: [0, 5000], difference: [1, 100] };
    for (const [key, [min, max]] of Object.entries(limits)) out[key] = clamp(input[key] ?? DEFAULTS[key], min, max, DEFAULTS[key]);
    out.duration = Math.round(out.duration / 30) * 30;
    for (const key of ["start", "end"]) out[key] = /^([01]\d|2[0-3]):[0-5]\d$/.test(out[key]) ? out[key] : DEFAULTS[key];
    out.basis = out.basis === "agl" ? "agl" : "amsl";
    out.date = /^\d{4}-\d{2}-\d{2}$/.test(out.date) ? out.date : "all";
    out.blocked = Array.isArray(out.blocked) ? [...new Set(out.blocked.filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x)))] : [];
    out.weekdays = Array.isArray(out.weekdays) ? [...new Set(out.weekdays.filter(x => Number.isInteger(x) && x >= 0 && x <= 6))] : [...DEFAULTS.weekdays];
    return out;
  }
  function vector(speed, direction) { const r = direction * Math.PI / 180; return { u: -speed * Math.sin(r), v: -speed * Math.cos(r) }; }
  function interpolate(points, height) {
    const exact = points.find(p => Math.abs(p.msl - height) < 0.01);
    if (exact) return { ...exact };
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      if (a.msl > height || b.msl < height) continue;
      const f = (height - a.msl) / (b.msl - a.msl), va = vector(a.speed, a.dir), vb = vector(b.speed, b.dir);
      const u = va.u + (vb.u - va.u) * f, v = va.v + (vb.v - va.v) * f;
      return { msl: height, agl: a.agl + (b.agl - a.agl) * f, speed: Math.hypot(u, v), dir: (Math.atan2(-u, -v) * 180 / Math.PI + 360) % 360,
        temp: finite(a.temp) && finite(b.temp) ? a.temp + (b.temp - a.temp) * f : null, source: "interpolated" };
    }
    return null; // Never extrapolate missing altitude coverage.
  }
  function profile(data, i, elevation) {
    const h = data.hourly || {}, points = [];
    if (finite(h.wind_speed_10m?.[i]) && finite(h.wind_direction_10m?.[i])) points.push({ msl: elevation + 10, agl: 10, speed: h.wind_speed_10m[i], dir: h.wind_direction_10m[i], temp: h.temperature_2m?.[i], source: "10 m surface" });
    for (const level of LEVELS) {
      const height = h[`geopotential_height_${level}hPa`]?.[i], speed = h[`wind_speed_${level}hPa`]?.[i], dir = h[`wind_direction_${level}hPa`]?.[i];
      if (finite(height) && height > elevation + 10 && finite(speed) && finite(dir)) points.push({ msl: height, agl: height - elevation, speed, dir, temp: h[`temperature_${level}hPa`]?.[i], source: `${level} hPa` });
    }
    return points.sort((a, b) => a.msl - b.msl);
  }
  const max = values => values.length && values.every(finite) ? Math.max(...values) : null;
  const min = values => values.length && values.every(finite) ? Math.min(...values) : null;
  function hourMetrics(data, i, config, elevation) {
    const h = data.hourly, points = profile(data, i, elevation);
    const topMsl = config.altitude / FT + (config.basis === "agl" ? elevation : 0);
    const top = interpolate(points, topMsl);
    const band = points.filter(p => p.msl <= topMsl);
    if (top) band.push(top);
    const missingLevel = LEVELS.some(level => {
      const height = h[`geopotential_height_${level}hPa`]?.[i];
      return !finite(height) || (height > elevation + 10 && height <= topMsl && (!finite(h[`wind_speed_${level}hPa`]?.[i]) || !finite(h[`wind_direction_${level}hPa`]?.[i])));
    });
    const complete = Boolean(top && points[0]?.source === "10 m surface" && !missingLevel);
    const base = points[0] ? vector(points[0].speed, points[0].dir) : null;
    const dir = h.wind_direction_10m?.[i], gust = h.wind_gusts_10m?.[i];
    return { surface: finite(h.wind_speed_10m?.[i]) ? h.wind_speed_10m[i] * KT : null,
      gust: finite(gust) ? gust * KT : null, aloft: complete ? max(band.map(p => p.speed * KT)) : null,
      difference: complete && base ? max(band.map(p => { const v = vector(p.speed, p.dir); return Math.hypot(v.u - base.u, v.v - base.v) * KT; })) : null,
      crosswind: finite(dir) && finite(gust) ? Math.abs(Math.sin((dir - config.heading) * Math.PI / 180)) * gust * KT : null,
      visibility: finite(h.visibility?.[i]) ? h.visibility[i] / 1000 : null,
      rain: h.precipitation?.[i], probability: h.precipitation_probability?.[i], cloud: h.cloud_cover_low?.[i], code: h.weather_code?.[i],
      freezing: finite(h.freezing_level_height?.[i]) ? h.freezing_level_height[i] * FT : null,
      dir, points, complete, topMsl: topMsl * FT };
  }
  function minutes(iso) { const t = iso.split("T")[1]; return Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)); }
  function clockMinutes(t) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
  const formatters = new Map();
  function localIso(ms, timezone = "Europe/London") {
    if (!formatters.has(timezone)) formatters.set(timezone, new Intl.DateTimeFormat("en-GB", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", timeZoneName: "longOffset" }));
    const parts = formatters.get(timezone).formatToParts(ms);
    const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${p.timeZoneName === "GMT" ? "+00:00" : p.timeZoneName.replace("GMT", "")}`;
  }
  function normalize(data) {
    if (data.hourly_units?.time !== "unixtime") return data;
    for (const key of ["hourly", "minutely_15", "daily"]) {
      const block = data[key];
      if (block?.time) block.time = block.time.map(t => key === "daily" ? localIso(t * 1000).slice(0, 10) : localIso(t * 1000));
    }
    for (const key of ["sunrise", "sunset"]) if (data.daily?.[key]) data.daily[key] = data.daily[key].map(t => finite(t) ? localIso(t * 1000) : null);
    if (finite(data.current?.time)) data.current.time = localIso(data.current.time * 1000);
    return data;
  }
  function calculate(data, input, now = Date.now(), elevation = 321 / FT) {
    const config = settings(input), h = data?.hourly;
    if (!h?.time?.length) return { candidates: [], hours: [], config, error: "No forecast data available." };
    const times = h.time.map(epoch), metrics = h.time.map((_, i) => hourMetrics(data, i, config, elevation));
    const hours = h.time.map((time, i) => ({ time, epoch: times[i], ...metrics[i] }));
    const dates = [...new Set(h.time.map(t => t.slice(0, 10)))];
    if (!dates.includes(config.date)) config.date = "all";
    const candidates = [];
    if (clockMinutes(config.end) <= clockMinutes(config.start)) return { candidates, hours, dates, config, error: "Available until must be later than available from. Windows stay within one local day." };
    const daylight = new Map((data.daily?.time || []).map((date, i) => [date, [epoch(data.daily.sunrise?.[i]), epoch(data.daily.sunset?.[i])]]));
    for (let first = 0; first < times.length - 1; first++) {
      for (const offset of [0, 30 * 60000]) {
        const start = times[first] + offset, end = start + config.duration * 60000;
        if (start < now || end > times.at(-1)) continue;
        const startIso = localIso(start, data.timezone || "Europe/London"), endIso = localIso(end, data.timezone || "Europe/London"), date = startIso.slice(0, 10);
        if (endIso.slice(0, 10) !== date || minutes(startIso) < clockMinutes(config.start) || minutes(endIso) > clockMinutes(config.end)) continue;
        let last = first;
        while (last < times.length - 1 && times[last] < end) last++;
        const samples = metrics.slice(first, last + 1), rainSamples = metrics.slice(first + 1, last + 1);
        const reasons = [], ratios = [];
        const reject = reason => reasons.push(reason);
        if (times.slice(first, last + 1).some((t, n, a) => n > 0 && t - a[n - 1] !== 3600000)) reject("Missing hourly coverage");
        if (config.blocked.includes(date)) reject("Blocked date");
        const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
        if (!config.weekdays.includes(weekday)) reject("Unavailable weekday");
        const values = {};
        function upper(key, limit, label, enabled = true, source = samples) {
          values[key] = max(source.map(s => s[key]));
          if (!enabled) return;
          if (!finite(values[key])) reject(`${label} data unavailable`);
          else { ratios.push(limit > 0 ? values[key] / limit : values[key] > 0 ? 2 : 0); if (values[key] > limit) reject(`${label} ${values[key].toFixed(1)} > ${limit}`); }
        }
        upper("surface", config.surface, "Surface wind (kt)");
        upper("gust", config.gust, "Gust (kt)");
        upper("aloft", config.aloft, "Wind in altitude band (kt)", config.checkAloft);
        upper("crosswind", config.crosswind, "Gust crosswind (kt)", config.checkCrosswind);
        upper("difference", config.difference, "Vector difference (kt)", config.checkDifference);
        upper("rain", config.rain, "Precipitation (mm/h)", config.checkRain, rainSamples);
        upper("probability", config.probability, "Precipitation chance (%)", config.checkRain, rainSamples);
        upper("cloud", config.cloud, "Low cloud (%)", config.checkCloud);
        values.visibility = min(samples.map(s => s.visibility));
        if (config.checkVisibility) {
          if (!finite(values.visibility)) reject("Visibility data unavailable");
          else { ratios.push(config.visibility / Math.max(values.visibility, 0.01)); if (values.visibility < config.visibility) reject(`Visibility ${values.visibility.toFixed(1)} < ${config.visibility} km`); }
        }
        if (config.checkHazards) {
          if (samples.some(s => !finite(s.code))) reject("Weather code data unavailable");
          const hazards = [...new Set(samples.map(s => s.code).filter(c => [45, 48, 56, 57, 66, 67, 71, 73, 75, 77, 85, 86, 95, 96, 99].includes(c)))];
          if (hazards.length) reject("Fog, snow, freezing precipitation or thunderstorm forecast");
        }
        values.freezing = min(samples.map(s => s.freezing));
        if (config.checkFreezing) {
          const required = metrics[first].topMsl + config.freezingMargin;
          if (!finite(values.freezing)) reject("Freezing-level data unavailable");
          else { ratios.push(required / Math.max(values.freezing, 1)); if (values.freezing < required) reject(`Freezing level below altitude + ${config.freezingMargin} ft margin`); }
        }
        if (config.daylight) {
          const [rise, set] = daylight.get(date) || [];
          if (![rise, set].every(finite)) reject("Sunrise/sunset data unavailable");
          else if (start < rise || end > set) reject("Outside sunrise–sunset");
        }
        const stress = ratios.length ? 0.75 * Math.max(...ratios) + 0.25 * ratios.reduce((s, x) => s + x, 0) / ratios.length : 0;
        const margin = Math.round(Math.max(0, 100 * (1 - stress)));
        candidates.push({ date, start, end, startIso, endIso, first, last, ...values, reasons: [...new Set(reasons)], pass: !reasons.length, margin });
      }
    }
    const selected = candidates.filter(c => config.date === "all" || c.date === config.date);
    const ranked = selected.filter(c => c.pass).sort((a, b) => b.margin - a.margin || a.start - b.start);
    return { candidates: selected, allCandidates: candidates, ranked, best: ranked[0] || null, hours, dates, config, error: "" };
  }
  return { KT, FT, LEVELS, DEFAULTS, settings, interpolate, profile, hourMetrics, localIso, normalize, calculate };
});
