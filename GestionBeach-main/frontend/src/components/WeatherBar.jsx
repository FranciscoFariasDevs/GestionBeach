// src/components/WeatherBar.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Divider,
  IconButton,
  Skeleton,
  Grid,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  WbSunny,
  WbCloudy,
  AcUnit,
  Opacity,
  Air,
  AccessTime,
  KeyboardArrowDown,
  KeyboardArrowUp,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const WeatherBarContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 1000,
  backgroundColor: 'rgba(255, 255, 255, 0.85)',
  backdropFilter: 'blur(10px)',
  padding: theme.spacing(0.5),
  boxShadow: '0 1px 5px rgba(0, 0, 0, 0.1)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  overflow: 'hidden',
  transition: 'height 0.3s ease',
}));

const WeatherBarContent = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: 1000,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  margin: '0 auto',
  padding: '0 8px',
}));

const CityWeather = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  minWidth: 80,
  textAlign: 'center',
}));

const CityWeatherHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  cursor: 'pointer',
  padding: theme.spacing(0.25, 0),
  position: 'relative',
}));

const ExpandButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  bottom: -12,
  left: '50%',
  transform: 'translateX(-50%)',
  backgroundColor: 'white',
  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  width: 20,
  height: 20,
  '&:hover': {
    backgroundColor: '#f5f5f5',
  },
}));

const CityWeatherExpanded = styled(Box)(({ theme, open }) => ({
  width: '100%',
  padding: theme.spacing(0.5),
  backgroundColor: 'rgba(255, 255, 255, 0.5)',
  borderRadius: theme.spacing(0.5),
  marginTop: theme.spacing(0.5),
  transition: 'all 0.3s ease',
  maxHeight: open ? '180px' : '0',
  overflow: 'hidden',
  opacity: open ? 1 : 0,
}));

const WeatherTemp = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  fontSize: '1rem',
}));

const CityName = styled(Typography)(({ theme }) => ({
  fontSize: '0.8rem',
  fontWeight: 'bold',
  color: theme.palette.text.primary,
}));

const HourlyForecast = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: theme.spacing(0.5),
  padding: theme.spacing(0.5, 0),
}));

const HourlyItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
}));

const WeatherDetail = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  fontSize: '0.75rem',
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(0.25),
}));

const getWeatherIcon = (iconCode, size = 'small') => {
  if (!iconCode) return <WbCloudy fontSize={size} />;
  const iconMap = {
    '01': <WbSunny fontSize={size} />, '02': <WbCloudy fontSize={size} />, '03': <WbCloudy fontSize={size} />, '04': <WbCloudy fontSize={size} />, '09': <Opacity fontSize={size} />, '10': <Opacity fontSize={size} />, '11': <Air fontSize={size} />, '13': <AcUnit fontSize={size} />, '50': <WbCloudy fontSize={size} />
  };
  return iconMap[iconCode.substring(0, 2)] || <WbCloudy fontSize={size} />;
};

const formatHour = (timestamp) => new Date(timestamp * 1000).getHours() + ':00';

