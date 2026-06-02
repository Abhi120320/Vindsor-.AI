import axios from "axios";
import { env } from "../../config/env";

export const getWeatherSnapshot = async (location: string) => {
  if (!env.WEATHER_API_KEY) {
    return { location, summary: "Weather API key missing", tempC: 28, humidity: 65 };
  }

  const response = await axios.get("https://api.openweathermap.org/data/2.5/weather", {
    params: {
      q: location,
      appid: env.WEATHER_API_KEY,
      units: "metric",
    },
  });

  return {
    location,
    summary: response.data.weather?.[0]?.main,
    tempC: response.data.main?.temp,
    humidity: response.data.main?.humidity,
  };
};
