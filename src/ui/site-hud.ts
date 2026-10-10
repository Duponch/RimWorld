import './site-hud.css';
import { calendarTick } from '../sim/calendar';
import { climateDate } from '../sim/site-climate';
import { TICKS_PER_DAY, type World } from '../sim/types';
import { WEATHER, type WeatherKind } from '../sim/weather-definitions';
import { perceivedWeather } from '../sim/weather';

const quadrums = ['avrimai', 'juillêt', 'septobre', 'décembary'] as const;
const seasons = ['Printemps', 'Été', 'Automne', 'Hiver'] as const;

/** Civil dates follow the saved climate origin, rather than elapsed game days. */
export function siteHudDate(world: World): { day: number; label: string; full: string; season?: number } {
  if (!world.climate) {
    const day = 1 + Math.floor(calendarTick(world) / TICKS_PER_DAY);
    return { day, label: 'Partie historique', full: `Jour ${day} · calendrier historique` };
  }
  const date = climateDate(world);
  return { day: date.day, label: `${quadrums[date.quadrum]} ${date.year}`,
    full: `${date.day} ${quadrums[date.quadrum]} ${date.year} · ${date.season}`, season: date.quadrum };
}

/** This small illustration is authored once. Only its phase and position change. */
export function siteHudLayout(): string {
  return `<div class="site-readout" aria-label="Heure, date et conditions extérieures">
    <div class="site-conditions">
      <div id="weather" class="biome-label" data-weather="clear"><span class="site-readout-icon" aria-hidden="true"></span><span class="site-readout-value">Ensoleillé</span></div>
      <div id="outdoor-temperature" class="biome-label"><span class="site-readout-value">— °C</span><span class="site-readout-icon" aria-hidden="true"></span></div>
    </div>
    <div id="site-condition" class="site-condition" hidden></div>
    <div class="site-civil-time">
      <div id="clock" aria-label="Heure locale">00:00</div>
      <div class="site-calendar"><div class="site-calendar-icons"><span id="site-season" class="site-season" aria-label="Saison"></span><span class="site-calendar-page" aria-hidden="true"><span id="calendar-day">1</span></span></div><div id="day">avrimai 5500</div></div>
    </div>
    <div id="site-sky" class="site-sky" data-phase="day" data-weather="clear" aria-hidden="true">
      <svg viewBox="0 0 240 58" preserveAspectRatio="xMidYMid meet" focusable="false">
        <defs><linearGradient id="site-sky-day" x2="0" y2="1"><stop stop-color="#284769"/><stop offset="1" stop-color="#6b91a1"/></linearGradient><linearGradient id="site-sky-night" x2="0" y2="1"><stop stop-color="#182335"/><stop offset="1" stop-color="#38485f"/></linearGradient></defs>
        <rect class="site-sky-day" x="0" y="0" width="240" height="58" rx="7" fill="url(#site-sky-day)"/><rect class="site-sky-night" x="0" y="0" width="240" height="58" rx="7" fill="url(#site-sky-night)"/>
        <g class="site-stars" fill="#fff7e9"><circle cx="24" cy="14" r="1"/><circle cx="65" cy="9" r="1.4"/><circle cx="95" cy="22" r="1"/><circle cx="153" cy="10" r="1"/><circle cx="211" cy="15" r="1.4"/><circle cx="180" cy="26" r=".8"/></g>
        <g id="site-celestial" transform="translate(120 16)"><g class="site-sun" stroke="#ffc23c" stroke-width="2" stroke-linecap="round"><circle r="7" fill="#ffc23c"/><path d="M0-12v2M0 10v2M-12 0h2M10 0h2M-9-9l2 2M7 7l2 2M-9 9l2-2M7-7l2-2"/></g><path class="site-moon" d="M4-8A9 9 0 1 0 8 4A8 8 0 0 1 4-8Z" fill="#fff5cd" stroke="#182335" stroke-width="1.4"/></g>
        <g class="site-weather-clouds" fill="#c5d3df" stroke="#233449" stroke-width="1.5"><path d="M54 26c-9-1-9-13 0-14 2-12 18-12 21-3 12-3 18 14 5 17Z"/><path d="M151 27c-10-1-10-14 0-15 2-11 17-12 22-3 11-2 18 15 5 18Z"/></g>
        <g class="site-weather-rain" stroke="#71c3f5" stroke-width="2" stroke-linecap="round"><path d="m57 31-3 7m14-7-3 7m95-7-3 7m15-7-3 7"/></g>
        <g class="site-weather-snow" fill="#e3f5ff"><circle cx="54" cy="34" r="2"/><circle cx="72" cy="37" r="2"/><circle cx="160" cy="37" r="2"/><circle cx="179" cy="34" r="2"/></g>
        <g class="site-weather-fog" stroke="#c3d1da" stroke-width="2" stroke-linecap="round"><path d="M25 32h63M104 34h37M163 32h49M43 40h62M130 41h61"/></g>
        <path class="site-weather-lightning" d="m116 19-8 11h6l-3 11 13-15h-7l5-7Z" fill="#ffc23c" stroke="#233449" stroke-width="1"/>
        <path d="M0 53Q47 34 93 49T182 46T240 49V58H0Z" fill="#466951"/><path d="M0 55Q48 42 92 52T179 51T240 53" fill="none" stroke="#96b39b" stroke-width="1.2"/>
      </svg>
    </div>
    <div id="biome-current" class="biome-label site-biome"></div>
  </div>`;
}

