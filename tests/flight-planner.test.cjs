const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../flight-planner.js');
const day = '2026-10-14', now = Date.parse(`${day}T00:00:00+01:00`);
function fixture(start = now, count = 48) {
  const h = { time: Array.from({ length: count }, (_, i) => P.localIso(start + i * 3600000)) };
  for (const [key, value] of Object.entries({ wind_speed_10m: 4, wind_direction_10m: 0, wind_gusts_10m: 6, precipitation: 0, precipitation_probability: 10, cloud_cover_low: 20, visibility: 20000, weather_code: 0, temperature_2m: 12, freezing_level_height: 3000 })) h[key] = Array(count).fill(value);
  for (const [i, level] of P.LEVELS.entries()) {
    h[`geopotential_height_${level}hPa`] = Array(count).fill(130 + i * 250);
    h[`wind_speed_${level}hPa`] = Array(count).fill(5 + i * .1);
    h[`wind_direction_${level}hPa`] = Array(count).fill(0);
  }
  const dates = [...new Set(h.time.map(t => t.slice(0, 10)))];
  return { timezone: 'Europe/London', hourly: h, daily: { time: dates, sunrise: dates.map(d => `${d}T07:30:00+01:00`), sunset: dates.map(d => `${d}T18:00:00+01:00`) } };
}
const calc = (data = fixture(), config = {}) => P.calculate(data, config, now);
const find = (result, hour = '09:00') => result.candidates.find(c => c.startIso.startsWith(`${day}T${hour}`));
test('ranks only complete future windows and honors duration and availability', () => {
  const r = calc(); assert.ok(r.best); assert.equal(r.best.startIso.slice(11,16), '09:00');
  assert.equal(r.best.end - r.best.start, 3600000); assert.ok(r.ranked.every(c => c.start >= now));
  const long = calc(fixture(), { duration: 180, start:'10:00', end:'13:00' }); assert.equal(long.candidates.length, 2); assert.ok(long.candidates.every(c => c.endIso.includes('13:00')));
});
test('blocked dates and weekday exclusions can remove every recommendation', () => {
  const r = calc(fixture(), { blocked: [day] }); assert.ok(r.ranked.every(c => c.date !== day));
  assert.equal(calc(fixture(), { weekdays: [] }).best, null);
  assert.equal(calc(fixture(), { blocked: [day, '2026-10-15'] }).best, null);
});
test('wind spike in the last bracketing sample excludes entire flight', () => {
  const data = fixture(); data.hourly.wind_gusts_10m[10] = 30;
  const c = find(calc(data)); assert.equal(c.pass, false); assert.ok(c.reasons.some(x => x.startsWith('Gust')));
});
test('wind maximum includes raw in-band peaks, not only standard display heights', () => {
  const data = fixture(); data.hourly.wind_speed_950hPa[9] = 35;
  const c = find(calc(data)); assert.ok(c.aloft > 50); assert.equal(c.pass, false);
});
test('rain accumulation checks the ending hour, including fractional windows', () => {
  const data = fixture(); data.hourly.precipitation[10] = 2;
  assert.ok(find(calc(data), '09:00').reasons.some(x => x.includes('Precipitation (mm/h)')));
  assert.equal(find(calc(data, { duration: 30 }), '09:30').pass, false);
  assert.equal(find(calc(data, { checkRain: false })).pass, true);
});
test('missing enabled fields fail closed; disabled rain never changes score', () => {
  const data = fixture(); data.hourly.visibility[10] = null;
  assert.ok(find(calc(data)).reasons.includes('Visibility data unavailable'));
  assert.equal(find(calc(data, { checkVisibility:false })).pass, true);
  const rainy = fixture(); rainy.hourly.precipitation.fill(5); rainy.hourly.precipitation_probability.fill(99);
  assert.equal(find(calc(rainy, {checkRain:false})).margin, find(calc(fixture(), {checkRain:false})).margin);
});
test('no extrapolation or first-hour substitution for missing altitude coverage', () => {
  const data = fixture(); for (const level of P.LEVELS) data.hourly[`geopotential_height_${level}hPa`].fill(300);
  assert.equal(find(calc(data)).pass, false); assert.equal(find(calc(data)).aloft, null);
  assert.equal(find(calc(data, { checkAloft:false })).pass, true);
  assert.equal(P.interpolate([{msl:100,speed:5,dir:0}], 200), null);
});
test('direction interpolation wraps north correctly using vectors', () => {
  const p = P.interpolate([{msl:100,agl:0,speed:10,dir:350},{msl:300,agl:200,speed:10,dir:10}], 200);
  assert.ok(p.dir < 1 || p.dir > 359); assert.ok(p.speed > 9);
});
test('AMSL and AGL select different top heights', () => {
  const data = fixture(), a = calc(data, {basis:'amsl'}).hours[9], b = calc(data, {basis:'agl'}).hours[9];
  assert.ok(Math.abs(b.topMsl - a.topMsl - 321) < .01);
});
test('visibility, cloud, hazards, crosswind and freezing toggles affect screening', () => {
  const data = fixture(); data.hourly.weather_code[10] = 95; data.hourly.cloud_cover_low[10] = 100;
  assert.equal(find(calc(data)).pass, false); assert.equal(find(calc(data, {checkHazards:false})).pass, true);
  assert.equal(find(calc(data, {checkHazards:false,checkCloud:true})).pass, false);
  const cross = fixture(); cross.hourly.wind_direction_10m.fill(90);
  assert.equal(find(calc(cross, {checkCrosswind:true,crosswind:5,heading:0})).pass, false);
  const ice = fixture(); ice.hourly.freezing_level_height.fill(800);
  assert.equal(find(calc(ice, {checkFreezing:true})).pass, false);
});
test('daylight covers exact start and end; bad availability is explicit', () => {
  assert.equal(find(calc(fixture(), { start:'06:00',end:'20:00' }), '06:00').pass,false);
  assert.equal(find(calc(fixture(), { start:'06:00',end:'20:00',daylight:false }), '06:00').pass,true);
  assert.ok(calc(fixture(), {start:'18:00',end:'09:00'}).error);
});
test('DST fall-back retains distinct times and exact flight durations', () => {
  const start = Date.parse('2026-10-25T00:00:00+01:00'), data = fixture(start, 26);
  const r = P.calculate(data, {start:'00:00',end:'05:00',daylight:false}, start);
  assert.ok(r.hours.some(h => h.time === '2026-10-25T01:00:00+01:00'));
  assert.ok(r.hours.some(h => h.time === '2026-10-25T01:00:00+00:00'));
  assert.ok(r.candidates.every(c => c.end - c.start === 3600000));
  assert.equal(new Set(r.candidates.map(c => c.start)).size,r.candidates.length);
});
test('hourly gaps exclude affected windows; no windows extend past coverage', () => {
  const data = fixture(); data.hourly.time[10] = P.localIso(now + 10.5 * 3600000);
  assert.ok(find(calc(data)).reasons.includes('Missing hourly coverage'));
  assert.ok(calc().candidates.every(c => c.end <= Date.parse(fixture().hourly.time.at(-1))));
});
test('unix API normalization preserves UK dates, sunrise and offset timestamps', () => {
  const data = {hourly_units:{time:'unixtime'},hourly:{time:[now/1000]},daily:{time:[now/1000],sunrise:[(now+7.5*3600000)/1000],sunset:[(now+18*3600000)/1000]},current:{time:now/1000}};
  P.normalize(data); assert.equal(data.hourly.time[0],`${day}T00:00:00+01:00`); assert.equal(data.daily.time[0],day); assert.equal(data.current.time,data.hourly.time[0]);
});
test('old selected date resets to whole loaded range',()=>assert.ok(calc(fixture(),{date:'2020-01-01'}).best));
