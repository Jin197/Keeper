import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Supabase renamed the backend key in 2026 (sb_secret_… / SUPABASE_SECRET_KEY).
// Accept either name so revoking the legacy service_role JWT does not break this.
const supabaseKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function audit() {
  console.log('--- 🚀 DÉBUT DE L\'AUDIT E2E ---');
  let errors = 0;

  // 1. Vérification BDD
  console.log('\\n[1] Vérification de la BDD Supabase...');
  const tables = ['vehicles', 'profiles', 'maintenance_entries', 'fuel_entries', 'stations', 'telemetry_obd'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('id').limit(1);
    if (error) {
      console.log(`❌ Table '${t}' : ERREUR - ${error.message}`);
      errors++;
    } else {
      console.log(`✅ Table '${t}' : OK (${data.length} lignes trouvées)`);
    }
  }

  // 2. Test du Help Center (Chatbot)
  console.log('\\n[2] Test de l\'API Chatbot (/api/chat)...');
  try {
    const chatRes = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'Comment changer un pneu ?' }] })
    });
    if (!chatRes.ok) {
      console.log(`❌ API Chatbot a retourné une erreur : ${chatRes.status}`);
      errors++;
    } else {
      console.log(`✅ API Chatbot : OK`);
    }
  } catch (e: any) {
    console.log(`❌ API Chatbot injoignable (le serveur tourne ?) : ${e.message}`);
    errors++;
  }

  // 3. Test de l'ingestion Télémétrie
  console.log('\\n[3] Test de l\'Ingestion Télémétrie (/api/telemetry/ingest)...');
  try {
    const ingestRes = await fetch('http://localhost:3000/api/telemetry/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicle_id: '123e4567-e89b-12d3-a456-426614174000',
        rpm: 3000,
        engineLoad: 50,
        speed: 100,
        maf: 12,
        iat: 30,
        coolantTemp: 90,
        batteryVoltage: 14.2
      })
    });
    if (!ingestRes.ok) {
      const txt = await ingestRes.text();
      console.log(`❌ API Ingestion a retourné une erreur : ${ingestRes.status} - ${txt}`);
      errors++;
    } else {
      console.log(`✅ API Ingestion : OK`);
    }
  } catch (e: any) {
    console.log(`❌ API Ingestion injoignable : ${e.message}`);
    errors++;
  }

  console.log(`\\n--- 🏁 FIN DE L'AUDIT (${errors} erreurs) ---`);
  process.exit(errors > 0 ? 1 : 0);
}

audit();
