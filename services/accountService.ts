import { supabase } from './supabase';
import { logger } from './logger';

export interface VerifyPasswordResult {
  success: boolean;
  error?: string;
}

export interface DeleteAccountResult {
  success: boolean;
  error?: string;
  emailSent?: boolean;
}

/**
 * Verifica la correttezza della password attuale dell'utente ri-autenticandosi.
 */
export async function verifyUserPassword(email: string, password: string): Promise<VerifyPasswordResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials') || error.message.includes('invalid_grant')) {
        return { success: false, error: 'Password errata. Verifica e riprova.' };
      }
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'Impossibile verificare le credenziali.' };
    }

    return { success: true };
  } catch (err: any) {
    logger.log(`Errore verifica password: ${err.message}`, 'error');
    return { success: false, error: err.message || 'Errore durante la verifica della password' };
  }
}

/**
 * Invia l'email di conferma eliminazione account tramite l'Edge Function e Resend.
 */
export async function sendDeletionEmail(email: string, name: string): Promise<boolean> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const { data, error } = await supabase.functions.invoke('send-account-deletion', {
      body: {
        email: email.trim(),
        name: name || 'Apicoltore',
      },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (error) {
      logger.log(`Nota: Errore Edge Function send-account-deletion: ${error.message}`, 'warn');
      return false;
    }

    logger.log(`Email di conferma eliminazione inviata a ${email}`, 'info');
    return true;
  } catch (err: any) {
    logger.log(`Eccezione invio email cancellazione: ${err.message}`, 'warn');
    return false;
  }
}

/**
 * Esegue la funzione RPC delete_user_account su Supabase.
 */
export async function executeDeleteUserAccountRpc(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('delete_user_account');

    if (error) {
      logger.log(`Errore chiamata RPC delete_user_account: ${error.message}`, 'error');
      
      // Se la funzione SQL non è stata ancora creata su Supabase
      if (error.message?.includes('could not find function') || error.message?.includes('not found') || error.code === '42883') {
        return {
          success: false,
          error: 'La procedura SQL delete_user_account() non è stata ancora creata nel database Supabase. Esegui lo script SUPABASE_DELETE_ACCOUNT_RPC.sql nell\'SQL Editor di Supabase.'
        };
      }

      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    logger.log(`Eccezione delete_user_account: ${err.message}`, 'error');
    return { success: false, error: err.message || 'Errore durante l\'eliminazione dell\'account' };
  }
}

/**
 * Procedura completa di eliminazione account:
 * 1. Verifica password
 * 2. Invio email Resend
 * 3. Chiamata SQL RPC
 * 4. Pulizia dati locali e sign out
 */
export async function deleteFullAccount(
  email: string,
  password: string,
  name: string
): Promise<DeleteAccountResult> {
  // 1. Verifica password
  const verifyRes = await verifyUserPassword(email, password);
  if (!verifyRes.success) {
    return { success: false, error: verifyRes.error };
  }

  // 2. Invio email di notifica Resend PRIMA che la sessione venga revocata
  let emailSent = false;
  try {
    emailSent = await sendDeletionEmail(email, name);
  } catch (e) {
    console.warn("Impossibile inviare email cancellazione:", e);
  }

  // 3. Esecuzione RPC di cancellazione su Supabase
  const rpcRes = await executeDeleteUserAccountRpc();
  if (!rpcRes.success) {
    return { success: false, error: rpcRes.error, emailSent };
  }

  // 4. Pulizia storage locale e logout
  try {
    await supabase.auth.signOut();
  } catch (e) {
    // ignora errore se sessione già eliminata
  }
  clearAppStorage();

  return { success: true, emailSent };
}

/**
 * Modifica la password dell'utente loggato.
 */
export async function changeUserPassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Errore durante l\'aggiornamento della password' };
  }
}

/**
 * Pulisce tutte le chiavi salvate in localStorage associate all'utente.
 */
export function clearAppStorage() {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('beewise') || key.startsWith('sb-') || key.includes('supabase'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    console.warn('Errore pulizia localStorage:', e);
  }
}
