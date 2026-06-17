const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const loader = document.getElementById('loader');
const errorMsg = document.getElementById('error-msg');
const weatherContent = document.getElementById('weather-content');

// Elements to update
const cityNameEl = document.getElementById('city-name');
const currentDateEl = document.getElementById('current-date');
const currentIconEl = document.getElementById('current-icon');
const currentTempEl = document.getElementById('current-temp');
const currentConditionEl = document.getElementById('current-condition');
const humidityEl = document.getElementById('humidity');
const windSpeedEl = document.getElementById('wind-speed');
const feelsLikeEl = document.getElementById('feels-like');
const forecastGrid = document.getElementById('forecast-grid');

// WMO Weather interpretation codes
const weatherCodes = {
    0: { condition: 'Clear sky', icon: '☀️' },
    1: { condition: 'Mainly clear', icon: '🌤️' },
    2: { condition: 'Partly cloudy', icon: '⛅' },
    3: { condition: 'Overcast', icon: '☁️' },
    45: { condition: 'Fog', icon: '🌫️' },
    48: { condition: 'Depositing rime fog', icon: '🌫️' },
    51: { condition: 'Light drizzle', icon: '🌧️' },
    53: { condition: 'Moderate drizzle', icon: '🌧️' },
    55: { condition: 'Dense drizzle', icon: '🌧️' },
    56: { condition: 'Light freezing drizzle', icon: '🌧️' },
    57: { condition: 'Dense freezing drizzle', icon: '🌧️' },
    61: { condition: 'Slight rain', icon: '🌦️' },
    63: { condition: 'Moderate rain', icon: '🌧️' },
    65: { condition: 'Heavy rain', icon: '🌧️' },
    66: { condition: 'Light freezing rain', icon: '🌧️' },
    67: { condition: 'Heavy freezing rain', icon: '🌧️' },
    71: { condition: 'Slight snow fall', icon: '🌨️' },
    73: { condition: 'Moderate snow fall', icon: '❄️' },
    75: { condition: 'Heavy snow fall', icon: '❄️' },
    77: { condition: 'Snow grains', icon: '❄️' },
    80: { condition: 'Slight rain showers', icon: '🌦️' },
    81: { condition: 'Moderate rain showers', icon: '🌧️' },
    82: { condition: 'Violent rain showers', icon: '⛈️' },
    85: { condition: 'Slight snow showers', icon: '🌨️' },
    86: { condition: 'Heavy snow showers', icon: '❄️' },
    95: { condition: 'Thunderstorm', icon: '⛈️' },
    96: { condition: 'Thunderstorm with slight hail', icon: '⛈️' },
    99: { condition: 'Thunderstorm with heavy hail', icon: '⛈️' },
};

function getWeatherInfo(code) {
    return weatherCodes[code] || { condition: 'Unknown', icon: '❓' };
}

function formatDate(dateString) {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

function getDayName(dateString) {
    const options = { weekday: 'short' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

async function fetchWeather(city) {
    // Show loader, hide content/error
    loader.classList.remove('hidden');
    weatherContent.classList.add('hidden');
    errorMsg.classList.add('hidden');

    try {
        // Step 1: Geocoding
        // Add a 2-second delay so the beautiful loader is visible
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
        const geoData = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error('City not found');
        }

        const location = geoData.results[0];
        const { latitude, longitude, name, country } = location;

        // Step 2: Fetch Weather
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`);
        const weatherData = await weatherRes.json();

        updateUI(name, country, weatherData);

    } catch (err) {
        console.error(err);
        errorMsg.classList.remove('hidden');
    } finally {
        loader.classList.add('hidden');
    }
}

function updateUI(city, country, data) {
    const current = data.current;
    const daily = data.daily;
    const weatherInfo = getWeatherInfo(current.weather_code);

    // Update Current Weather
    cityNameEl.textContent = `${city}, ${country}`;
    currentDateEl.textContent = formatDate(current.time);
    currentTempEl.textContent = Math.round(current.temperature_2m);
    currentConditionEl.textContent = weatherInfo.condition;
    currentIconEl.textContent = weatherInfo.icon;
    
    humidityEl.textContent = current.relative_humidity_2m;
    windSpeedEl.textContent = Math.round(current.wind_speed_10m);
    feelsLikeEl.textContent = Math.round(current.apparent_temperature);

    // Background is now handled by MagicRings WebGL shader

    // Update Forecast (skip today, show next 5 days)
    forecastGrid.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const date = daily.time[i];
        const maxTemp = Math.round(daily.temperature_2m_max[i]);
        const minTemp = Math.round(daily.temperature_2m_min[i]);
        const info = getWeatherInfo(daily.weather_code[i]);

        const forecastItem = document.createElement('div');
        forecastItem.className = 'forecast-item';
        forecastItem.innerHTML = `
            <span class="forecast-day">${getDayName(date)}</span>
            <span class="forecast-icon">${info.icon}</span>
            <span class="forecast-temp">${maxTemp}°<span style="font-size:0.9rem; color:var(--text-secondary)"> ${minTemp}°</span></span>
        `;
        forecastGrid.appendChild(forecastItem);
    }

    // Show content
    weatherContent.classList.remove('hidden');
}

// Event Listeners
searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) fetchWeather(city);
});

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = cityInput.value.trim();
        if (city) fetchWeather(city);
    }
});

// Load default city on startup
document.addEventListener('DOMContentLoaded', () => {
    fetchWeather('New York');
});
