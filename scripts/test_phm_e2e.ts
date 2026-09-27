import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { detectAnomaly, calculateWeibullRUL, classifyComponentState, evaluateVehicleHealth } from '../lib/phm/engine';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runE2ETest() {
  console.log('--- 🚀 DÉBUT DU TEST E2E PHM ---');

  // 1. Véhicule de test Mocké (bypass DB issues)
  const vehicle = {
    id: 'mock-uuid-123',
    make: 'Tesla',
    model: 'Model 3',
    current_mileage_km: 80000
  };
  console.log(`✅ Véhicule de test : ${vehicle.make} ${vehicle.model} (ID: ${vehicle.id})`);
  console.log(`Kilométrage actuel : ${vehicle.current_mileage_km} km`);

  // 2. Test Phase Introductive : Ingestion Télémétrie Anormale (Filtre obstrué)
  console.log('\n--- 🧪 TEST : DÉTECTION D\'ANOMALIE (COLD START) ---');
  const anomalyTelemetry = {
    rpm: 3500,
    engineLoad: 80,
    speed: 110,
    maf: 5, // Très bas pour 3500 RPM
    iat: 40,
    coolantTemp: 108, // Surchauffe
    batteryVoltage: 13.8
  };
  
  const anomalyResult = detectAnomaly(anomalyTelemetry);
  console.log('Payload OBD-II Injecté :', anomalyTelemetry);
  if (anomalyResult.flag) {
    console.log(`🚨 ANOMALIE DÉTECTÉE : ${anomalyResult.reason}`);
  } else {
    console.log('✅ Aucune anomalie détectée.');
  }

  // 3. Test Phase Mature : Analyse de Survie (Weibull) & Classification
  console.log('\n--- 🧪 TEST : ANALYSE DE SURVIE (RUL) & CLASSIFICATION ---');
  // On simule que le filtre a 25 000 km d'usure (espérance de vie 30 000)
  const filtreUsureKm = 25000;
  const filtreEspVieKm = 30000;
  
  const rulKm = calculateWeibullRUL(filtreUsureKm, filtreEspVieKm);
  console.log(`Pièce : Filtre à Air`);
  console.log(`Usure actuelle : ${filtreUsureKm} km / ${filtreEspVieKm} km attendus`);
  console.log(`RUL (Durée de vie restante estimée - Weibull) : ${rulKm} km`);

  const classification = classifyComponentState(rulKm, filtreEspVieKm, anomalyResult.flag);
  console.log(`État classifié : ${classification.status}`);

  // 4. Test Global : Évaluation complète du véhicule
  console.log('\n--- 🧪 TEST : SCORE DE SANTÉ GLOBAL DU VÉHICULE ---');
  const componentsData = [
    { name: 'Filtre à Air', lastChangedKm: Math.max(0, vehicle.current_mileage_km - filtreUsureKm), expectedLifetimeKm: filtreEspVieKm },
    { name: 'Plaquettes Avant', lastChangedKm: Math.max(0, vehicle.current_mileage_km - 10000), expectedLifetimeKm: 40000 },
    { name: 'Huile Moteur', lastChangedKm: Math.max(0, vehicle.current_mileage_km - 5000), expectedLifetimeKm: 15000 }
  ];

  const overallEvaluation = evaluateVehicleHealth(vehicle.current_mileage_km, anomalyTelemetry, componentsData);
  console.log(`Score de Santé Global : ${overallEvaluation.overallScore} / 100\n`);
  
  overallEvaluation.components.forEach(comp => {
    console.log(`- ${comp.name} : ${comp.status} (RUL: ${comp.rulKm} km) ${comp.anomalyFlag ? '🚨 ANOMALIE' : ''}`);
  });

  console.log('\n--- ✅ FIN DU TEST E2E PHM ---');
}

runE2ETest();
