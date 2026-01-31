
// Esportiamo il client esistente per compatibilità con i servizi
// evitando l'uso di import.meta.env che causava il blocco dell'app
export { supabase } from '../services/supabase';
