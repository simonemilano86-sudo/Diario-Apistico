
import React, { useState, useEffect, useRef } from 'react';
import { Apiary } from '../types';
import Modal from './Modal';
import { logger } from '../services/logger';
import { MapPinIcon, CheckCircleIcon, WarningIcon } from './Icons';

interface ApiaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (apiary: Omit<Apiary, 'id' | 'hives'>) => void;
    apiaryToEdit: Apiary | null;
}

declare global {
    interface Window {
        google: any;
        gm_authFailure: () => void;
    }
}

const ApiaryModal: React.FC<ApiaryModalProps> = ({ isOpen, onClose, onSave, apiaryToEdit }) => {
    const [apiary, setApiary] = useState<{ name: string; location: string; latitude?: number; longitude?: number }>({ 
        name: '', 
        location: '',
        latitude: undefined,
        longitude: undefined
    });
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<any>(null);
    const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [coordsFound, setCoordsFound] = useState(false);
    
    // Stato per il modale di errore personalizzato
    const [showErrorModal, setShowErrorModal] = useState(false);

    // Gestione caricamento script Google Maps
    useEffect(() => {
        if (!isOpen) return;

        const checkAndLoadGoogle = () => {
            if (window.google && window.google.maps && window.google.maps.places) {
                setIsGoogleLoaded(true);
                return;
            }

            window.gm_authFailure = () => {
                const errorMsg = "Errore Autenticazione Google Maps: verifica che la chiave API sia corretta e che il Billing sia attivo nella Cloud Console.";
                logger.log(errorMsg, "error");
                setAuthError("Errore Google Maps: verifica configurazione.");
            };

            const existingScript = document.getElementById('google-maps-script');
            if (!existingScript) {
                const script = document.createElement('script');
                script.id = 'google-maps-script';
                script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.API_KEY}&libraries=places&language=it`;
                script.async = true;
                script.defer = true;
                script.onload = () => {
                    console.log("Google Maps Places library loaded.");
                    setIsGoogleLoaded(true);
                };
                script.onerror = () => {
                    setAuthError("Impossibile caricare Google Maps. Controlla la connessione.");
                };
                document.head.appendChild(script);
            } else {
                setIsGoogleLoaded(!!(window.google && window.google.maps && window.google.maps.places));
            }
        };

        checkAndLoadGoogle();
    }, [isOpen]);

    // Inizializzazione Autocomplete
    useEffect(() => {
        let autocompleteInstance: any = null;

        if (isGoogleLoaded && inputRef.current && isOpen) {
            try {
                autocompleteInstance = new window.google.maps.places.Autocomplete(inputRef.current, {
                    types: ['geocode', 'establishment'],
                    fields: ['formatted_address', 'geometry', 'name']
                });

                autocompleteInstance.addListener('place_changed', () => {
                    const place = autocompleteInstance.getPlace();
                    
                    if (!place.geometry) {
                        logger.log("Google Maps: Nessuna geometria restituita per il luogo selezionato.", "warn");
                        setApiary(prev => ({ 
                            ...prev, 
                            location: place.name || prev.location,
                            latitude: undefined,
                            longitude: undefined
                        }));
                        setCoordsFound(false);
                        return;
                    }

                    if (place.formatted_address || place.name) {
                        const selectedLocation = place.formatted_address || place.name;
                        const lat = place.geometry.location.lat();
                        const lng = place.geometry.location.lng();
                        
                        logger.log(`Luogo selezionato: ${selectedLocation} (${lat}, ${lng})`);

                        setApiary(prev => ({ 
                            ...prev, 
                            location: selectedLocation,
                            latitude: lat,
                            longitude: lng
                        }));
                        setCoordsFound(true);
                    }
                });

                autocompleteRef.current = autocompleteInstance;
            } catch (err) {
                console.error("Errore inizializzazione Autocomplete:", err);
            }
        }

        return () => {
            if (window.google && window.google.maps && window.google.maps.event && autocompleteInstance) {
                window.google.maps.event.clearInstanceListeners(autocompleteInstance);
            }
        };
    }, [isGoogleLoaded, isOpen]);

    useEffect(() => {
        if (apiaryToEdit) {
            setApiary({ 
                name: apiaryToEdit.name, 
                location: apiaryToEdit.location,
                latitude: apiaryToEdit.latitude,
                longitude: apiaryToEdit.longitude
            });
            setCoordsFound(!!(apiaryToEdit.latitude && apiaryToEdit.longitude));
        } else {
            setApiary({ 
                name: '', 
                location: '',
                latitude: undefined,
                longitude: undefined
            });
            setCoordsFound(false);
        }
        setShowErrorModal(false);
    }, [apiaryToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        
        if (name === 'location') {
            setApiary(prev => ({ 
                ...prev, 
                [name]: value,
                latitude: undefined,
                longitude: undefined
            }));
            setCoordsFound(false);
        } else {
            setApiary(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (apiary.name.trim() === '') {
            // Semplice check browser per campo vuoto (o HTML required lo gestisce già)
            return;
        }
        
        // Check validazione coordinate
        if (!apiary.latitude || !apiary.longitude) {
            // Invece di alert, mostriamo il modale personalizzato
            setShowErrorModal(true);
            return;
        }
        
        onSave(apiary);
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={apiaryToEdit ? 'Modifica Apiario' : 'Aggiungi Nuovo Apiario'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {authError && (
                        <div className="p-2 bg-red-100 border border-red-200 text-red-700 text-xs rounded-md">
                            {authError}
                        </div>
                    )}
                    
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Nome Apiario <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={apiary.name}
                            onChange={handleChange}
                            required
                            placeholder="Es: Apiario del Bosco"
                            className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md focus:ring-amber-500 focus:border-amber-500"
                        />
                    </div>
                    
                    <div>
                        <label htmlFor="location" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Posizione (Google Search) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <MapPinIcon className={`h-5 w-5 ${coordsFound ? 'text-green-500' : 'text-slate-400'}`} />
                            </div>
                            <input
                                ref={inputRef}
                                type="text"
                                id="location"
                                name="location"
                                value={apiary.location}
                                onChange={handleChange}
                                required
                                placeholder={isGoogleLoaded ? "Cerca e seleziona un luogo..." : "Caricamento mappe..."}
                                className={`mt-1 block w-full pl-10 pr-3 py-2 shadow-sm sm:text-sm border rounded-md dark:bg-slate-700 dark:text-white focus:ring-amber-500 focus:border-amber-500 ${coordsFound ? 'border-green-500 dark:border-green-500' : 'border-slate-300 dark:border-slate-600'}`}
                            />
                            {coordsFound && (
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                </div>
                            )}
                            {!isGoogleLoaded && !authError && isOpen && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-1.5 flex justify-between items-start">
                            <p className="text-[10px] text-slate-400 italic">
                                Seleziona una voce dal menu a tendina.
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition">Annulla</button>
                        <button type="submit" className="px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition font-bold shadow-md">Salva Apiario</button>
                    </div>
                </form>
            </Modal>

            {/* Modale Errore Personalizzato (stile Logout) */}
            <Modal isOpen={showErrorModal} onClose={() => setShowErrorModal(false)} title="Attenzione">
                <div className="space-y-4 text-center">
                    <WarningIcon className="w-12 h-12 text-amber-500 mx-auto" />
                    <p className="text-lg font-medium text-slate-800 dark:text-slate-200">
                        Posizione non valida
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Devi selezionare una posizione valida dal menu a tendina di Google Maps per poter registrare l'apiario.
                    </p>
                    <div className="pt-2 flex justify-center">
                        <button 
                            onClick={() => setShowErrorModal(false)} 
                            className="px-6 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                        >
                            Ho capito
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default ApiaryModal;
