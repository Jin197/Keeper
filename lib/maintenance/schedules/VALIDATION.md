# Manufacturer schedules — validation checklist

Each entry in `models.ts` starts as `verified: false`. To flip it to `true`:

1. Open the manufacturer's **owner handbook / service book** for that generation
   and market (Ford UK "Scheduled Maintenance", PSA "Carnet d'entretien",
   VW "Service schedule", Toyota "Owner's Manual — Maintenance").
2. Check, per engine variant we list:
   - engine oil interval (km / months) — note whether it is "fixed" or "flexible/LongLife";
   - air + cabin filter;
   - **timing belt / wet belt / chain** — and any *revised* interval the maker
     issued later (Ford EcoBoost wet belt, PSA PureTech: 6 y / 100k km in 2022);
   - brake fluid;
   - gearbox oil for automatics (DSG, EAT, CVT, PowerShift);
   - coolant.
3. Put the exact document reference in `source` (title, year, page), set
   `verified: true`, and run `npm test` — `tests/unit/schedules.test.ts` checks
   the entry is well-formed.
4. Weak points: keep only issues with a public trace (manufacturer bulletin,
   recall, court case, mass press coverage). Set `severity: 'safety'` only when
   the failure can immobilise the car or affect braking/steering.

Priority list after the first ten (by used-market volume UK + FR):
Ford Focus Mk4 · Vauxhall Astra J/K · VW Golf Mk6 · Peugeot 2008 / 3008 II ·
Renault Captur I / Mégane IV · Citroën C3 III · Dacia Sandero II / Duster ·
Toyota Corolla / Auris hybrid · Honda Civic / Jazz · Kia Ceed / Sportage ·
Hyundai i20 / i30 · Skoda Octavia III / Fabia III · Seat Leon III / Ibiza ·
BMW 1 Series F20 / 3 Series F30 · Audi A3 8V · Mercedes A-Class W176 · Fiat 500 ·
Mini F56 · Mazda 3.
