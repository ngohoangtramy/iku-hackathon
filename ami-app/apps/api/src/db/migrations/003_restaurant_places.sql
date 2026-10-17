ALTER TABLE nearby_places
  DROP CONSTRAINT IF EXISTS nearby_places_place_type_check;

ALTER TABLE nearby_places
  ADD CONSTRAINT nearby_places_place_type_check
  CHECK (place_type IN ('cafe', 'restaurant', 'pharmacy', 'station', 'library', 'hospital', 'police_station', 'shop'));
