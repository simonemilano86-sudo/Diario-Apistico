import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration from supabase service (duplicated for backend use)
const SUPABASE_URL = 'https://uqvovgxdfleosaodpyyb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdm92Z3hkZmxlb3Nhb2RweXliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyOTAyMzcsImV4cCI6MjA3OTg2NjIzN30.g6RNcnpTM8_yuJqbbKYawalVxckvCtySRF6oVTqNLNs';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Logger per debug
  app.use((req, res, next) => {
    console.log(`>>> [DEBUG] ${req.method} ${req.path}`);
    next();
  });

  // --- API ROUTES ---

  app.get('/api/scale/update', (req, res) => {
    res.json({ message: "Endpoint active", method: "GET" });
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Scale data update (from Arduino)
  app.post('/api/scale/update', async (req, res) => {
    console.log('>>> [SCALE API] Richiesta ricevuta:', req.body);
    const { weight, battery, api_key, scale_id } = req.body;

    if ((!api_key && !scale_id) || weight === undefined) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    try {
      let targetApiaryId = '';
      let targetScaleId = scale_id || '';
      
      // 1. Resolve identity
      // Legacy support: api_key = "ID:SECRET"
      if (api_key && api_key.includes(':')) {
        const [id, secret] = api_key.split(':');
        if (secret === 'beewise_2024') {
            targetApiaryId = id;
            targetScaleId = id;
        } else {
            return res.status(401).json({ error: 'Legacy unauthorized' });
        }
      } else if (scale_id && api_key) {
        // Modern Way: lookup in scales_registry
        const { data: registry, error: regError } = await supabase
          .from('scales_registry')
          .select('apiary_id, secret_key')
          .eq('scale_id', scale_id)
          .maybeSingle();
        
        if (regError || !registry) {
            return res.status(404).json({ error: 'Scale not registered' });
        }

        if (registry.secret_key !== api_key) {
            return res.status(401).json({ error: 'Invalid secret key' });
        }
        
        targetApiaryId = registry.apiary_id || 'unlinked';
        targetScaleId = scale_id;
      } else {
         return res.status(400).json({ error: 'Incomplete authentication' });
      }

      // 2. Insert reading
      const { error } = await supabase
        .from('scale_data')
        .insert([{
          apiaryId: targetApiaryId,
          scaleId: targetScaleId,
          weight: Number(weight),
          battery: Number(battery || 0),
          timestamp: new Date().toISOString()
        }]);

      if (error) throw error;

      // 3. Check for pending commands
      const { data: commands } = await supabase
        .from('scale_commands')
        .select('*')
        .or(`apiaryId.eq.${targetApiaryId},scaleId.eq.${targetScaleId}`)
        .eq('status', 'pending')
        .limit(1);

      const nextCommand = commands?.[0]?.command || 'none';
      
      // If we got a command, mark it as 'received'
      if (commands?.[0]) {
        await supabase
          .from('scale_commands')
          .update({ status: 'received' })
          .eq('id', commands[0].id);
      }

      res.json({ success: true, command: nextCommand });
    } catch (err: any) {
      console.error('Scale update error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- VITE MIDDLEWARE ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
