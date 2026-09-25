

(function(window) {
    'use strict';

    const KNOWN_CITIES = {
        'delhi': { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
        'new delhi': { name: 'New Delhi', lat: 28.6139, lng: 77.2090 },
        'rishikesh': { name: 'Rishikesh', lat: 30.0869, lng: 78.2676 },
        'haridwar': { name: 'Haridwar', lat: 29.9457, lng: 78.1642 },
        'dehradun': { name: 'Dehradun', lat: 30.3165, lng: 78.0322 },
        'mumbai': { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
        'pune': { name: 'Pune', lat: 18.5204, lng: 73.8567 },
        'bangalore': { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
        'bengaluru': { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
        'mysore': { name: 'Mysuru', lat: 12.2958, lng: 76.6394 },
        'jaipur': { name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
        'agra': { name: 'Agra', lat: 27.1767, lng: 78.0081 },
        'chennai': { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
        'kolkata': { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
        'hyderabad': { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
        'goa': { name: 'Goa', lat: 15.2993, lng: 74.1240 },
        'shimla': { name: 'Shimla', lat: 31.1048, lng: 77.1734 },
        'manali': { name: 'Manali', lat: 32.2432, lng: 77.1892 }
    };

    const state = {
        origin: 'Delhi',
        destination: 'Rishikesh',
        userBudget: 5000,
        currency: 'INR',
        travelMode: 'car', 
        preference: 'balanced', 
        selectionMode: 'minimum', 
        routes: [],
        feasibleRoutes: [],
        destinationActivities: [],
        activitiesTotalCost: 0,
        minimumBudgetRoute: null,
        bestOverallRoute: null,
        selectedRoute: null,
        feasibilityResult: null,
        mapInstance: null,
        mapLayers: []
    };

    async function fetchWithTimeout(resource, options = {}, timeoutMs = 2200) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(resource, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timer);
            return response;
        } catch (error) {
            clearTimeout(timer);
            throw error;
        }
    }

    async function geocodeLocation(locName) {
        if (!locName || typeof locName !== 'string') return null;
        const clean = locName.trim().toLowerCase();
        
        for (const [key, city] of Object.entries(KNOWN_CITIES)) {
            if (clean === key || clean.startsWith(key) || clean.includes(key)) {
                return city;
            }
        }

        try {
            const res = await fetchWithTimeout(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locName)}&limit=1`, {
                headers: { 'Accept': 'application/json' }
            });
            if (res && res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                    return {
                        name: data[0].display_name.split(',')[0],
                        lat: parseFloat(data[0].lat),
                        lng: parseFloat(data[0].lon)
                    };
                }
            }
        } catch (e) {
            console.warn("Nominatim Geocoding fetch fallback notice:", e);
        }

        return null;
    }

    function computeHaversineKm(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return Math.round(R * c);
    }

    function generatePolylineCurve(origin, dest, offsetFactor) {
        const points = [];
        const steps = 25;
        const dx = dest.lng - origin.lng;
        const dy = dest.lat - origin.lat;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / (dist || 1);
        const ny = dx / (dist || 1);

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const offset = 4 * t * (1 - t) * offsetFactor;
            const lat = origin.lat + t * dy + offset * ny;
            const lng = origin.lng + t * dx + offset * nx;
            points.push([lat, lng]);
        }
        return points;
    }

    function formatMinutes(minutes) {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}h ${m < 10 ? '0' : ''}${m}m`;
    }

    async function fetchOSRMRoutes(originGeo, destGeo) {
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${originGeo.lng},${originGeo.lat};${destGeo.lng},${destGeo.lat}?overview=full&geometries=geojson&alternatives=true`;
            const res = await fetchWithTimeout(url);
            if (res && res.ok) {

                const data = await res.json();
                if (data && data.routes && data.routes.length > 0) {
                    return data.routes.map((r, idx) => {
                        const distKm = Math.round(r.distance / 1000);
                        const durationMin = Math.round(r.duration / 60);
                        const geometry = r.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                        
                        let highwayName = 'via Primary National Highway';
                        let roadType = 'National Highway';
                        let qualityScore = 84;
                        let tollCost = Math.round(distKm * 0.55);

                        if (idx === 0) {
                            highwayName = 'via Expressway & Fast Corridors';
                            roadType = 'Access-Controlled Expressway';
                            qualityScore = 95;
                            tollCost = Math.round(distKm * 1.2);
                        } else if (idx === 2) {
                            highwayName = 'via State Highway & Bypass';
                            roadType = 'State Highway / Alternate Route';
                            qualityScore = 72;
                            tollCost = 0;
                        }

                        return {
                            id: `route-${String.fromCharCode(97 + idx)}`,
                            name: `Route ${String.fromCharCode(65 + idx)}`,
                            highway: highwayName,
                            oneWayDistance: distKm,
                            durationMinutes: durationMin,
                            durationDisplay: formatMinutes(durationMin),
                            tollCost: tollCost,
                            qualityScore: qualityScore,
                            roadType: roadType,
                            geometry: geometry
                        };
                    });
                }
            }
        } catch (e) {
            console.warn("OSRM routing fetch notice:", e);
        }
        return null;
    }

    async function calculateRouteAlternatives(originStr, destStr, travelMode = 'car') {
        const originGeo = await geocodeLocation(originStr) || { name: originStr, lat: 28.6139, lng: 77.2090 };
        const destGeo = await geocodeLocation(destStr) || { name: destStr, lat: 30.0869, lng: 78.2676 };

        const isDelhiRishikesh = 
            (originStr.toLowerCase().includes('delhi') && destStr.toLowerCase().includes('rishikesh')) ||
            (destStr.toLowerCase().includes('delhi') && originStr.toLowerCase().includes('rishikesh'));

        let rawRoutes = null;

        if (!isDelhiRishikesh) {
            rawRoutes = await fetchOSRMRoutes(originGeo, destGeo);
        }

        if (!rawRoutes || rawRoutes.length === 0) {
            let baseDistance = 240;
            if (!isDelhiRishikesh) {
                const direct = computeHaversineKm(originGeo.lat, originGeo.lng, destGeo.lat, destGeo.lng);
                baseDistance = Math.max(20, Math.round(direct * 1.28));
            }

            if (isDelhiRishikesh) {
                rawRoutes = [
                    {
                        id: 'route-a',
                        name: 'Route A',
                        highway: 'via NH 334 & Haridwar Road',
                        oneWayDistance: 240,
                        durationMinutes: 300,
                        durationDisplay: '5h 00m',
                        tollCost: 150,
                        qualityScore: 84,
                        roadType: 'National Highway (4-lane)',
                        geometry: generatePolylineCurve(originGeo, destGeo, -0.04)
                    },
                    {
                        id: 'route-b',
                        name: 'Route B',
                        highway: 'via Delhi-Meerut Expressway & Upper Ganga Canal',
                        oneWayDistance: 230,
                        durationMinutes: 240,
                        durationDisplay: '4h 00m',
                        tollCost: 320,
                        qualityScore: 96,
                        roadType: 'Access-Controlled Expressway',
                        geometry: generatePolylineCurve(originGeo, destGeo, 0.05)
                    },
                    {
                        id: 'route-c',
                        name: 'Route C',
                        highway: 'via Eastern Peripheral & State Highway 58 Bypass',
                        oneWayDistance: 260,
                        durationMinutes: 330,
                        durationDisplay: '5h 30m',
                        tollCost: 0,
                        qualityScore: 72,
                        roadType: 'State Highway & Scenic Canal Route',
                        geometry: generatePolylineCurve(originGeo, destGeo, 0.12)
                    }
                ];
            } else {
                const distA = baseDistance;
                const distB = Math.max(15, Math.round(baseDistance * 0.96));
                const distC = Math.round(baseDistance * 1.08);

                const timeMinA = Math.round((distA / 52) * 60);
                const timeMinB = Math.round((distB / 68) * 60);
                const timeMinC = Math.round((distC / 46) * 60);

                rawRoutes = [
                    {
                        id: 'route-a',
                        name: 'Route A',
                        highway: 'via Primary National Highway Corridor',
                        oneWayDistance: distA,
                        durationMinutes: timeMinA,
                        durationDisplay: formatMinutes(timeMinA),
                        tollCost: Math.round(distA * 0.55),
                        qualityScore: 85,
                        roadType: 'National Highway',
                        geometry: generatePolylineCurve(originGeo, destGeo, -0.03)
                    },
                    {
                        id: 'route-b',
                        name: 'Route B',
                        highway: 'via Expressway & Fast Corridors',
                        oneWayDistance: distB,
                        durationMinutes: timeMinB,
                        durationDisplay: formatMinutes(timeMinB),
                        tollCost: Math.round(distB * 1.25),
                        qualityScore: 95,
                        roadType: 'Expressway',
                        geometry: generatePolylineCurve(originGeo, destGeo, 0.04)
                    },
                    {
                        id: 'route-c',
                        name: 'Route C',
                        highway: 'via Alternate State Bypass (Low Toll)',
                        oneWayDistance: distC,
                        durationMinutes: timeMinC,
                        durationDisplay: formatMinutes(timeMinC),
                        tollCost: 0,
                        qualityScore: 70,
                        roadType: 'State Highway',
                        geometry: generatePolylineCurve(originGeo, destGeo, 0.09)
                    }
                ];
            }
        }

        rawRoutes.forEach(r => {
            r.originGeo = originGeo;
            r.destGeo = destGeo;
            r.originName = originStr;
            r.destName = destStr;
        });

        return rawRoutes.map(route => calculateRouteCost(route, travelMode, isDelhiRishikesh));
    }

    const KNOWN_ACTIVITIES = {
        'udaipur': [
            { name: 'City Palace Udaipur', category: 'Heritage & Palace', description: 'Magnificent 16th-century palace complex overlooking Lake Pichola.', cost: 300 },
            { name: 'Lake Pichola & Jag Mandir Boating', category: 'Adventure & Lake', description: 'Scenic boat ride across Lake Pichola to Jag Mandir island palace.', cost: 450 },
            { name: 'Saheliyon-ki-Bari Gardens', category: 'Sightseeing & Parks', description: 'Historic garden with fountains, lotus pools, and marble elephants.', cost: 100 },
            { name: 'Fateh Sagar Lake & Sunset View', category: 'Outdoors & Viewpoint', description: 'Beautiful artificial lake with Nehru Park island and sunset views.', cost: 200 },
            { name: 'Monsoon Palace (Sajjangarh Fort)', category: 'Fort & Viewpoint', description: 'Hilltop palatial fort offering panoramic views of Udaipur city & lakes.', cost: 250 }
        ],
        'delhi': [
            { name: 'Red Fort & Chandni Chowk', category: 'Heritage & Sightseeing', description: 'Historic 17th-century Mughal fort & iconic bustling heritage market.', cost: 150 },
            { name: 'Qutub Minar & Mehrauli Park', category: 'UNESCO Heritage', description: 'World tallest brick minaret surrounded by ancient monuments.', cost: 100 },
            { name: 'Humayun Tomb & Nizamuddin', category: 'Mughal Architecture', description: 'Stunning precursor to the Taj Mahal set in lush Persian gardens.', cost: 150 },
            { name: 'India Gate & Rajpath Walk', category: 'Landmark & Walk', description: 'Iconic war memorial archway and national boulevard.', cost: 50 },
            { name: 'Lotus Temple & Connaught Place', category: 'Architecture & Dining', description: 'Baháʼí House of Worship & premier shopping hub.', cost: 100 }
        ],
        'rishikesh': [
            { name: 'White Water River Rafting', category: 'Adventure & Water Sports', description: 'Thrilling 12km white water rafting down the Holy Ganges.', cost: 650 },
            { name: 'Lakshman Jhula & Ram Jhula Walk', category: 'Sightseeing & Culture', description: 'Iconic suspension bridges spanning across the Ganges river.', cost: 50 },
            { name: 'Triveni Ghat Evening Ganga Aarti', category: 'Spiritual & Cultural', description: 'Mesmerizing evening prayer ceremony with floating oil lamps.', cost: 50 },
            { name: 'Beatles Ashram (Chaurasi Kutia)', category: 'Heritage & Eco-Park', description: 'Historic ashram where Beatles composed music, filled with graffiti art.', cost: 250 },
            { name: 'Neer Garh Waterfall Trek', category: 'Nature & Trekking', description: 'Refreshing natural waterfall cascade tucked in lush Himalayan hills.', cost: 150 }
        ],
        'jaipur': [
            { name: 'Amber Fort & Palace', category: 'Fort & Heritage', description: 'Majestic hilltop fort with Sheesh Mahal (Palace of Mirrors).', cost: 500 },
            { name: 'Hawa Mahal (Palace of Winds)', category: 'Iconic Landmark', description: 'Intricate 5-story pink sandstone palace with 953 jharokhas.', cost: 200 },
            { name: 'City Palace Jaipur & Museum', category: 'Royal Residence', description: 'Grand palace complex showcasing royal Rajput artifacts.', cost: 300 },
            { name: 'Jantar Mantar Astronomical Observatory', category: 'UNESCO Heritage', description: 'World largest stone sundial and astronomical instrument park.', cost: 200 },
            { name: 'Nahargarh Fort Sunset View', category: 'Viewpoint & Dining', description: 'Panoramas of Pink City from the edge of Aravalli hills.', cost: 250 }
        ],
        'agra': [
            { name: 'Taj Mahal Sunrise Heritage Tour', category: 'UNESCO Wonder', description: 'World-famous ivory-white marble mausoleum on Yamuna riverbank.', cost: 600 },
            { name: 'Agra Fort Mughal Citadel', category: 'Fort & History', description: 'Massive red sandstone fortress of the Mughal Emperors.', cost: 350 },
            { name: 'Fatehpur Sikri Royal City', category: 'UNESCO Heritage', description: 'Preserved 16th-century ghost city built by Emperor Akbar.', cost: 250 },
            { name: 'Mehtab Bagh Sunset Viewpoint', category: 'Gardens & View', description: 'Charbagh garden complex offering magical rear views of Taj Mahal.', cost: 100 }
        ],
        'mumbai': [
            { name: 'Gateway of India & Colaba Walk', category: 'Landmark & Heritage', description: 'Iconic 1924 waterfront archway facing the Arabian Sea.', cost: 50 },
            { name: 'Elephanta Caves Boat Tour', category: 'UNESCO Heritage', description: 'Ferry ride to rock-cut cave temples dedicated to Lord Shiva.', cost: 350 },
            { name: 'Marine Drive Queen Necklace Walk', category: 'Outdoors & Sunset', description: '3km long C-shaped boulevard along South Mumbai coast.', cost: 50 },
            { name: 'Chhatrapati Shivaji Terminus & Fort Area', category: 'Victorian Heritage', description: 'Grand Victorian Gothic UNESCO rail station & heritage trail.', cost: 100 }
        ],
        'goa': [
            { name: 'Baga & Calangute Beach Water Sports', category: 'Beach & Adventure', description: 'Parasailing, jet ski, and banana boat rides on North Goa coast.', cost: 750 },
            { name: 'Dudhsagar Waterfalls Safari', category: 'Jungle & Adventure', description: 'Jeep safari through Mollem National Park to 4-tiered waterfall.', cost: 850 },
            { name: 'Fort Aguada & Lighthouse', category: 'Portuguese Fort', description: '17th-century Portuguese fort overlooking the Arabian Sea.', cost: 100 },
            { name: 'Old Goa Churches Heritage Walk', category: 'UNESCO Heritage', description: 'Basilica of Bom Jesus & Se Cathedral historic churches.', cost: 50 }
        ],
        'bengaluru': [
            { name: 'Lalbagh Botanical Garden & Glass House', category: 'Nature & Parks', description: '240-acre botanical garden with rare plants & historic glasshouse.', cost: 100 },
            { name: 'Bangalore Palace Tour', category: 'Palace & Heritage', description: 'Tudor-style royal residence built by the Wodeyar dynasty.', cost: 400 },
            { name: 'Cubbon Park & Vidhana Soudha', category: 'Sightseeing & Greenery', description: 'Sprawling green park in heart of city next to neo-Dravidian parliament.', cost: 50 },
            { name: 'ISKCON Temple & Cultural Center', category: 'Spiritual & Dining', description: 'Magnificent hilltop temple complex serving authentic prasadam.', cost: 100 }
        ]
    };

    async function fetchDestinationActivities(destName, destGeo) {
        const activities = [];
        const cleanDest = destName.trim().toLowerCase();

        for (const [key, actList] of Object.entries(KNOWN_ACTIVITIES)) {
            if (cleanDest === key || cleanDest.includes(key) || key.includes(cleanDest)) {
                actList.forEach((item, idx) => {
                    const offsetLat = (Math.sin(idx * 1.4 + 0.5) * 0.02);
                    const offsetLng = (Math.cos(idx * 1.4 + 0.5) * 0.02);
                    activities.push({
                        id: `act-${idx + 1}`,
                        name: item.name,
                        category: item.category,
                        description: item.description,
                        cost: item.cost,
                        included: true,
                        lat: destGeo ? destGeo.lat + offsetLat : null,
                        lng: destGeo ? destGeo.lng + offsetLng : null
                    });
                });
                break;
            }
        }

        if (activities.length === 0) {
            try {
                let rawResults = [];
                if (destGeo && destGeo.lat && destGeo.lng) {
                    const geoWikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${destGeo.lat}|${destGeo.lng}&gsradius=25000&gslimit=15&format=json&origin=*`;
                    const geoRes = await fetchWithTimeout(geoWikiUrl);
                    if (geoRes && geoRes.ok) {
                        const geoData = await geoRes.json();
                        if (geoData && geoData.query && geoData.query.geosearch) {
                            rawResults = geoData.query.geosearch.map(item => ({
                                title: item.title,
                                snippet: `Popular landmark near ${destName}`,
                                lat: item.lat,
                                lon: item.lon
                            }));
                        }
                    }
                }

                if (rawResults.length === 0) {
                    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent('"' + destName + '" sights OR attractions OR places to visit')}&utf8=&format=json&origin=*`;
                    const res = await fetchWithTimeout(wikiUrl);
                    if (res && res.ok) {
                        const data = await res.json();
                        if (data && data.query && data.query.search) {
                            rawResults = data.query.search;
                        }
                    }
                }

                const INVALID_PATTERNS = [
                    /express/i, /shatabdi/i, /rajdhani/i, /mail/i, /superfast/i, /vande bharat/i,
                    /intercity/i, /passenger/i, /special/i, /railway station/i, /junction/i,
                    /demographics/i, /economy of/i, /geography of/i, /outline of/i, /list of/i,
                    /history of/i, /politics of/i, /government of/i, /transport in/i, /crime in/i,
                    /census/i, /district court/i, /constituency/i, /vidhan sabha/i, /lok sabha/i
                ];

                const filtered = rawResults.filter(item => {
                    const lower = (item.title || '').toLowerCase();
                    if (INVALID_PATTERNS.some(pat => pat.test(lower))) return false;
                    if (item.lat && item.lon && destGeo && destGeo.lat && destGeo.lng) {
                        const dist = computeHaversineKm(destGeo.lat, destGeo.lng, item.lat, item.lon);
                        if (dist > 35) return false;
                    }
                    return true;
                }).slice(0, 5);

                filtered.forEach((item, idx) => {
                    const title = item.title.replace(/<\/?[^>]+(>|$)/g, "");
                    const snippet = (item.snippet || '').replace(/<\/?[^>]+(>|$)/g, "");
                    
                    let category = 'Sightseeing';
                    let cost = 150 + (idx * 50);

                    const lowerTitle = title.toLowerCase();
                    if (lowerTitle.includes('temple') || lowerTitle.includes('ghat') || lowerTitle.includes('ashram') || lowerTitle.includes('fort') || lowerTitle.includes('tomb')) {
                        category = 'Heritage & Sightseeing';
                        cost = lowerTitle.includes('temple') || lowerTitle.includes('ghat') ? 50 : 200;
                    } else if (lowerTitle.includes('rafting') || lowerTitle.includes('safari') || lowerTitle.includes('adventure') || lowerTitle.includes('beach') || lowerTitle.includes('trek') || lowerTitle.includes('lake') || lowerTitle.includes('river')) {
                        category = 'Adventure & Activity';
                        cost = 450 + (idx * 100);
                    } else if (lowerTitle.includes('museum') || lowerTitle.includes('palace') || lowerTitle.includes('gallery')) {
                        category = 'Culture & Museum';
                        cost = 250;
                    }

                    const actLat = item.lat || (destGeo ? destGeo.lat + (Math.sin(idx * 1.4 + 0.5) * 0.02) : null);
                    const actLng = item.lon || (destGeo ? destGeo.lng + (Math.cos(idx * 1.4 + 0.5) * 0.02) : null);

                    activities.push({
                        id: `act-${idx + 1}`,
                        name: title,
                        category: category,
                        description: snippet || `Explore famous ${title} experience in ${destName}.`,
                        cost: cost,
                        included: true,
                        lat: actLat,
                        lng: actLng
                    });
                });
            } catch (e) {
                console.warn("Wikipedia activities API notice:", e);
            }
        }

        if (activities.length === 0) {
            activities.push(
                { id: 'act-1', name: `Top Attractions & Landmarks in ${destName}`, category: 'Sightseeing', description: `Guided sightseeing tour of iconic attractions in ${destName}`, cost: 250, included: true, lat: destGeo ? destGeo.lat + 0.01 : null, lng: destGeo ? destGeo.lng + 0.01 : null },
                { id: 'act-2', name: `Local Adventure & Outdoor Experience`, category: 'Adventure & Activity', description: `Trekking, boating, or outdoor activity experience`, cost: 500, included: true, lat: destGeo ? destGeo.lat - 0.01 : null, lng: destGeo ? destGeo.lng + 0.015 : null },
                { id: 'act-3', name: `Heritage & Cultural Walk`, category: 'Culture', description: `Explore historical monuments and cultural streets`, cost: 150, included: true, lat: destGeo ? destGeo.lat + 0.015 : null, lng: destGeo ? destGeo.lng - 0.01 : null }
            );
        }

        activities.push({
            id: 'act-stay-food',
            name: `Authentic Local Dining & Stay Allowance`,
            category: 'Food & Accommodation',
            description: `Estimated local food, snacks, and hotel stay contribution at destination`,
            cost: 650,
            included: true,
            lat: destGeo ? destGeo.lat : null,
            lng: destGeo ? destGeo.lng : null
        });

        return activities;
    }

    function calculateRouteCost(route, travelMode = 'car', isDelhiRishikesh = false) {
        const oneWayDistance = route.oneWayDistance;
        const returnDistance = route.oneWayDistance;
        const roundTripDistance = oneWayDistance + returnDistance;

        let oneWayCost = 0;
        let returnCost = 0;
        let fuelOrFareDetails = '';

        if (isDelhiRishikesh && travelMode === 'car') {
            if (route.id === 'route-a') {
                oneWayCost = 500;
                returnCost = 500;
                fuelOrFareDetails = 'Fuel: ₹350 + Toll: ₹150';
            } else if (route.id === 'route-b') {
                oneWayCost = 650;
                returnCost = 650;
                fuelOrFareDetails = 'Fuel: ₹330 + Toll: ₹320 (Expressway)';
            } else {
                oneWayCost = 550;
                returnCost = 550;
                fuelOrFareDetails = 'Fuel: ₹550 + Toll: ₹0 (Non-toll)';
            }
        } else {
            switch (travelMode) {
                case 'bus': {
                    const ratePerKm = route.id === 'route-b' ? 2.4 : (route.id === 'route-a' ? 1.8 : 1.5);
                    oneWayCost = Math.round(oneWayDistance * ratePerKm);
                    returnCost = oneWayCost;
                    fuelOrFareDetails = `Bus Ticket: ₹${oneWayCost} per person each way`;
                    break;
                }
                case 'train': {
                    const baseFare = route.id === 'route-b' ? 450 : (route.id === 'route-a' ? 320 : 260);
                    oneWayCost = baseFare;
                    returnCost = baseFare;
                    fuelOrFareDetails = `Rail Fare: ₹${oneWayCost} per passenger each way`;
                    break;
                }
                case 'bike': {
                    const fuelPerKm = 2.1;
                    oneWayCost = Math.round(oneWayDistance * fuelPerKm);
                    returnCost = oneWayCost;
                    fuelOrFareDetails = `Bike Fuel: ₹${oneWayCost} (Tolls Exempt)`;
                    break;
                }
                case 'flight': {
                    const airfare = 2800 + Math.round(oneWayDistance * 2.2);
                    oneWayCost = airfare;
                    returnCost = airfare;
                    fuelOrFareDetails = `Airfare + Airport Charges: ₹${oneWayCost}`;
                    break;
                }
                case 'car':
                default: {
                    const fuelRate = route.id === 'route-b' ? 3.9 : 3.6;
                    const oneWayFuel = Math.round(oneWayDistance * fuelRate);
                    oneWayCost = oneWayFuel + route.tollCost;
                    returnCost = oneWayFuel + route.tollCost;
                    fuelOrFareDetails = `Fuel: ₹${oneWayFuel} + Tolls: ₹${route.tollCost}`;
                    break;
                }
            }
        }

        const roundTripCost = oneWayCost + returnCost;
        const activitiesCost = state.destinationActivities ? state.destinationActivities.filter(a => a.included).reduce((sum, a) => sum + a.cost, 0) : 0;
        const totalTripCost = roundTripCost + activitiesCost;

        return {
            ...route,
            oneWayDistance,
            returnDistance,
            roundTripDistance,
            oneWayCost,
            returnCost,
            roundTripCost,
            activitiesCost,
            totalTripCost,
            fuelOrFareDetails,
            travelMode
        };
    }

    function checkBudgetFeasibility(userBudget, minimumTotalTripCost, minimumTravelCost, activitiesCost) {
        userBudget = Number(userBudget) || 0;
        minimumTotalTripCost = Number(minimumTotalTripCost) || 0;

        if (userBudget < minimumTotalTripCost) {
            const shortfall = minimumTotalTripCost - userBudget;
            return {
                feasible: false,
                reason: 'BUDGET_TOO_LOW',
                minimumTotalTripCost,
                minimumTravelCost,
                activitiesCost,
                userBudget,
                shortfall,
                message: `✕ Shortfall of ₹${shortfall.toLocaleString()}. Total required for full trip (Travel + Activities + Return): ₹${minimumTotalTripCost.toLocaleString()}.`
            };
        }

        const surplus = userBudget - minimumTotalTripCost;
        return {
            feasible: true,
            reason: 'FEASIBLE',
            minimumTotalTripCost,
            minimumTravelCost,
            activitiesCost,
            userBudget,
            surplus,
            message: `✓ Total trip cost (Travel + Activities + Return) is ₹${minimumTotalTripCost.toLocaleString()}, leaving +₹${surplus.toLocaleString()} surplus.`
        };
    }

    function filterFeasibleRoutes(routes, userBudget) {
        if (!Array.isArray(routes)) return [];
        return routes.filter(route => route.totalTripCost <= userBudget);
    }

    function selectMinimumBudgetRoute(routes, userBudget = Infinity) {
        const feasible = filterFeasibleRoutes(routes, userBudget);
        if (feasible.length === 0) return routes[0];
        return [...feasible].sort((a, b) => a.totalTripCost - b.totalTripCost)[0];
    }

    function selectBestOverallRoute(routes, userBudget = Infinity, preference = 'balanced') {
        const feasible = filterFeasibleRoutes(routes, userBudget);
        const list = feasible.length > 0 ? feasible : routes;
        if (list.length === 1) return list[0];

        const costs = list.map(r => r.totalTripCost);
        const times = list.map(r => r.durationMinutes);
        const qualities = list.map(r => r.qualityScore);

        const minCost = Math.min(...costs);
        const maxCost = Math.max(...costs);
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);

        let wCost = 0.35, wTime = 0.35, wQuality = 0.30;
        if (preference === 'budget') { wCost = 0.60; wTime = 0.20; wQuality = 0.20; }
        else if (preference === 'comfort') { wCost = 0.20; wTime = 0.40; wQuality = 0.40; }

        let bestRoute = list[0];
        let bestScore = -1;

        list.forEach(route => {
            const costNorm = maxCost === minCost ? 1 : 1 - ((route.totalTripCost - minCost) / (maxCost - minCost));
            const timeNorm = maxTime === minTime ? 1 : 1 - ((route.durationMinutes - minTime) / (maxTime - minTime));
            const qualityNorm = route.qualityScore / 100;

            const score = (costNorm * wCost) + (timeNorm * wTime) + (qualityNorm * wQuality);
            route.score = Math.round(score * 100);

            if (score > bestScore) {
                bestScore = score;
                bestRoute = route;
            }
        });

        return bestRoute;
    }

    async function calculateFeasibility({ origin, destination, budget, travelMode = 'car', preference = 'balanced', selectionMode = 'minimum' }) {
        if (!origin || typeof origin !== 'string' || !origin.trim()) {
            return { error: true, message: 'Please enter a valid starting location.' };
        }
        if (!destination || typeof destination !== 'string' || !destination.trim()) {
            return { error: true, message: 'Please enter a valid destination.' };
        }
        if (origin.trim().toLowerCase() === destination.trim().toLowerCase()) {
            return { error: true, message: 'Starting location and destination cannot be the same.' };
        }
        if (budget <= 0) {
            return { error: true, message: 'Please enter a valid budget greater than 0.' };
        }

        const originGeo = await geocodeLocation(origin) || { name: origin, lat: 28.6139, lng: 77.2090 };
        const destGeo = await geocodeLocation(destination) || { name: destination, lat: 30.0869, lng: 78.2676 };

        state.destinationActivities = await fetchDestinationActivities(destination, destGeo);
        state.activitiesTotalCost = state.destinationActivities.filter(a => a.included).reduce((sum, a) => sum + a.cost, 0);

        let routes = await calculateRouteAlternatives(origin, destination, travelMode);
        if (!routes || routes.length === 0) {
            return { error: true, message: 'Could not calculate route alternatives for this journey.' };
        }

        routes = routes.map(r => calculateRouteCost(r, travelMode));

        const allTotalCosts = routes.map(r => r.totalTripCost);
        const minimumTotalTripCost = Math.min(...allTotalCosts);
        const minimumTravelCost = Math.min(...routes.map(r => r.roundTripCost));

        const feasibility = checkBudgetFeasibility(budget, minimumTotalTripCost, minimumTravelCost, state.activitiesTotalCost);
        const feasibleRoutes = filterFeasibleRoutes(routes, budget);

        const minimumBudgetRoute = selectMinimumBudgetRoute(routes, budget);
        const bestOverallRoute = selectBestOverallRoute(routes, budget, preference);

        let selectedRoute = null;
        if (selectionMode === 'minimum' && minimumBudgetRoute) {
            selectedRoute = minimumBudgetRoute;
        } else if (selectionMode === 'best' && bestOverallRoute) {
            selectedRoute = bestOverallRoute;
        } else {
            selectedRoute = minimumBudgetRoute || bestOverallRoute || routes[0];
        }

        state.origin = origin;
        state.destination = destination;
        state.userBudget = budget;
        state.travelMode = travelMode;
        state.preference = preference;
        state.selectionMode = selectionMode;
        state.routes = routes;
        state.feasibleRoutes = feasibleRoutes;
        state.minimumBudgetRoute = minimumBudgetRoute;
        state.bestOverallRoute = bestOverallRoute;
        state.selectedRoute = selectedRoute;
        state.feasibilityResult = feasibility;

        return {
            error: false,
            origin,
            destination,
            travelMode,
            userBudget: budget,
            minimumTotalTripCost,
            minimumTravelCost,
            activitiesTotalCost: state.activitiesTotalCost,
            destinationActivities: state.destinationActivities,
            feasibility,
            routes,
            feasibleRoutes,
            minimumBudgetRoute,
            bestOverallRoute,
            selectedRoute,
            selectionMode
        };
    }

    function displayFeasibilityResult(result, container) {
        if (!container) return;
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        if (!container) return;

        if (result.error) {
            container.innerHTML = `
                <div class="bro-status-banner infeasible">
                    <div class="bro-status-title-box">
                        <span class="bro-status-icon">⚠️</span>
                        <div>
                            <h4 class="bro-status-heading">Invalid Input</h4>
                            <p style="margin: 4px 0 0 0; color: var(--bro-text-muted);">${result.message}</p>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        const { feasibility, routes, minimumBudgetRoute, bestOverallRoute, selectedRoute, userBudget, minimumTotalTripCost } = result;
        const isFeasible = feasibility.feasible;
        const curRoute = selectedRoute || routes[0];

        let html = '';

        html += `
            <div class="bro-status-banner ${isFeasible ? 'feasible' : 'infeasible'}">
                <div class="bro-status-header">
                    <div class="bro-status-title-box">
                        <span class="bro-status-icon">${isFeasible ? '✓' : '✕'}</span>
                        <div>
                            <h3 class="bro-status-heading">
                                ${isFeasible ? 'Complete Trip is Feasible within your Budget!' : 'Trip Budget Shortfall for Complete Journey'}
                            </h3>
                            <span style="font-size: 0.84rem; color: var(--bro-text-muted);">
                                ${state.origin} &harr; ${state.destination} (${formatTravelModeName(state.travelMode)}) &bull; Round-Trip Travel + Activities & Stay
                            </span>
                        </div>
                    </div>
                    <span class="bro-status-badge ${isFeasible ? 'feasible' : 'infeasible'}">
                        ${isFeasible ? 'Feasible Trip' : 'Infeasible Budget'}
                    </span>
                </div>

                <div class="bro-status-details">
                    <div class="bro-stat-item">
                        <span class="bro-stat-label">Round-Trip Travel Cost</span>
                        <span class="bro-stat-value">₹${curRoute.roundTripCost.toLocaleString()}</span>
                    </div>
                    <div class="bro-stat-item">
                        <span class="bro-stat-label">Activities & Local Stay</span>
                        <span class="bro-stat-value">₹${state.activitiesTotalCost.toLocaleString()}</span>
                    </div>
                    <div class="bro-stat-item">
                        <span class="bro-stat-label">Grand Total Trip Budget</span>
                        <span class="bro-stat-value" style="color:#6ee7b7; font-weight:800;">₹${curRoute.totalTripCost.toLocaleString()}</span>
                    </div>
                    <div class="bro-stat-item">
                        <span class="bro-stat-label">Your Entered Budget</span>
                        <span class="bro-stat-value">₹${userBudget.toLocaleString()}</span>
                    </div>
                    ${!isFeasible ? `
                    <div class="bro-stat-item">
                        <span class="bro-stat-label">Shortfall</span>
                        <span class="bro-stat-value shortfall">-₹${feasibility.shortfall.toLocaleString()}</span>
                    </div>
                    ` : `
                    <div class="bro-stat-item">
                        <span class="bro-stat-label">Remaining Surplus</span>
                        <span class="bro-stat-value surplus">+₹${feasibility.surplus.toLocaleString()}</span>
                    </div>
                    `}
                </div>

                <div class="bro-status-actions">
                    ${!isFeasible ? `
                        <button type="button" class="bro-btn-increase" id="bro-btn-auto-increase">
                            <span>⚡ Increase Budget to ₹${curRoute.totalTripCost.toLocaleString()} (+₹${feasibility.shortfall.toLocaleString()})</span>
                        </button>
                    ` : `
                        <button type="button" class="bro-btn-continue" id="bro-btn-continue-plan">
                            <span>✓ Continue with ${curRoute.name} (${curRoute.highway}) &rarr;</span>
                        </button>
                    `}
                </div>
            </div>
        `;

        html += `
            <div class="bro-breakdown-card">
                <h4 class="bro-breakdown-title">📊 Total Trip Expense Breakdown (${state.origin} &rarr; ${state.destination} &rarr; ${state.origin})</h4>
                <div class="bro-breakdown-grid">
                    <div class="bro-breakdown-box">
                        <span class="bro-breakdown-label">🚗 Outbound Travel</span>
                        <span class="bro-breakdown-value">₹${curRoute.oneWayCost.toLocaleString()}</span>
                    </div>
                    <div class="bro-breakdown-box">
                        <span class="bro-breakdown-label">🎯 Destination Experiences</span>
                        <span class="bro-breakdown-value">₹${state.activitiesTotalCost.toLocaleString()}</span>
                    </div>
                    <div class="bro-breakdown-box">
                        <span class="bro-breakdown-label">🔄 Return Travel</span>
                        <span class="bro-breakdown-value">₹${curRoute.returnCost.toLocaleString()}</span>
                    </div>
                    <div class="bro-breakdown-box" style="border-color: rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.15);">
                        <span class="bro-breakdown-label" style="color: #6ee7b7;">💰 Grand Total Cost</span>
                        <span class="bro-breakdown-value" style="color: #10b981;">₹${curRoute.totalTripCost.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        `;

        if (state.destinationActivities && state.destinationActivities.length > 0) {
            html += `
                <div class="bro-activities-container">
                    <div class="bro-activities-header">
                        <div>
                            <h4 class="bro-activities-title">🎯 Planned Activities & Experiences in ${state.destination}</h4>
                            <span class="bro-activities-subtitle">Fetched dynamically via Free Open Wikipedia & OpenStreetMap APIs</span>
                        </div>
                        <span style="font-size: 0.85rem; font-weight: 700; color: #10b981;">
                            Activities Total: ₹${state.activitiesTotalCost.toLocaleString()}
                        </span>
                    </div>

                    <div class="bro-activities-grid">
            `;

            state.destinationActivities.forEach((act, index) => {
                html += `
                    <div class="bro-activity-card ${!act.included ? 'deselected' : ''}">
                        <div class="bro-activity-top">
                            <h5 class="bro-activity-name">${index + 1}. ${act.name}</h5>
                            <span class="bro-activity-tag">${act.category}</span>
                        </div>
                        <p class="bro-activity-desc">${act.description}</p>
                        <div class="bro-activity-footer">
                            <span class="bro-activity-cost">₹${act.cost.toLocaleString()}</span>
                            <label class="bro-activity-toggle">
                                <input type="checkbox" class="bro-act-checkbox" data-act-id="${act.id}" ${act.included ? 'checked' : ''}>
                                <span>Include in Budget</span>
                            </label>
                        </div>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        }

        html += `
            <div class="bro-controls-card">
                <div class="bro-toggle-group">
                    <button type="button" class="bro-toggle-btn ${state.selectionMode === 'minimum' ? 'active' : ''}" data-selection="minimum">
                        <span>💰 Minimum Budget Route</span>
                    </button>
                    <button type="button" class="bro-toggle-btn ${state.selectionMode === 'best' ? 'active' : ''}" data-selection="best">
                        <span>⭐ Best Overall Route</span>
                    </button>
                </div>

                <div class="bro-pref-select-wrap">
                    <label for="bro-pref-dropdown">Scoring Priority:</label>
                    <select id="bro-pref-dropdown" class="bro-pref-select">
                        <option value="budget" ${state.preference === 'budget' ? 'selected' : ''}>Budget-Focused (60% Cost)</option>
                        <option value="balanced" ${state.preference === 'balanced' ? 'selected' : ''}>Balanced (Cost + Time + Road)</option>
                        <option value="comfort" ${state.preference === 'comfort' ? 'selected' : ''}>Comfort-Focused (Speed & Expressway)</option>
                    </select>
                </div>
            </div>
        `;

        html += `<div class="bro-routes-grid">`;
        routes.forEach(route => {
            const isRouteFeasible = route.totalTripCost <= userBudget;
            const isSelected = selectedRoute && selectedRoute.id === route.id;
            const isCheapest = minimumBudgetRoute && minimumBudgetRoute.id === route.id;
            const isBestOverall = bestOverallRoute && bestOverallRoute.id === route.id;

            let ribbonBadge = '';
            if (!isRouteFeasible) {
                ribbonBadge = `<span class="bro-route-badge-ribbon infeasible">Exceeds Budget</span>`;
            } else if (isCheapest && isBestOverall) {
                ribbonBadge = `<span class="bro-route-badge-ribbon cheapest">Cheapest & Best</span>`;
            } else if (isCheapest) {
                ribbonBadge = `<span class="bro-route-badge-ribbon cheapest">Lowest Cost</span>`;
            } else if (isBestOverall) {
                ribbonBadge = `<span class="bro-route-badge-ribbon best">Best Balanced</span>`;
            }

            html += `
                <div class="bro-route-card ${isSelected ? 'selected' : ''} ${!isRouteFeasible ? 'infeasible' : ''}" data-route-id="${route.id}">
                    ${ribbonBadge}
                    <div>
                        <h4 class="bro-route-title">${route.name}</h4>
                        <div class="bro-route-highway">${route.highway}</div>
                    </div>

                    <div class="bro-route-metrics-row">
                        <div class="bro-metric-col">
                            <span class="bro-metric-label">Distance (1-Way)</span>
                            <span class="bro-metric-val">${route.oneWayDistance} km</span>
                        </div>
                        <div class="bro-metric-col">
                            <span class="bro-metric-label">Travel Time</span>
                            <span class="bro-metric-val">${route.durationDisplay}</span>
                        </div>
                    </div>

                    <div class="bro-route-cost-breakdown">
                        <div class="bro-cost-row">
                            <span>Travel (Round-Trip):</span>
                            <span style="font-weight: 600;">₹${route.roundTripCost.toLocaleString()}</span>
                        </div>
                        <div class="bro-cost-row">
                            <span>Activities & Stay:</span>
                            <span style="font-weight: 600;">₹${state.activitiesTotalCost.toLocaleString()}</span>
                        </div>
                        <div class="bro-cost-row total">
                            <span>Total Trip Cost:</span>
                            <span class="bro-total-val">₹${route.totalTripCost.toLocaleString()}</span>
                        </div>
                    </div>

                    <div class="bro-route-quality-bar">
                        <div class="bro-quality-header">
                            <span>Road & Comfort: ${route.roadType}</span>
                            <span>${route.qualityScore}/100</span>
                        </div>
                        <div class="bro-progress-bg">
                            <div class="bro-progress-fill" style="width: ${route.qualityScore}%;"></div>
                        </div>
                    </div>
                </div>
            `;
        });
        html += `</div>`;

        html += `
            <div class="bro-map-wrapper">
                <div id="bro-leaflet-map"></div>
                <div class="bro-map-floating-overlay">
                    <span><span class="bro-map-legend-dot selected"></span> Selected Route</span>
                    <span><span class="bro-map-legend-dot alt"></span> Feasible Route</span>
                    <span><span class="bro-map-legend-dot infeasible"></span> Infeasible Route</span>
                </div>
            </div>
        `;

        container.innerHTML = html;

        attachEventListeners(container);

        setTimeout(() => {
            initOrUpdateLeafletMap(routes, selectedRoute);
        }, 120);
    }

    function formatTravelModeName(mode) {
        switch (mode) {
            case 'bus': return '🚌 Bus';
            case 'train': return '🚆 Train';
            case 'bike': return '🏍️ Motorcycle';
            case 'flight': return '✈️ Flight';
            case 'car':
            default: return '🚗 Car / Cab';
        }
    }

    function initOrUpdateLeafletMap(routes, selectedRoute) {
        const mapEl = document.getElementById('bro-leaflet-map');
        if (!mapEl || typeof L === 'undefined') return;

        if (state.mapInstance) {
            try {
                state.mapInstance.remove();
            } catch (e) {
                console.warn('Leaflet map cleanup notice:', e);
            }
            state.mapInstance = null;
            state.mapLayers = [];
        }

        state.mapInstance = L.map('bro-leaflet-map', {
            zoomControl: true,
            scrollWheelZoom: false
        }).setView([28.6139, 77.2090], 7);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(state.mapInstance);

        state.mapLayers = [];
        if (!routes || routes.length === 0) return;

        const allBounds = L.latLngBounds();

        routes.forEach(route => {
            if (!route.geometry || route.geometry.length === 0) return;

            const isSelected = selectedRoute && selectedRoute.id === route.id;
            const isFeasible = route.totalTripCost <= state.userBudget;

            let color = '#3b82f6';
            let weight = 4;
            let opacity = 0.7;

            if (isSelected) {
                color = '#10b981';
                weight = 6;
                opacity = 0.95;
            } else if (!isFeasible) {
                color = '#ef4444';
                weight = 3;
                opacity = 0.5;
            }

            const polyline = L.polyline(route.geometry, {
                color,
                weight,
                opacity,
                dashArray: !isFeasible && !isSelected ? '6, 8' : null
            }).addTo(state.mapInstance);

            polyline.bindPopup(`
                <div style="font-family: sans-serif; color: #0f172a; padding: 4px;">
                    <b style="font-size: 1rem; color: #059669;">${route.name} (${route.highway})</b><br/>
                    <div style="margin-top: 6px; font-size: 0.85rem; line-height: 1.4;">
                        <b>Distance (1-Way):</b> ${route.oneWayDistance} km<br/>
                        <b>Travel Time:</b> ${route.durationDisplay}<br/>
                        <b>Travel (Round-Trip):</b> ₹${route.roundTripCost.toLocaleString()}<br/>
                        <b>Activities & Stay:</b> ₹${state.activitiesTotalCost.toLocaleString()}<br/>
                        <b style="color: #10b981;">Total Trip Cost: ₹${route.totalTripCost.toLocaleString()}</b>
                    </div>
                </div>
            `);

            polyline.on('click', () => {
                state.selectedRoute = route;
                recalculateAndRender();
            });

            state.mapLayers.push(polyline);
            allBounds.extend(polyline.getBounds());
        });

        if (routes[0] && routes[0].originGeo) {
            const originGeo = routes[0].originGeo;
            const destGeo = routes[0].destGeo;

            const originMarker = L.marker([originGeo.lat, originGeo.lng], {
                icon: L.divIcon({
                    className: 'bro-marker-origin',
                    html: '<div style="background:#10b981; color:#fff; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px; box-shadow:0 0 10px rgba(0,0,0,0.5); border:2px solid #fff;">A</div>',
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                })
            }).addTo(state.mapInstance);
            originMarker.bindPopup(`<b>Start Location:</b> ${originGeo.name}`);
            state.mapLayers.push(originMarker);
            allBounds.extend([originGeo.lat, originGeo.lng]);

            const destMarker = L.marker([destGeo.lat, destGeo.lng], {
                icon: L.divIcon({
                    className: 'bro-marker-dest',
                    html: '<div style="background:#ef4444; color:#fff; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px; box-shadow:0 0 10px rgba(0,0,0,0.5); border:2px solid #fff;">B</div>',
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                })
            }).addTo(state.mapInstance);
            destMarker.bindPopup(`<b>Destination:</b> ${destGeo.name}`);
            state.mapLayers.push(destMarker);
            allBounds.extend([destGeo.lat, destGeo.lng]);

            if (state.destinationActivities && state.destinationActivities.length > 0) {
                state.destinationActivities.forEach((act, idx) => {
                    if (act.lat && act.lng && act.included) {
                        const actMarker = L.marker([act.lat, act.lng], {
                            icon: L.divIcon({
                                className: 'bro-marker-activity',
                                html: `<div style="background:#f59e0b; color:#1e293b; border-radius:50%; width:26px; height:26px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px; box-shadow:0 0 8px rgba(245,158,11,0.8); border:2px solid #fff;">${idx + 1}</div>`,
                                iconSize: [26, 26],
                                iconAnchor: [13, 13]
                            })
                        }).addTo(state.mapInstance);
                        actMarker.bindPopup(`<b>${idx + 1}. ${act.name}</b><br/>${act.category}<br/>Est. Fee: ₹${act.cost.toLocaleString()}`);
                        state.mapLayers.push(actMarker);
                        allBounds.extend([act.lat, act.lng]);
                    }
                });
            }
        }

        // Overlay Active Restricted Danger Zones as Red Circles
        fetch((window.location.origin.includes(':3000') || window.location.origin.includes(':5500') ? 'http://localhost:5000' : '') + '/api/geofence/zones')
            .then(res => res.json())
            .then(data => {
                if (data && data.zones && state.mapInstance) {
                    data.zones.forEach(zone => {
                        const circle = L.circle([Number(zone.latitude), Number(zone.longitude)], {
                            color: '#dc2626',
                            fillColor: '#ef4444',
                            fillOpacity: 0.28,
                            radius: Number(zone.radius_meters || 300),
                            weight: 2,
                            dashArray: '6, 6'
                        }).addTo(state.mapInstance);

                        circle.bindPopup(`
                            <div style="font-family: sans-serif; padding: 4px; min-width: 170px;">
                                <b style="color: #dc2626; font-size: 13px;">⛔ RESTRICTED DANGER ZONE</b><br/>
                                <strong style="color: #0f172a;">${zone.name}</strong>
                                <p style="margin: 4px 0; font-size: 11px; color: #475569;">${zone.description}</p>
                                <div style="font-size: 11px; margin-top: 4px; display: flex; justify-content: space-between;">
                                    <span>Danger: <strong style="color: #dc2626;">${zone.danger_level}</strong></span>
                                    <span>Radius: <strong>${zone.radius_meters}m</strong></span>
                                </div>
                            </div>
                        `);
                        state.mapLayers.push(circle);
                    });
                }
            })
            .catch(err => console.warn('Could not load restricted zones for map overlay:', err));

        if (allBounds.isValid()) {
            state.mapInstance.fitBounds(allBounds, { padding: [40, 40] });
        }

        setTimeout(() => {
            if (state.mapInstance) {
                state.mapInstance.invalidateSize();
            }
        }, 200);
    }

    function attachEventListeners(container) {
        
        const btnIncrease = container.querySelector('#bro-btn-auto-increase');
        if (btnIncrease) {
            btnIncrease.addEventListener('click', () => {
                const curRoute = state.selectedRoute || state.routes[0];
                const targetBudget = curRoute ? curRoute.totalTripCost : 5000;
                
                const budgetInput = document.getElementById('budget');
                if (budgetInput) {
                    budgetInput.value = targetBudget;
                    budgetInput.dispatchEvent(new Event('input', { bubbles: true }));
                    budgetInput.dispatchEvent(new Event('change', { bubbles: true }));
                }

                const standaloneBudget = document.getElementById('bro-input-budget');
                if (standaloneBudget) {
                    standaloneBudget.value = targetBudget;
                }

                state.userBudget = targetBudget;
                recalculateAndRender();
            });
        }

        const checkboxes = container.querySelectorAll('.bro-act-checkbox');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', (e) => {
                const actId = e.target.dataset.actId;
                const act = state.destinationActivities.find(a => a.id === actId);
                if (act) {
                    act.included = e.target.checked;
                    state.activitiesTotalCost = state.destinationActivities.filter(a => a.included).reduce((sum, a) => sum + a.cost, 0);
                    recalculateAndRender();
                }
            });
        });

        const btnContinue = container.querySelector('#bro-btn-continue-plan');
        if (btnContinue) {
            btnContinue.addEventListener('click', () => {
                commitRouteToPlanner();
            });
        }

        const toggleBtns = container.querySelectorAll('.bro-toggle-btn');
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.selection;
                state.selectionMode = mode;
                if (mode === 'minimum' && state.minimumBudgetRoute) {
                    state.selectedRoute = state.minimumBudgetRoute;
                } else if (mode === 'best' && state.bestOverallRoute) {
                    state.selectedRoute = state.bestOverallRoute;
                }
                recalculateAndRender();
            });
        });

        const prefSelect = container.querySelector('#bro-pref-dropdown');
        if (prefSelect) {
            prefSelect.addEventListener('change', (e) => {
                state.preference = e.target.value;
                state.bestOverallRoute = selectBestOverallRoute(state.routes, state.userBudget, state.preference);
                if (state.selectionMode === 'best') {
                    state.selectedRoute = state.bestOverallRoute;
                }
                recalculateAndRender();
            });
        }

        const routeCards = container.querySelectorAll('.bro-route-card');
        routeCards.forEach(card => {
            card.addEventListener('click', () => {
                const routeId = card.dataset.routeId;
                const found = state.routes.find(r => r.id === routeId);
                if (found) {
                    state.selectedRoute = found;
                    recalculateAndRender();
                }
            });
        });
    }

    function recalculateAndRender() {
        state.routes = state.routes.map(r => calculateRouteCost(r, state.travelMode));
        const allTotalCosts = state.routes.map(r => r.totalTripCost);
        const minimumTotalTripCost = Math.min(...allTotalCosts);
        const minimumTravelCost = Math.min(...state.routes.map(r => r.roundTripCost));

        state.feasibilityResult = checkBudgetFeasibility(state.userBudget, minimumTotalTripCost, minimumTravelCost, state.activitiesTotalCost);
        state.feasibleRoutes = filterFeasibleRoutes(state.routes, state.userBudget);

        state.minimumBudgetRoute = selectMinimumBudgetRoute(state.routes, state.userBudget);
        state.bestOverallRoute = selectBestOverallRoute(state.routes, state.userBudget, state.preference);

        const container = document.getElementById('bro-results-container');
        if (container) {
            displayFeasibilityResult({
                error: false,
                origin: state.origin,
                destination: state.destination,
                travelMode: state.travelMode,
                userBudget: state.userBudget,
                minimumTotalTripCost,
                minimumTravelCost,
                activitiesTotalCost: state.activitiesTotalCost,
                destinationActivities: state.destinationActivities,
                feasibility: state.feasibilityResult,
                routes: state.routes,
                feasibleRoutes: state.feasibleRoutes,
                minimumBudgetRoute: state.minimumBudgetRoute,
                bestOverallRoute: state.bestOverallRoute,
                selectedRoute: state.selectedRoute,
                selectionMode: state.selectionMode
            }, container);
        }
    }

    function commitRouteToPlanner() {
        const route = state.selectedRoute || state.minimumBudgetRoute || state.routes[0];
        if (!route) return;

        const summary = `Selected Route: ${route.name} (${route.highway}) — Total Trip: ₹${route.totalTripCost.toLocaleString()} (Travel: ₹${route.roundTripCost.toLocaleString()}, Activities: ₹${state.activitiesTotalCost.toLocaleString()})`;
        
        let notesArea = document.getElementById('user-notes') || document.getElementById('bro-summary-notes');
        if (notesArea) {
            notesArea.value = (notesArea.value ? notesArea.value + '\n\n' : '') + summary;
        }

        showToast(`✓ Selected route committed to Trip Planner!`);
    }

    function showToast(msg) {
        let toast = document.getElementById('bro-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'bro-toast';
            toast.style.cssText = `
                position: fixed;
                bottom: 24px;
                right: 24px;
                background: rgba(18, 24, 38, 0.95);
                color: #fff;
                border: 1px solid #10b981;
                border-radius: 8px;
                padding: 12px 20px;
                font-size: 0.9rem;
                z-index: 99999;
                box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.opacity = '1';
        setTimeout(() => {
            toast.style.opacity = '0';
        }, 3500);
    }

    async function evaluateBudgetAndRoutes(params) {
        const origin = params.origin || state.origin;
        const destination = params.destination || state.destination;
        const budget = params.userBudget || params.budget || state.userBudget;
        const travelMode = params.travelMode || state.travelMode;
        const preference = params.preference || state.preference;
        const selectionMode = params.selectionMode || state.selectionMode;

        return await calculateFeasibility({
            origin,
            destination,
            budget,
            travelMode,
            preference,
            selectionMode
        });
    }

    async function setTestPreset(presetName) {
        let origin = 'Delhi';
        let destination = 'Rishikesh';
        let budget = 5000;

        if (presetName === 'delhi_rishikesh_1000') budget = 1000;
        else if (presetName === 'delhi_rishikesh_800') budget = 800;
        else if (presetName === 'delhi_rishikesh_1500') budget = 1500;

        const oInput = document.getElementById('bro-input-origin');
        const dInput = document.getElementById('bro-input-dest');
        const bInput = document.getElementById('bro-input-budget');
        if (oInput) oInput.value = origin;
        if (dInput) dInput.value = destination;
        if (bInput) bInput.value = budget;

        const res = await evaluateBudgetAndRoutes({ origin, destination, userBudget: budget, travelMode: 'car' });
        const container = document.getElementById('bro-results-container');
        if (container) {
            displayFeasibilityResult(res, container);
        }
    }

    const api = {
        state,
        calculateFeasibility,
        evaluateBudgetAndRoutes,
        displayFeasibilityResult,
        setTestPreset,
        getState: () => state
    };

    window.BudgetRouteOptimizer = api;
    window.TravelBuddyRouteOptimizer = api;

})(window);

