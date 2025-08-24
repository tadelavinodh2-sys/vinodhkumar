const $ = s => document.querySelector(s);
const recentEl = $('#recent');
const unitBtn = $('#unit');
let unit = localStorage.getItem('unit') || 'C';
unitBtn.textContent = unit === 'C' ? '°C' : '°F';

const WMO = {
  0: ['Clear sky', '☀️'],
  1: ['Mainly clear', '🌤️'], 2: ['Partly cloudy', '⛅'], 3: ['Overcast', '☁️'],
  45: ['Fog', '🌫️'], 48: ['Rime fog', '🌫️'],
  51: ['Light drizzle', '🌦️'], 53: ['Drizzle', '🌦️'], 55: ['Dense drizzle', '🌧️'],
  61: ['Slight rain', '🌧️'], 63: ['Rain', '🌧️'], 65: ['Heavy rain', '🌧️'],
  71: ['Snow', '🌨️'], 75: ['Heavy snow', '❄️'],
  80: ['Rain showers', '🌦️'], 95: ['Thunderstorm', '⛈️']
};

function toF(c) { return c * 9/5 + 32; }
function fmtTemp(c) { return Math.round(unit === 'C' ? c : toF(c)) + '°' + unit; }

function setRecent(name, lat, lon) {
  const rec = JSON.parse(localStorage.getItem('recent')||'[]').filter(r=>r.name!==name);
  rec.unshift({name, lat, lon});
  localStorage.setItem('recent', JSON.stringify(rec.slice(0,6)));
  renderRecent();
}
function renderRecent() {
  recentEl.innerHTML='';
  const rec = JSON.parse(localStorage.getItem('recent')||'[]');
  rec.forEach(r=>{
    const b = document.createElement('button');
    b.className='chip'; b.textContent=r.name;
    b.onclick=()=> loadByCoords(r.name, r.lat, r.lon);
    recentEl.appendChild(b);
  });
}

async function geocode(q) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.results?.length) throw new Error('Place not found');
  const r = data.results[0];
  const name = [r.name, r.admin1, r.country_code].filter(Boolean).join(', ');
  return { name, lat: r.latitude, lon: r.longitude };
}

async function fetchForecast(lat, lon) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: lat, longitude: lon,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
    hourly: 'temperature_2m,precipitation_probability,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto'
  }).toString();
  const res = await fetch(url);
  return res.json();
}

function wIcon(code) { return (WMO[code]?.[1]) || '🌡️'; }
function wText(code) { return (WMO[code]?.[0]) || '—'; }

function drawSpark(times, tempsC) {
  const c = $('#spark');
  const ctx = c.getContext('2d');
  const width = c.clientWidth; const height = c.clientHeight;
  c.width = width * devicePixelRatio; c.height = height * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.clearRect(0,0,width,height);
  const n = Math.min(24, tempsC.length);
  const arr = tempsC.slice(0,n);
  const min = Math.min(...arr), max = Math.max(...arr);
  const pad = 6;
  ctx.lineWidth = 2; ctx.strokeStyle = '#6ea8fe';
  ctx.beginPath();
  arr.forEach((t,i)=>{
    const x = pad + (width-2*pad) * (i/(n-1));
    const y = height - pad - (height-2*pad) * ((t-min)/Math.max(1,(max-min)));
    if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.stroke();
}

function render(name, f) {
  $('#loc').textContent = name;
  $('#meta').textContent = `${f.timezone}`;
  $('#updated').textContent = `Updated: ${new Date(f.current.time).toLocaleString()}`;

  const cur = f.current;
  $('#nowTemp').textContent = fmtTemp(cur.temperature_2m);
  $('#nowFeels').textContent = fmtTemp(cur.apparent_temperature);
  $('#nowHum').textContent = cur.relative_humidity_2m + '%';
  $('#nowWind').textContent = `${Math.round(cur.wind_speed_10m)} km/h`;
  $('#nowDesc').textContent = `${wIcon(cur.weather_code)} ${wText(cur.weather_code)}`;

  // Hourly
  const hourly = $('#hourly');
  hourly.innerHTML='';
  for (let i=0;i<24;i++){
    const d = new Date(f.hourly.time[i]);
    const temp = f.hourly.temperature_2m[i];
    const code = f.hourly.weather_code[i];
    const el = document.createElement('div');
    el.className='hour';
    el.innerHTML = `<div class="muted">${d.getHours()}:00</div>
                    <div class="wicon">${wIcon(code)}</div>
                    <div>${fmtTemp(temp)}</div>
                    <div class="muted">${f.hourly.precipitation_probability[i]}%</div>`;
    hourly.appendChild(el);
  }
  drawSpark(f.hourly.time, f.hourly.temperature_2m);

  // Daily
  const daily = $('#daily');
  daily.innerHTML='';
  for (let i=0;i<7;i++){
    const date = new Date(f.daily.time[i]);
    const el = document.createElement('div');
    el.className='day';
    el.innerHTML = `<div class="muted">${date.toLocaleDateString(undefined,{weekday:'short'})}</div>
                    <div class="wicon">${wIcon(f.daily.weather_code[i])}</div>
                    <div>${fmtTemp(f.daily.temperature_2m_max[i])} / ${fmtTemp(f.daily.temperature_2m_min[i])}</div>
                    <div class="muted">Rain: ${f.daily.precipitation_probability_max[i]}%</div>`;
    daily.appendChild(el);
  }
}

async function loadByCoords(name, lat, lon) {
  const data = await fetchForecast(lat, lon);
  render(name, data);
  setRecent(name, lat, lon);
}

async function searchAndLoad() {
  const q = $('#q').value.trim();
  if (!q) return;
  try {
    const {name, lat, lon} = await geocode(q);
    loadByCoords(name, lat, lon);
  } catch (e) {
    alert(e.message || 'Place not found');
  }
}

$('#go').addEventListener('click', searchAndLoad);
$('#q').addEventListener('keydown', e=>{ if(e.key==='Enter') searchAndLoad(); });
$('#geo').addEventListener('click', ()=>{
  if (!navigator.geolocation) return alert('Not supported');
  navigator.geolocation.getCurrentPosition(async pos=>{
    loadByCoords('Your location', pos.coords.latitude, pos.coords.longitude);
  }, err=> alert(err.message));
});

unitBtn.addEventListener('click', ()=>{
  unit = unit === 'C' ? 'F' : 'C';
  localStorage.setItem('unit', unit);
  unitBtn.textContent = unit === 'C' ? '°C' : '°F';
  const rec = JSON.parse(localStorage.getItem('recent')||'[]');
  if (rec[0]) loadByCoords(rec[0].name, rec[0].lat, rec[0].lon);
});

// Init
renderRecent();
(async ()=>{
  const saved = JSON.parse(localStorage.getItem('recent')||'[]');
  if (saved[0]) return loadByCoords(saved[0].name, saved[0].lat, saved[0].lon);
  try {
    const {name, lat, lon} = await geocode('Hyderabad');
    loadByCoords(name, lat, lon);
  } catch(e){}
})();
