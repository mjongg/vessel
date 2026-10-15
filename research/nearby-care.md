# Nearby care

Added 29 September 2026.

Home shortcut and Nearby navigation open an accessible care finder. Users can request browser location or manually search a city/district/landmark and select a match. Categories: hospitals, clinics/doctors, pharmacies. Search radii: 2, 5 or 10 km. Named directory results are sorted by straight-line distance, capped at the nearest 60 listings across categories, and include available address, phone, listed hours, source, tap-to-call and Google Maps directions. Missing phone numbers are explicit. No stock, availability, emergency capability or opening-now claims are inferred.

The app sends only a manually submitted place query to Photon, or coordinates/radius to Overpass, via an authenticated POST route. It sends no profile identifiers, prescription contents or medical record data. Location/search results are held in the component's memory and not written into the health record or browser persistence. Provider operational logs are outside Vessel's control. Browser location is requested only after the user presses Use my location. Denial/timeouts permit manual search. Map links share their search/destination with Google Maps.

Providers: Photon public demo geocoder and OpenStreetMap Overpass. These are prototype services with no uptime or data-completeness guarantee. Replace with a contracted or self-hosted directory/geocoder before broad rollout; evaluate Philippines address and contact coverage. No public Nominatim endpoint is used. External failures surface an actionable message and an independent Google Maps search link. Phone values are supplied by the directory, not fabricated or independently verified.

Sources:
- https://github.com/komoot/photon (reasonable-use public demo, no availability guarantees)
- https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL
- https://developers.google.com/maps/documentation/urls/get-started
- https://www.openstreetmap.org/copyright

Checks: typechecking, production build, distance/phone normalization and sorting tests, live manual public-landmark search. Device geolocation is not invoked during agent testing; no personal location is transmitted.

Publication: Sites synchronization was blocked by automatic approval review because uploading the private source to the project's external repository requires explicit user approval. Local preview remains available.

Live-test limitation: Photon returned matching locations for Quezon Memorial Circle. Overpass facility requests timed out/unavailable during testing, including a second public instance. The UI correctly displayed the failure and Google Maps fallback. Real facility/phone response rendering is covered with fixtures, but a successful live facility list has not been verified. Treat the in-app directory as best-effort until a reliable provider is configured and verified.