const WeatherBar = () => {
  const theme = useTheme();
  const [expandedCity, setExpandedCity] = useState(null);
  const [citiesWeather, setCitiesWeather] = useState({ tome: {}, coelemu: {}, chillan: {} });
  const [weatherBarLoading, setWeatherBarLoading] = useState(true);

  const cities = {
    tome: { lat: -36.6150, lon: -72.9590, name: 'Tomé' },
    coelemu: { lat: -36.4874, lon: -72.7021, name: 'Coelemu' },
    chillan: { lat: -36.6066, lon: -72.1030, name: 'Chillán' }
  };

  const toggleCityExpand = (key) => setExpandedCity(expandedCity === key ? null : key);

  const fetchCityWeatherAndForecast = async (city, lat, lon) => {
    const apiKey = '9de243494c0b295cca9337e1e96b00e2';
    const current = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=es&appid=${apiKey}`).then(r => r.json());
    const hourly = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=es&appid=${apiKey}`).then(r => r.json());
    return { current, hourly: hourly.list.slice(0, 3) };
  };

  const fetchAllCitiesWeather = async () => {
    setWeatherBarLoading(true);
    const results = await Promise.all(Object.entries(cities).map(([key, { lat, lon }]) => fetchCityWeatherAndForecast(key, lat, lon)));
    setCitiesWeather({ tome: results[0], coelemu: results[1], chillan: results[2] });
    setWeatherBarLoading(false);
  };

  useEffect(() => {
    fetchAllCitiesWeather();
    const interval = setInterval(fetchAllCitiesWeather, 1800000);
    return () => clearInterval(interval);
  }, []);

  const renderHourlyForecast = (cityKey) => {
    const data = citiesWeather[cityKey]?.hourly || [];
    return data.length === 0 ? <Typography variant="caption" align="center">Pronóstico no disponible</Typography> : (
      <HourlyForecast>
        {data.map((h, i) => (
          <HourlyItem key={i}>
            <Typography variant="caption">{formatHour(h.dt)}</Typography>
            <Box sx={{ color: '#0078BE', fontSize: '0.9rem', my: 0.25 }}>{getWeatherIcon(h.weather[0].icon)}</Box>
            <Typography variant="caption" fontWeight="bold">{Math.round(h.main.temp)}°C</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', fontSize: '0.6rem', mt: 0.25 }}>
              <Opacity fontSize="inherit" sx={{ mr: 0.25 }} />
              <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>{h.pop ? `${Math.round(h.pop * 100)}%` : '0%'}</Typography>
            </Box>
          </HourlyItem>
        ))}
      </HourlyForecast>
    );
  };

  const renderCityWeather = (cityKey) => {
    const data = citiesWeather[cityKey]?.current;
    const info = cities[cityKey];
    const isExpanded = expandedCity === cityKey;
    if (weatherBarLoading || !data) {
      return <CityWeather key={cityKey}><Skeleton variant="text" width={40} /></CityWeather>;
    }
    return (
      <CityWeather key={cityKey}>
        <CityWeatherHeader onClick={() => toggleCityExpand(cityKey)}>
          <Box sx={{ color: '#0078BE', fontSize: '1.2rem', mr: 0.5 }}>{getWeatherIcon(data.weather[0].icon)}</Box>
          <Box>
            <CityName>{info.name}</CityName>
            <WeatherTemp>{Math.round(data.main.temp)}°C</WeatherTemp>
          </Box>
          <ExpandButton size="small">
            {isExpanded ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
          </ExpandButton>
        </CityWeatherHeader>
        <CityWeatherExpanded open={isExpanded}>
          <WeatherDetail>
            <Typography variant="caption" sx={{ fontStyle: 'italic', fontSize: '0.7rem' }}>
              {data.weather[0].description.charAt(0).toUpperCase() + data.weather[0].description.slice(1)}
            </Typography>
          </WeatherDetail>
          <Grid container spacing={0.5} sx={{ mt: 0.25 }}>
            <Grid item xs={4}><WeatherDetail><Opacity fontSize="inherit" sx={{ mr: 0.25 }} /><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{data.main.humidity}%</Typography></WeatherDetail></Grid>
            <Grid item xs={4}><WeatherDetail><Air fontSize="inherit" sx={{ mr: 0.25 }} /><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{Math.round(data.wind.speed * 3.6)} km/h</Typography></WeatherDetail></Grid>
            <Grid item xs={4}><WeatherDetail><WbSunny fontSize="inherit" sx={{ mr: 0.25 }} /><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{Math.round(data.main.feels_like)}°C</Typography></WeatherDetail></Grid>
          </Grid>
          <Divider sx={{ my: 0.5 }} />
          <Typography variant="caption" fontWeight="medium" sx={{ display: 'flex', alignItems: 'center', fontSize: '0.7rem' }}><AccessTime fontSize="inherit" sx={{ mr: 0.25 }} />Próximas horas</Typography>
          {renderHourlyForecast(cityKey)}
        </CityWeatherExpanded>
      </CityWeather>
    );
  };

  return (
    <Box position="relative">
      <WeatherBarContainer>
        <WeatherBarContent>
          {Object.keys(cities).map(renderCityWeather)}
        </WeatherBarContent>
      </WeatherBarContainer>
    </Box>
  );
};

export default WeatherBar;
