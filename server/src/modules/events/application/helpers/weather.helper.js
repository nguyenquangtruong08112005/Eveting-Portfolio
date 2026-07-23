const moment = require('moment');
const axios = require('axios');
const config = require('@/shared/config/env.config');
const eventRepository = require('@/providers/database/event.repository');
const { BadRequestError, NotFoundError } = require('@/shared/errors');

const OPENWEATHER_API_KEY = config.openweatherApiKey;

const getEventWeather = async (eventId) => {
    if (!OPENWEATHER_API_KEY) {
        return null;
    }

    const { exists, data: eventData } = await eventRepository.getEventRawById(eventId);
    if (!exists) {
        throw new NotFoundError('Event not found');
    }

    if (eventData.eventType === 'online') {
        return null;
    }

    if (!eventData.location || !eventData.location.latitude) {
        throw new BadRequestError('Event location is missing');
    }

    const eventDate = moment(eventData.date);
    const now = moment();
    const daysDiff = eventDate.diff(now, 'days');

    if (daysDiff < 0) {
        return { description: "Sự kiện đã kết thúc" };
    }

    if (daysDiff > 5) {
        return { description: "Dự báo chỉ khả dụng trước sự kiện 5 ngày" };
    }

    try {
        const lat = eventData.location.latitude;
        const lon = eventData.location.longitude;
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=vi`;

        const response = await axios.get(url);
        const forecasts = response.data.list;

        if (!forecasts || forecasts.length === 0) {
             return null;
        }

        const targetTime = eventData.date / 1000;

        const bestForecast = forecasts.reduce((prev, curr) => {
            return (Math.abs(curr.dt - targetTime) < Math.abs(prev.dt - targetTime) ? curr : prev);
        });

        return {
            temperature: Math.round(bestForecast.main.temp),
            condition: bestForecast.weather[0].main.toLowerCase(),
            description: bestForecast.weather[0].description,
            iconUrl: `http://openweathermap.org/img/wn/${bestForecast.weather[0].icon}@2x.png`,
            humidity: bestForecast.main.humidity,
            windSpeed: bestForecast.wind.speed
        };
    } catch (error) {
        console.error("[WeatherDebug] ❌ API Call Failed:", error.response?.data || error.message);
        if (error.response) {
            console.error("[WeatherDebug] HTTP Status:", error.response.status);
        }
        return null;
    }
};

module.exports = {
    getEventWeather
};
