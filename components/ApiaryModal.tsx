import React, { useState, useEffect, useRef } from 'react';
import { Apiary } from '../types';
import Modal from './Modal';
import { logger } from '../services/logger';
import { MapPinIcon, CheckCircleIcon, WarningIcon, MaximizeIcon, XIcon } from './Icons';

interface ApiaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiary: Omit<Apiary, 'id' | 'hives'>) => void;
  apiaryToEdit: Apiary | null;
  existingApiaries: Apiary[];
  isOnline?: boolean;
}

declare global {
  interface Window {
    google: any;
    gm_authFailure: () => void;
  }
}

type ApiaryDraft = {
  name: string;
  location: string;
  latitude?: number;
  longitude?: number;
};

const GOOGLE_SCRIPT_ID = 'google-maps-script';

const ApiaryModal: React.FC<ApiaryModalProps> = ({ isOpen, onClose, onSave, apiaryToEdit, existingApiaries, isOnline = true }) => {
  const [apiary, setApiary] = useState<ApiaryDraft>({
    name: '',
    location: '',
    latitude: undefined,
    longitude: undefined,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coordsFound, setCoordsFound] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [isMapFullScreen, setIsMapFullScreen] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);

  // Stato per il modale di errore personalizzato
  const [showErrorModal, setShowErrorModal] = useState(false);

  // Chiave Google Maps (Vite)
  const GOOGLE_API_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || (process.env as any).API_KEY as string | undefined;

  // Caricamento script Google Maps
  useEffect(() => {
    if (!isOpen) return;

    const checkAndLoadGoogle = () => {
      // già caricato
      if (window.google?.maps?.places) {
        setIsGoogleLoaded(true);
        return;
      }

      window.gm_authFailure = () => {
        const errorMsg =
          'Errore Autenticazione Google Maps: verifica che la chiave API sia corretta e che il Billing sia attivo nella Cloud Console.';
        logger.log(errorMsg, 'error');
        setAuthError('Errore Google Maps: verifica configurazione.');
      };

      if (!GOOGLE_API_KEY) {
        setAuthError('Chiave Google Maps mancante (VITE_GOOGLE_MAPS_API_KEY).');
        return;
      }

      const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = GOOGLE_SCRIPT_ID;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
          GOOGLE_API_KEY
        )}&libraries=places&language=it`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
          console.log('Google Maps Places library loaded.');
          setIsGoogleLoaded(!!window.google?.maps?.places);
        };

        script.onerror = () => {
          setAuthError('Impossibile caricare Google Maps. Controlla la connessione.');
        };

        document.head.appendChild(script);
      } else {
        // script esiste ma magari non è pronto
        setIsGoogleLoaded(!!window.google?.maps?.places);
      }
    };

    checkAndLoadGoogle();
  }, [isOpen, GOOGLE_API_KEY]);

  // Inizializzazione Autocomplete
  useEffect(() => {
    let autocompleteInstance: any = null;

    if (isGoogleLoaded && inputRef.current && isOpen) {
      try {
        autocompleteInstance = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ['geocode', 'establishment'],
          fields: ['formatted_address', 'geometry', 'name'],
        });

        autocompleteInstance.addListener('place_changed', () => {
          const place = autocompleteInstance.getPlace();

          if (!place?.geometry) {
            logger.log('Google Maps: Nessuna geometria restituita per il luogo selezionato.', 'warn');
            setApiary((prev) => ({
              ...prev,
              location: place?.name || prev.location,
              latitude: undefined,
              longitude: undefined,
            }));
            setCoordsFound(false);
            return;
          }

          const selectedLocation = place.formatted_address || place.name;
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();

          logger.log(`Luogo selezionato: ${selectedLocation} (${lat}, ${lng})`);

          setApiary((prev) => ({
            ...prev,
            location: selectedLocation,
            latitude: lat,
            longitude: lng,
          }));
          setCoordsFound(true);
        });

        autocompleteRef.current = autocompleteInstance;
      } catch (err) {
        console.error('Errore inizializzazione Autocomplete:', err);
      }
    }

    return () => {
      // cleanup listeners
      if (window.google?.maps?.event && autocompleteInstance) {
        window.google.maps.event.clearInstanceListeners(autocompleteInstance);
      }
      autocompleteRef.current = null;
    };
  }, [isGoogleLoaded, isOpen]);

  // Popola i dati se in edit
  useEffect(() => {
    if (!isOpen) return;

    if (apiaryToEdit) {
      setApiary({
        name: apiaryToEdit.name,
        location: apiaryToEdit.location,
        latitude: apiaryToEdit.latitude,
        longitude: apiaryToEdit.longitude,
      });
      setCoordsFound(!!(apiaryToEdit.latitude && apiaryToEdit.longitude));
    } else {
      setApiary({
        name: '',
        location: '',
        latitude: undefined,
        longitude: undefined,
      });
      setCoordsFound(false);
    }

    setAuthError(null);
    setShowErrorModal(false);
  }, [apiaryToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === 'location') {
      setApiary((prev) => ({
        ...prev,
        location: value,
        latitude: undefined,
        longitude: undefined,
      }));
      setCoordsFound(false);
    } else if (name === 'name') {
      setApiary((prev) => ({ ...prev, name: value }));
    }
  };

  useEffect(() => {
    if (showMap && isGoogleLoaded && mapRef.current) {
      const defaultCenter = apiary.latitude && apiary.longitude 
        ? { lat: apiary.latitude, lng: apiary.longitude }
        : { lat: 41.9028, lng: 12.4964 }; // Roma di default

      const map = new window.google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: apiary.latitude ? 18 : 5,
        mapTypeId: 'satellite',
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: false,
      });

      const marker = new window.google.maps.Marker({
        position: defaultCenter,
        map: map,
        draggable: true,
        animation: window.google.maps.Animation.DROP,
      });

      mapInstanceRef.current = map;
      markerInstanceRef.current = marker;

      const updatePosition = (latLng: any) => {
        const lat = latLng.lat();
        const lng = latLng.lng();
        
        setApiary(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng
        }));
        setCoordsFound(true);

        // Reverse Geocode
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
          if (status === 'OK' && results[0]) {
            setApiary(prev => ({
              ...prev,
              location: results[0].formatted_address
            }));
          }
        });
      };

      map.addListener('click', (e: any) => {
        marker.setPosition(e.latLng);
        updatePosition(e.latLng);
      });

      marker.addListener('dragend', () => {
        updatePosition(marker.getPosition());
      });
    }
  }, [showMap, isGoogleLoaded]);

  const toggleMap = () => {
    setShowMap(!showMap);
    if (!showMap) {
      logger.log("Apertura mappa per selezione manuale...");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (apiary.name.trim() === '') return;

    if (existingApiaries.some(a => a.name.toLowerCase() === apiary.name.trim().toLowerCase() && a.id !== apiaryToEdit?.id)) {
        setError("Esiste già un apiario con questo nome.");
        return;
    }

    // Consideriamo modalità manuale se siamo offline, se google non carica, o se semplicemente non abbiamo trovato coordinate
    const isManualMode = !isOnline || !isGoogleLoaded || !!authError || !coordsFound;

    // Salva (il "dove" viene deciso dal padre)
    onSave({
      name: apiary.name.trim(),
      location: apiary.location.trim(),
      latitude: apiary.latitude,
      longitude: apiary.longitude,
      pendingLocationSync: (apiary.latitude == null || apiary.longitude == null),
    } as any);

    // opzionale: chiudi dopo il salvataggio
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        fullScreen
        title={apiaryToEdit ? 'Modifica Apiario' : 'Aggiungi Nuovo Apiario'}
      >
        <style>{`
          .pac-container {
            z-index: 10001 !important;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            margin-top: 5px;
            font-family: inherit;
          }
          .pac-item {
            padding: 10px 14px;
            cursor: pointer;
            border-top: 1px solid #f1f5f9;
            display: flex;
            align-items: center;
          }
          .pac-item:first-child { border-top: none; }
          .pac-item:hover { background-color: #f8fafc; }
          .pac-icon { display: none; }
          .pac-item-query { font-size: 14px; color: #0f172a; padding-right: 5px; }
          .pac-matched { font-weight: 700; color: #f59e0b; }
        `}</style>
        <form onSubmit={handleSubmit} className="flex-grow flex flex-col space-y-4 p-4 overflow-y-auto pb-24">
          {(!isOnline || !!authError) && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg flex items-center gap-2">
              <WarningIcon className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-bold">{!isOnline ? 'Modalità Offline' : 'Google Maps non disponibile'}</p>
                <p>Inserisci un riferimento testuale (es. "Campo di fianco al ruscello"). Lo confermerai sulla mappa appena possibile.</p>
              </div>
            </div>
          )}
          {error && (
            <div className="p-2 bg-red-100 border border-red-200 text-red-700 text-xs rounded-md">
              {error}
            </div>
          )}
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
              {(isOnline && !authError) ? 'Posizione (Google Search)' : 'Posizione (Inserimento Manuale)'} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPinIcon className={`h-5 w-5 ${coordsFound ? 'text-green-500' : 'text-slate-400'}`} />
              </div>
              <input
                ref={(isOnline && !authError) ? inputRef : null}
                type="text"
                id="location"
                name="location"
                value={apiary.location}
                onChange={handleChange}
                required
                placeholder={(isOnline && !authError) ? (isGoogleLoaded ? 'Cerca e seleziona un luogo...' : 'Caricamento mappe...') : 'Inserisci località o riferimento...'}
                className={`mt-1 block w-full pl-10 pr-3 py-2 shadow-sm sm:text-sm border rounded-md dark:bg-slate-700 dark:text-white focus:ring-amber-500 focus:border-amber-500 ${
                  coordsFound
                    ? 'border-green-500 dark:border-green-500'
                    : 'border-slate-300 dark:border-slate-600'
                }`}
              />
              {coordsFound && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                </div>
              )}
              {isOnline && !isGoogleLoaded && !authError && isOpen && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <button 
                    type="button"
                    onClick={() => {
                        setAuthError('Utilizzo inserimento manuale (Google Maps non risponde).');
                    }}
                    className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                  >
                    Usa manuale
                  </button>
                </div>
              )}
            </div>

            {(isOnline && !authError) && (
              <div className="mt-1.5 flex justify-between items-start">
                <p className="text-[10px] text-slate-400 italic">Seleziona una voce dal menu a tendina.</p>
                <button 
                  type="button"
                  onClick={toggleMap}
                  className="text-xs text-amber-600 font-bold hover:underline flex items-center gap-1"
                >
                  <MapPinIcon className="w-3 h-3" />
                  {showMap ? 'Chiudi mappa' : 'Seleziona sulla mappa'}
                </button>
              </div>
            )}

            {showMap && (
              <div className={`mt-3 animate-fade-in flex flex-col ${isMapFullScreen ? 'fixed inset-0 z-[10002] bg-white dark:bg-slate-900 p-0 m-0' : 'relative'}`}>
                {isMapFullScreen && (
                  <div className="absolute top-0 left-0 right-0 p-4 z-10 bg-gradient-to-b from-black/50 to-transparent flex justify-between items-center">
                    <h3 className="text-white font-bold shadow-sm">Posiziona Apiario</h3>
                    <button 
                      type="button"
                      onClick={() => setIsMapFullScreen(false)}
                      className="bg-white/20 backdrop-blur-md text-white p-2 rounded-full hover:bg-white/40 transition"
                    >
                      <XIcon className="w-5 h-5" />
                    </button>
                  </div>
                )}
                <div 
                  ref={mapRef} 
                  className={`w-full ${isMapFullScreen ? 'h-screen' : 'h-64'} rounded-lg border border-slate-300 dark:border-slate-600 shadow-inner transition-all duration-300`}
                />
                {!isMapFullScreen && (
                  <div className="flex justify-between items-center mt-2 px-1">
                    <p className="text-[10px] text-slate-500 italic max-w-[70%]">
                      Trascina il segnaposto o clicca sulla mappa per indicare la posizione esatta.
                    </p>
                    <button 
                      type="button"
                      onClick={() => setIsMapFullScreen(true)}
                      className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded border border-slate-200 dark:border-slate-600 flex items-center gap-1"
                    >
                      <MaximizeIcon className="w-3 h-3" />
                      Espandi
                    </button>
                  </div>
                )}
                {isMapFullScreen && (
                  <div className="absolute bottom-10 left-0 right-0 px-6 flex justify-center z-10">
                    <button 
                      type="button"
                      onClick={() => setIsMapFullScreen(false)}
                      className="w-full max-w-xs bg-amber-500 text-white font-bold py-3 rounded-full shadow-2xl hover:bg-amber-600 transition flex items-center justify-center gap-2"
                    >
                      <CheckCircleIcon className="w-5 h-5" />
                      Conferma Posizione
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="h-10" /> {/* Spacer for fixed footer */}
        </form>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex gap-3 z-10">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition"
          >
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            className="flex-[2] px-4 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition shadow-lg shadow-amber-500/20"
          >
            Salva Apiario
          </button>
        </div>
      </Modal>

      {/* Modale Errore Personalizzato */}
      <Modal isOpen={showErrorModal} onClose={() => setShowErrorModal(false)} title="Attenzione">
        <div className="space-y-4 text-center">
          <WarningIcon className="w-12 h-12 text-amber-500 mx-auto" />
          <p className="text-lg font-medium text-slate-800 dark:text-slate-200">Posizione non valida</p>
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