function seasonUrl(index: number): string {
  const drawings = [
    '<path d="M21 35v-12m0 5c-8 0-11-6-10-10 7-1 12 4 10 10Zm0-5c0-9 7-14 14-13 1 8-6 14-14 13Z" fill="#2fc98e"/><path d="M10 37h25" stroke="#d6f4e6"/>',
    '<circle cx="24" cy="24" r="10" fill="#ffc23c"/><path d="M24 4v5m0 30v5M4 24h5m30 0h5M10 10l4 4m20 20 4 4M10 38l4-4m20-20 4-4" stroke="#ffc23c"/>',
    '<path d="m24 5 5 10 9-3-3 11 8 5-13 5-6 11-3-12-14-6 10-5-3-12 9 5Z" fill="#ff9655"/><path d="m24 18-2 23m1-12-8-5m8 0 8-5" stroke="#7c4734"/>',
    '<g stroke="#b0deff"><path d="M24 5v38M8 14l32 20M8 34l32-20M19 9l5 5 5-5M19 39l5-5 5 5M8 20l7-1-2-7M35 36l-2-7 7-1M8 28l7 1-2 7M35 12l-2 7 7 1"/></g>',
  ];
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><g stroke="#263449" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none">${drawings[index]}</g></svg>`)}")`;
}

/** Cache references once. Presentation changes are applied at minute/condition
 * boundaries, with no observer, timer, frame animation or game-state writes. */
export function createSiteHud(root: HTMLElement): { update(world: World, temperature: number, condition?: string): void } {
  const weather = root.querySelector<HTMLElement>('#weather')!;
  const weatherValue = weather.querySelector<HTMLElement>('.site-readout-value')!;
  const temperatureValue = root.querySelector<HTMLElement>('#outdoor-temperature .site-readout-value')!;
  const conditionValue = root.querySelector<HTMLElement>('#site-condition')!;
  const clock = root.querySelector<HTMLElement>('#clock')!;
  const calendarDay = root.querySelector<HTMLElement>('#calendar-day')!;
  const day = root.querySelector<HTMLElement>('#day')!;
  const calendar = root.querySelector<HTMLElement>('.site-calendar')!;
  const season = root.querySelector<HTMLElement>('#site-season')!;
  const sky = root.querySelector<HTMLElement>('#site-sky')!;
  const celestial = root.querySelector<SVGGElement>('#site-celestial')!;
  const icons = seasons.map((_season, index) => seasonUrl(index));
  let previousMinute = -1, previousDate = '', previousWeather: WeatherKind | undefined, previousTemperature = '', previousCondition = '', previousWeatherLabel = '';
  return { update(world, temperature, condition = '') {
    const civil = calendarTick(world), minute = Math.floor((civil % TICKS_PER_DAY) * 1440 / TICKS_PER_DAY);
    if (minute !== previousMinute) {
      previousMinute = minute;
      clock.textContent = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
      const isDay = minute >= 360 && minute < 1080;
      sky.dataset.phase = isDay ? 'day' : 'night';
      const progress = isDay ? (minute - 360) / 720 : ((minute + 360) % 1440) / 720;
      celestial.setAttribute('transform', `translate(${(16 + progress * 208).toFixed(2)} ${(40 - Math.sin(progress * Math.PI) * 26).toFixed(2)})`);
    }
    const date = siteHudDate(world);
    if (date.full !== previousDate) {
      previousDate = date.full;
      calendarDay.textContent = String(date.day); day.textContent = date.label;
      calendar.title = date.full; calendar.setAttribute('aria-label', date.full);
      season.hidden = date.season === undefined;
      if (date.season !== undefined) { season.style.backgroundImage = icons[date.season]!; season.title = seasons[date.season]!; season.setAttribute('aria-label', seasons[date.season]!); }
    }
    const kind = world.weather ? perceivedWeather(world) : 'clear';
    const weatherLabel = kind === 'clear' && sky.dataset.phase === 'night' ? 'Ciel dégagé' : WEATHER[kind].label;
    if (kind !== previousWeather || condition !== previousCondition || weatherLabel !== previousWeatherLabel) {
      previousWeather = kind; previousCondition = condition; previousWeatherLabel = weatherLabel;
      weather.dataset.weather = kind; sky.dataset.weather = kind;
      weatherValue.textContent = weatherLabel;
      weather.title = [weatherLabel, condition].filter(Boolean).join(' · ');
      conditionValue.textContent = condition; conditionValue.hidden = condition === '';
      sky.dataset.eclipse = String(condition.includes('Éclipse'));
    }
    const formattedTemperature = `${temperature.toFixed(1)} °C`;
    if (formattedTemperature !== previousTemperature) {
      previousTemperature = formattedTemperature; temperatureValue.textContent = formattedTemperature;
      temperatureValue.parentElement!.title = `Température extérieure : ${formattedTemperature}`;
    }
  } };
}
