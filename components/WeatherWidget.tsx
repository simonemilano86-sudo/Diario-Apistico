
import React, { useState, useEffect } from 'react';
import { WeatherData } from '../types';
import { SunIcon, CloudIcon, RainIcon, WindIcon, ThermometerIcon, MapPinIcon } from './Icons';

interface WeatherWidgetProps {
    latitude: number;
    longitude: number;
    locationName: string;
    onWeatherUpdate?: (temp: number) => void;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ latitude, longitude, locationName, onWeatherUpdate }) => {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchWeather = async () => {
            setIsLoading(true);
            try {
                // Using Open-Meteo API (Free, no key required)
                const res = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`
                );
                const data = await res.json();
                
                if (data.current) {
                    const temp = data.current.temperature_2m;
                    setWeather({
                        temperature: temp,
                        humidity: data.current.relative_humidity_2m,
                        weatherCode: data.current.weather_code,
                        windSpeed: data.current.wind_speed_10m
                    });
                    if (onWeatherUpdate) {
                        onWeatherUpdate(temp);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch weather", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchWeather();
    }, [latitude, longitude, onWeatherUpdate]);

    const getWeatherIcon = (code: number) => {
        if (code <= 1) return <SunIcon className="w-10 h-10 text-amber-100" />;
        if (code <= 48) return <CloudIcon className="w-10 h-10 text-slate-100" />;
        return <RainIcon className="w-10 h-10 text-blue-200" />;
    };

    const getWeatherDescription = (code: number) => {
        if (code === 0) return 'Sereno';
        if (code <= 3) return 'Parz. nuvoloso';
        if (code <= 48) return 'Nebbia';
        if (code <= 67) return 'Pioggia';
        if (code <= 77) return 'Neve';
        if (code <= 82) return 'Rovesci';
        if (code <= 99) return 'Temporale';
        return 'Sconosciuto';
    };

    // Funzione per pulire il nome della località (rimuove CAP, Nazione e Sigla Provincia)
    const getCleanLocationName = (name: string) => {
        if (!name) return '';
        let clean = name;
        
        // Rimuove ", Italia" o ", Italy" alla fine (case insensitive)
        clean = clean.replace(/,\s*Italia$/i, '').replace(/,\s*Italy$/i, '');
        
        // Rimuove CAP (5 cifre) ovunque si trovi
        clean = clean.replace(/\b\d{5}\b/g, '');

        // Rimuove sigla provincia tra parentesi es. (RM)
        clean = clean.replace(/\s*\([A-Z]{2}\)/g, '');

        // Rimuove sigla provincia di 2 lettere (es. RM, MI) se isolata o a fine stringa
        // Deve essere preceduta da spazio o virgola e seguita da fine stringa o virgola
        clean = clean.replace(/(^|[\s,])[A-Z]{2}(?=$|,)/g, '');
        
        // Rimuove doppi spazi e pulisce virgole residue
        clean = clean.replace(/\s+/g, ' ').replace(/,\s*,/g, ',').trim();
        
        // Rimuove virgole iniziali o finali
        clean = clean.replace(/^,\s*/, '').replace(/,\s*$/, '');
        
        return clean;
    };

    const displayLocation = getCleanLocationName(locationName);

    return (
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-md p-4 text-white relative overflow-hidden flex flex-col justify-center min-h-[90px]">
            {/* Background Pattern - subtle */}
            <div className="absolute top-0 right-0 -mt-2 -mr-2 opacity-5 pointer-events-none">
                <SunIcon className="w-32 h-32" />
            </div>

            <div className="relative z-10 flex flex-col gap-1">
                <div className="flex justify-between items-center mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <MapPinIcon className="w-4 h-4 flex-shrink-0" />
                        <h2 className="text-sm font-bold truncate max-w-[180px] leading-tight" title={locationName}>
                            {displayLocation}
                        </h2>
                    </div>
                    {weather && <p className="text-[10px] font-bold uppercase text-amber-50 bg-white/10 px-2 py-0.5 rounded">{getWeatherDescription(weather.weatherCode)}</p>}
                </div>

                {isLoading || !weather ? (
                    <div className="flex justify-center py-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {getWeatherIcon(weather.weatherCode)}
                            <div className="text-3xl font-black tracking-tighter">
                                {Math.round(weather.temperature)}°
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-0.5 text-[10px] font-bold text-amber-50 bg-black/5 p-1.5 rounded-md border border-white/10">
                            <div className="flex items-center gap-1.5">
                                <WindIcon className="w-3 h-3" />
                                <span>{weather.windSpeed} km/h</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <ThermometerIcon className="w-3 h-3" />
                                <span>Umidità {weather.humidity}%</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WeatherWidget;
