Role & Objective:
You are an expert full-stack developer working on our Travel Buddy web application. 
Currently, the "City Explorer" section has a bug where searching any city (e.g., Rishikesh, Varanasi, Paris, Tokyo, etc.) displays 4–5 hardcoded, static places instead of dynamic attractions for that specific city.

Your task is to completely eliminate all mock, static, and hardcoded places/cities from the code and implement dynamic, real-time fetching via an external places/geocoding API.

---

Core Requirements:

1. Remove Hardcoded / Mock Data:
   - Identify and purge all static place arrays, dummy JSON files, and fallback mock objects currently populating the "Important Places" / "Top Attractions" section.
   - Do NOT use hardcoded coordinates, predefined lists, or static place templates for ANY city (including Rishikesh, Varanasi, or any future searched city).

2. Real-Time API Integration:
   - When a user submits a city query via the search input:
     a. Geocoding Step: Resolve the input city name to geographic coordinates (latitude and longitude) using an API (e.g., OpenStreetMap Nominatim, Google Geocoding API, Mapbox, or Geoapify).
     b. Places Discovery Step: Query a live Places/Attractions API using those dynamic coordinates (e.g., Google Places API (Text Search/Nearby Search), Overpass/OpenStreetMap API, Geoapify Places API, Foursquare Places API, or OpenTripMap).
   - Fetch genuine points of interest, tourist attractions, monuments, or landmarks strictly belonging to the searched city.

3. Extracted Fields per Place:
   - Title / Name of the place
   - Category / Subtitle (e.g., Temple, Waterfall, Landmark, Museum)
   - Dynamic Image URL (from API photo references/Unsplash Places API or a clean contextual fallback if no image is returned)
   - Rating / User reviews count (if supported by the API)
   - Brief description or address snippet
   - Coordinates (lat, lng) to display markers on any associated interactive map

4. Architecture, State & UI Handling:
   - Search Query Normalization: Trim whitespace and handle case-insensitive city lookups.
   - Loading State: Show a clean skeleton loader or spinner in the "Important Places" grid while fetching data.
   - Error Handling:
     * If the city does not exist or API returns 0 results: Show a user-friendly message: "No places found for '[City Name]'. Please check the spelling or try another city."
     * If the API fails / hits rate limits: Display a graceful retry UI rather than falling back to fake predefined places.
   - Debounce & Rate Limiting: Prevent duplicate API calls on rapid keystrokes or repeated form submissions.
   - Cache / State Management: Cache recent city lookups in memory (or React query/session storage) during the session to avoid redundant API hits.

5. Deliverables:
   - Review our existing City Explorer component files.
   - Identify the exact lines of code where the mock array is stored and consumed.
   - Provide the complete, drop-in replacement code (Frontend component + API route/service function).
   - Specify any required environment variables (e.g., API keys) and brief setup instructions for the chosen API provider.
