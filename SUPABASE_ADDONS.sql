
-- SQL per le tabelle della Bilancia Smart

-- Tabella registro bilance (mappa ID fisico a Utente)
CREATE TABLE IF NOT EXISTS scales_registry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "scaleId" TEXT UNIQUE NOT NULL, -- es: Simo1
    "userId" UUID REFERENCES auth.users(id),
    "apiaryId" TEXT, -- opzionale, se collegata a un apiario in app
    name TEXT, -- Nome amichevole (es: Bilancia Poggio)
    "secretKey" TEXT NOT NULL DEFAULT 'beewise_2024',
    apn TEXT DEFAULT 'internet.it',
    schedule JSONB DEFAULT '{"rules": [{"months": [1,2,3,4,5,6,7,8,9,10,11,12], "days": [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31], "times": ["08:00", "20:00"]}]}',
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella letture (inviate dalla Lilygo via SIM)
CREATE TABLE IF NOT EXISTS scale_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "apiaryId" TEXT, 
    "scaleId" TEXT, -- Riferimento al scale_id nel registro
    weight FLOAT NOT NULL,
    battery INTEGER NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella comandi (inviati dall'app alla Lilygo)
CREATE TABLE IF NOT EXISTS scale_commands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "apiaryId" TEXT,
    "scaleId" TEXT,
    command TEXT NOT NULL, -- 'get_weight', 'reboot', ecc.
    status TEXT DEFAULT 'pending', -- 'pending', 'received', 'completed'
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "completedAt" TIMESTAMPTZ
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_scale_data_scale ON scale_data("scaleId");
CREATE INDEX IF NOT EXISTS idx_scale_commands_scale ON scale_commands("scaleId", status);
CREATE INDEX IF NOT EXISTS idx_scales_registry_user ON scales_registry("userId");

-- Abilitazione RLS per scales_registry
ALTER TABLE scales_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own scales" ON scales_registry 
    FOR ALL USING (auth.uid() = "userId");

-- Realtime settings
ALTER PUBLICATION supabase_realtime ADD TABLE scale_data;
ALTER PUBLICATION supabase_realtime ADD TABLE scale_commands;
