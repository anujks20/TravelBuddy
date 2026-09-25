const fs = require('fs');

const file = 'c:/Users/ASUS/Downloads/TravelBuddy/planner.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove API keys
content = content.replace(/const GROQ_API_KEY = ".*?";/, '// API Keys moved to backend');
content = content.replace(/const PEXELS_API_KEY = ".*?";/, '');

// 2. Replace callGroq with our backend call
const newCallGroq = `
    async function callGroq(prompt, retries = 3) {
        // Now calling backend instead of Groq directly
        throw new Error("Local callGroq should not be used. Generate via backend.");
    }
`;
content = content.replace(/async function callGroq\([\s\S]*?throw new Error\("Max retries reached due to rate limiting\."\);\s*\}/, newCallGroq);

// 3. Replace the btnGen generation logic to use backend
const oldGenLogicRegex = /try \{\s*const days = getDaysDiff[\s\S]*?tripQualityScore = validateItineraryQuality\(currentItinerary\);\s*renderDashboard\(\);\s*\}/;

const newGenLogic = `
        try {
            // New Backend Generation Logic
            const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3000' : '';
            const response = await fetch(\`\${baseUrl}/api/generate-trip\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tripData)
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || "Failed to generate trip");
            }
            
            const data = await response.json();
            currentItinerary = data.itinerary;
            
            // Update URL with tripId
            const newUrl = new URL(window.location);
            newUrl.searchParams.set('tripId', data.tripId);
            window.history.pushState({}, '', newUrl);

            tripQualityScore = validateItineraryQuality(currentItinerary);
            renderDashboard();
        }
`;

content = content.replace(oldGenLogicRegex, newGenLogic);

// 4. Update Pexels fetch
const newPexelsFetch = `
    async function fetchPexelsImage(query) {
        if (pexelsCache.has(query)) return pexelsCache.get(query);
        try {
            const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3000' : '';
            const response = await fetch(\`\${baseUrl}/api/pexels?query=\${encodeURIComponent(query)}\`);
            if (response.ok) {
                const data = await response.json();
                if (data.url) {
                    pexelsCache.set(query, data.url);
                    return data.url;
                }
            }
        } catch (e) { console.error('Pexels error:', e); }
        return 'planner-bg.jpg';
    }
`;
content = content.replace(/async function fetchPexelsImage[\s\S]*?return 'planner-bg\.jpg';\s*\}/, newPexelsFetch);

// 5. Add load trip on start logic
const loadTripLogic = `
    // Check URL for tripId on load
    const urlParams = new URLSearchParams(window.location.search);
    const tripId = urlParams.get('tripId');
    if (tripId) {
        wizardView.classList.add('hidden');
        loadingOverlay.classList.remove('hidden');
        loaderStatus.textContent = 'Loading your itinerary...';
        
        const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3000' : '';
        fetch(\`\${baseUrl}/api/trips/\${tripId}\`)
            .then(res => {
                if (!res.ok) throw new Error('Trip not found');
                return res.json();
            })
            .then(data => {
                Object.assign(tripData, data.metadata);
                currentItinerary = data.itinerary;
                
                loadingOverlay.classList.add('hidden');
                dashboardView.classList.remove('hidden');
                tripQualityScore = validateItineraryQuality(currentItinerary);
                renderDashboard();
            })
            .catch(err => {
                console.error(err);
                alert('Failed to load trip.');
                loadingOverlay.classList.add('hidden');
                wizardView.classList.remove('hidden');
            });
    }
`;

// Insert the loadTripLogic at the end of DOMContentLoaded
content = content.replace(/\}\);\s*$/, loadTripLogic + '\n});');


fs.writeFileSync(file, content, 'utf8');
console.log("planner.js updated successfully.");
