
import React, { useState, useEffect } from 'react';
import { LocationData, WeatherData } from '../types';
import { SunIcon, CloudIcon, RainIcon, WindIcon, ThermometerIcon, MapPinIcon, SearchIcon, EditIcon } from './Icons';

interface WeatherWidgetProps {
    savedLocation: LocationData | null;
    onSaveLocation: (location: LocationData) => void;
    onWeatherUpdate?: (temp: number) => void;
}

// Definiamo la costante fuori dal componente per avere un riferimento stabile
const DEFAULT_LOCATION: LocationData = { name: 'Roma', latitude: 41.8967, longitude: 12.4822 };

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ savedLocation, onSaveLocation, onWeatherUpdate }) => {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<LocationData[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);

    const displayLocation = savedLocation || DEFAULT_LOCATION;

    useEffect(() => {
        const fetchWeather = async () => {
            setIsLoading(true);
            try {
                // Using Open-Meteo API (Free, no key required)
                const res = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${displayLocation.latitude}&longitude=${displayLocation.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`
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
        // Usiamo le coordinate primitive come dipendenze per evitare loop infiniti
    }, [displayLocation.latitude, displayLocation.longitude, onWeatherUpdate]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setSearchLoading(true);
        try {
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5&language=it&format=json`);
            const data = await res.json();
            if (data.results) {
                setSearchResults(data.results.map((r: any) => ({
                    name: `${r.name} (${r.country_code})`,
                    latitude: r.latitude,
                    longitude: r.longitude
                })));
            } else {
                setSearchResults([]);
            }
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setSearchLoading(false);
        }
    };

    const getWeatherIcon = (code: number) => {
        if (code <= 1) return <SunIcon className="w-12 h-12 text-amber-100" />;
        if (code <= 48) return <CloudIcon className="w-12 h-12 text-slate-100" />;
        return <RainIcon className="w-12 h-12 text-blue-200" />;
    };

    const getWeatherDescription = (code: number) => {
        if (code === 0) return 'Sereno';
        if (code <= 3) return 'Parzialmente nuvoloso';
        if (code <= 48) return 'Nebbia';
        if (code <= 67) return 'Pioggia';
        if (code <= 77) return 'Neve';
        if (code <= 82) return 'Rovesci';
        if (code <= 99) return 'Temporale';
        return 'Sconosciuto';
    };

    if (isEditing) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 mb-6 animate-fade-in border border-amber-100 dark:border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">Seleziona Città</h3>
                    <button onClick={() => setIsEditing(false)} className="text-sm text-slate-500 hover:text-slate-700">Annulla</button>
                </div>
                <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cerca città..."
                        className="flex-1 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
                        autoFocus
                    />
                    <button type="submit" disabled={searchLoading} className="p-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition">
                        <SearchIcon className="w-5 h-5" />
                    </button>
                </form>

                {searchResults.length > 0 && (
                    <ul className="space-y-2">
                        {searchResults.map((result, idx) => (
                            <li key={idx}>
                                <button 
                                    onClick={() => {
                                        onSaveLocation(result);
                                        setIsEditing(false);
                                        setSearchResults([]);
                                        setSearchQuery('');
                                    }}
                                    className="w-full text-left p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md flex items-center gap-2 text-slate-700 dark:text-slate-200"
                                >
                                    <MapPinIcon className="w-4 h-4 text-amber-500" />
                                    {result.name}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                {searchLoading && <p className="text-center text-slate-500">Ricerca in corso...</p>}
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg p-6 mb-8 text-white relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-10">
                <SunIcon className="w-40 h-40" />
            </div>

            <div className="relative z-10">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 cursor-pointer hover:bg-white/10 p-1 rounded transition" onClick={() => setIsEditing(true)}>
                        <MapPinIcon className="w-5 h-5" />
                        <h2 className="text-xl font-bold">{displayLocation.name}</h2>
                        <EditIcon className="w-4 h-4 opacity-70" />
                    </div>
                    {weather && <div className="text-right">
                        <p className="font-medium text-amber-100">{getWeatherDescription(weather.weatherCode)}</p>
                    </div>}
                </div>

                {isLoading || !weather ? (
                    <div className="flex justify-center py-6">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                ) : (
                    <div className="flex items-center mt-4">
                        <div className="mr-6">
                            {getWeatherIcon(weather.weatherCode)}
                        </div>
                        <div>
                            <div className="text-5xl font-bold tracking-tighter">
                                {Math.round(weather.temperature)}°
                            </div>
                        </div>
                        <div className="ml-auto space-y-1 text-sm font-medium text-amber-50">
                            <div className="flex items-center gap-2">
                                <WindIcon className="w-4 h-4" />
                                <span>{weather.windSpeed} km/h</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <ThermometerIcon className="w-4 h-4" />
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