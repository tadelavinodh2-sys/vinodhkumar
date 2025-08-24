document.addEventListener('DOMContentLoaded', () => {
  // DOM element references
  const searchInput = document.getElementById('q');
  const searchButton = document.getElementById('go');
  const gpsButton = document.getElementById('geo');
  const locationEl = document.getElementById('loc');
  const updatedEl = document.getElementById('updated');
  const metaEl = document.getElementById('meta');
  const nowTempEl = document.getElementById('nowTemp');
  const nowDescEl = document.getElementById('nowDesc');
  const nowFeelsEl = document.getElementById('nowFeels');
  const nowHumEl = document.getElementById('nowHum');
  const nowWindEl = document.getElementById('nowWind');
  const nowPopEl = document.getElementById('nowPop');
  const hourlyContainer = document.getElementById('hourly');
  const dailyContainer = document.getElementById('daily');

  const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
  const FORECAST_API = 'https://api.open-meteo.com/v1/forecast';

  // --- EVENT LISTENERS ---

  // Search button click
  searchButton.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) {
      getCoordinates(query);
    }
  });

  // Search input Enter key press
  searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      const query = searchInput.value.trim();
      if (query) {
        getCoordinates(query);
      }
    }
  });

  // GPS button click
  gpsButton.addEventListener('click', getUserLocation);

  // --- API AND DATA HANDLING ---

  /**
   * Fetches coordinates for a given city name using the Geocoding API.
   * @param {string} city - The name of the city to search for.
   */
  function getCoordinates(city) {
    const url = ${GEOCODING_API}?name=${encodeURIComponent(city)}&count=1&language=en&format=json;

    fetch(url)
      .then(response => response.json())
      .then(data => {
        if (data.results && data.results.length > 0) {
          const { latitude, longitude, name, admin1, country } = data.results[0];
          const locationName = ${name}, ${admin1 || country};
          getWeather(latitude, longitude, locationName);
        } else {
          alert('City not found. Please try another one.');
        }
      })
      .catch(error => {
        console.error('Error fetching coordinates:', error);
        alert('Failed to fetch location data.');
      });
  }

  /**
   * Gets the user's current position using the browser's Geolocation API.
   */
  function getUserLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        const { latitude, longitude } = position.coords;
        // Use coordinates to find a location name, then get weather
        const url = ${GEOCODING_API}?latitude=${latitude}&longitude=${longitude}&count=1&language=en&format=json;
        fetch(url)
          .then(res => res.json())
          .then(data => {
             if (data.results && data.results.length > 0) {
                const { name, admin1, country } = data.results[0];
                const locationName = ${name}, ${admin1 || country};
                getWeather(latitude, longitude, locationName);
             } else {
                getWeather(latitude, longitude, "Your Location");
             }
          })

      }, error => {
        console.error('Geolocation error:', error);
        alert('Unable to retrieve your location. Please enable location services or use the search bar.');
      });
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  }

  /**
   * Fetches weather data from the Open-Meteo Forecast API.
   * @param {number} lat - Latitude of the location.
   * @param {number} lon - Longitude of the location.
   * @param {string} name - The display name of the location.
   */
  function getWeather(lat, lon, name) {
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m',
      hourly: 'temperature_2m,weather_code',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min',
      timezone: 'auto'
    });

    const url = ${FORECAST_API}?${params.toString()};

    fetch(url)
      .then(response => response.json())
      .then(data => {
        updateUI(data, name);
      })
      .catch(error => {
        console.error('Error fetching weather data:', error);
        alert('Failed to fetch weather data.');
      });
  }

  // --- UI UPDATES ---

  /**
   * Updates the entire user interface with new weather data.
   * @param {object} data - The weather data from the API.
   * @param {string} name - The display name of the location.
   */
  function updateUI(data, name) {
    updateCurrentWeather(data, name);
    updateHourlyForecast(data);
    updateDailyForecast(data);
  }

  /**
   * Updates the "Current Weather" card.
   */
  function updateCurrentWeather(data, name) {
    const { current, daily } = data;
    const now = new Date();

    locationEl.textContent = name;
    metaEl.textContent = ${now.toLocaleDateString(undefined, { weekday: 'long' })}, ${now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })};
    updatedEl.textContent = Updated now;

    nowTempEl.textContent = ${Math.round(current.temperature_2m)}°;
    nowDescEl.textContent = getWeatherDescription(current.weather_code).description;
    nowFeelsEl.textContent = ${Math.round(current.apparent_temperature)}°;
    nowHumEl.textContent = ${current.relative_humidity_2m}%;
    nowWindEl.textContent = ${Math.round(current.wind_speed_10m)} km/h;
    nowPopEl.textContent = ${current.precipitation} mm;
  }

  /**
   * Updates the "Next 24 hours" card.
   */
  function updateHourlyForecast(data) {
    hourlyContainer.innerHTML = '';
    const { hourly } = data;
    const now = new Date();
    const currentHour = now.getHours();

    // Display forecast for the next 24 hours starting from the current hour
    for (let i = currentHour; i < currentHour + 24; i++) {
      const time = new Date(hourly.time[i]);
      const hourString = time.getHours() === new Date().getHours() ? 'Now' : time.toLocaleTimeString(undefined, { hour: 'numeric', hour12: true });

      const hourDiv = document.createElement('div');
      hourDiv.className = 'hour';
      hourDiv.innerHTML = `
        <div>${hourString}</div>
        <div class="wicon">${getWeatherDescription(hourly.weather_code[i]).icon}</div>
        <div>${Math.round(hourly.temperature_2m[i])}°</div>
      `;
      hourlyContainer.appendChild(hourDiv);
    }
  }

  /**
   * Updates the "7-day forecast" card.
   */
  function updateDailyForecast(data) {
    dailyContainer.innerHTML = '';
    const { daily } = data;

    for (let i = 0; i < 7; i++) {
      const date = new Date(daily.time[i]);
      const dayName = i === 0 ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'short' });

      const dayDiv = document.createElement('div');
      dayDiv.className = 'day';
      dayDiv.innerHTML = `
        <div>${dayName}</div>
        <div class="wicon">${getWeatherDescription(daily.weather_code[i]).icon}</div>
        <div><strong>${Math.round(daily.temperature_2m_max[i])}°</strong> / ${Math.round(daily.temperature_2m_min[i])}°</div>
      `;
      dailyContainer.appendChild(dayDiv);
    }
  }

  /**
   * Maps WMO weather codes to descriptions and icons.
   * @param {number} code - The WMO weather code.
   * @returns {{description: string, icon: string}}
   */
  function getWeatherDescription(code) {
    const descriptions = {
      0: { description: 'Clear sky', icon: '☀' },
      1: { description: 'Mainly clear', icon: '🌤' },
      2: { description: 'Partly cloudy', icon: '🌥' },
      3: { description: 'Overcast', icon: '☁' },
      45: { description: 'Fog', icon: '🌫' },
      48: { description: 'Depositing rime fog', icon: '🌫' },
      51: { description: 'Light drizzle', icon: '💧' },
      53: { description: 'Moderate drizzle', icon: '💧' },
      55: { description: 'Dense drizzle', icon: '💧' },
      61: { description: 'Slight rain', icon: '🌧' },
      63: { description: 'Moderate rain', icon: '🌧' },
      65: { description: 'Heavy rain', icon: '🌧' },
      80: { description: 'Slight rain showers', icon: '🌦' },
      81: { description: 'Moderate rain showers', icon: '🌦' },
      82: { description: 'Violent rain showers', icon: '🌦' },
      95: { description: 'Thunderstorm', icon: '⛈' },
      96: { description: 'Thunderstorm with hail', icon: '⛈' },
      99: { description: 'Thunderstorm with heavy hail', icon: '⛈' },
    };
    return descriptions[code] || { description: 'Unknown', icon: '🤷' };
  }

  // Initial load with a default city
  getCoordinates('Hyderabad');
});
