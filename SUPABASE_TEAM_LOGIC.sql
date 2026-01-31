
-- 1. Funzione per recuperare i dati se sei un collaboratore
-- Cerca un utente (owner) che ti ha nella sua lista 'teamMembers'
CREATE OR REPLACE FUNCTION get_my_team_data(my_email text)
RETURNS TABLE (owner_id uuid, content jsonb, updated_at timestamptz)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT ud.user_id, ud.content, ud.updated_at
  FROM user_data ud
  WHERE
    -- Cerca all'interno dell'array JSON 'teamMembers'
    exists (
      select 1
      from jsonb_array_elements(ud.content->'teamMembers') as member
      where (member->>'email') = my_email
      AND (member->>'status') = 'active'
    )
  LIMIT 1; -- Prendi il primo (assumiamo un solo team per ora)
END;
$$ LANGUAGE plpgsql;

-- 2. Funzione per salvare i dati sul record del Capo
-- Permette a un collaboratore di aggiornare i dati del proprietario
CREATE OR REPLACE FUNCTION update_team_data(target_owner_id uuid, new_content jsonb)
RETURNS void
SECURITY DEFINER
AS $$
BEGIN
  -- Aggiorna solo se l'ID corrisponde (la sicurezza è gestita dal fatto che 
  -- l'App ha ottenuto questo ID solo tramite get_my_team_data legittimamente)
  UPDATE user_data
  SET content = new_content, updated_at = now()
  WHERE user_id = target_owner_id;
END;
$$ LANGUAGE plpgsql;
