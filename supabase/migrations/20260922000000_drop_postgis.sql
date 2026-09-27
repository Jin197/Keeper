-- ============================================================
-- Velocewealth · remove PostGIS
--
-- PostGIS only served the Mapbox map, which was removed before launch:
-- `get_nearby_stations` and `stations.geog` have no caller, and nearby fuel
-- now comes from national open-data feeds (lib/fuel-prices), not from the DB.
--
-- Dropping it also removes `public.spatial_ref_sys`, an extension-owned table
-- the Supabase security advisor flags ("RLS disabled in public") and that we
-- cannot alter ourselves ("must be owner of table spatial_ref_sys").
-- ============================================================

drop function if exists public.get_nearby_stations(double precision, double precision, double precision);
drop index if exists public.stations_geog_idx;
alter table public.stations drop column if exists geog;

-- Deliberately without CASCADE. The column and the function above are the only
-- things in this schema that use PostGIS (checked across every migration), so a
-- plain drop succeeds. If it ever fails, something unexpected depends on the
-- extension and that should stop the migration — not be silently destroyed.
drop extension if exists postgis;
