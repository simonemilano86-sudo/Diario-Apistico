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
    
    let readings: any[] = [];
    let commonScaleId = '';
    let commonApiKey = '';

    if (Array.isArray(req.body)) {
      readings = req.body;
    } else if (req.body && Array.isArray(req.body.readings)) {
      readings = req.body.readings;
      commonScaleId = req.body.scale_id || req.body.scaleId;
      commonApiKey = req.body.api_key || req.body.apiKey;
    } else if (req.body) {
      readings = [req.body];
    }

    if (readings.length === 0) {
      return res.status(400).json({ error: 'No readings provided' });
    }

    try {
      const firstReading = readings[0] || {};
      const scale_id = firstReading.scale_id || firstReading.scaleId || commonScaleId;
      const api_key = firstReading.api_key || firstReading.apiKey || commonApiKey;

      if (!api_key && !scale_id) {
        return res.status(400).json({ error: 'Missing parameters scale_id or api_key' });
      }

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

      // Map readings to DB rows
      const rowsToInsert = readings.map((r, index) => {
        let readingTime = r.timestamp || r.time || r.createdAt;
        if (!readingTime) {
          // Spacer: if multiple readings are sent at once without timestamps, space them back in time so they do not overlap exactly
          const d = new Date();
          d.setSeconds(d.getSeconds() - index);
          readingTime = d.toISOString();
        } else {
          readingTime = new Date(readingTime).toISOString();
        }

        return {
          apiaryId: r.apiaryId || r.apiary_id || targetApiaryId,
          scaleId: targetScaleId,
          weight: Number(r.weight),
          battery: Number(r.battery || r.batteryLevel || 100),
          timestamp: readingTime
        };
      }).filter(row => !isNaN(row.weight));

      if (rowsToInsert.length === 0) {
        return res.status(400).json({ error: 'No valid weighings inside payload' });
      }

      // 2. Insert readings
      const { error } = await supabase
        .from('scale_data')
        .insert(rowsToInsert);

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

      res.json({ success: true, count: rowsToInsert.length, command: nextCommand });
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
