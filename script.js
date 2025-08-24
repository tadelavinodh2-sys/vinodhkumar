async function getWeather(city) {
  try {
    // First get city coordinates using Open-Meteo's geocoding API
    let geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1`);
    let geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      console.log("City not found!");
      return;
    }

    let { latitude, longitude, name, country } = geoData.results[0];

    // Now fetch weather forecast for that location
    let weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
    );
    let weatherData = await weatherRes.json();

    // Current weather
    console.log(`📍 ${name}, ${country}`);
    console.log(`🌡 Temp: ${weatherData.current_weather.temperature}°C`);
    console.log(`💨 Wind: ${weatherData.current_weather.windspeed} km/h`);

    // Daily forecast
    console.log("📅 7-day forecast:");
    weatherData.daily.time.forEach((day, i) => {
      console.log(`${day}: ${weatherData.daily.temperature_2m_min[i]}°C - ${weatherData.daily.temperature_2m_max[i]}°C`);
    });

  } catch (err) {
    console.error("Error fetching weather:", err);
  }
}

// Example call
getWeather("Hyderabad");
