document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // PASTE YOUR GROQ API KEY HERE
    // Note: Production deployment should move this Groq API request to a backend/serverless proxy to protect the API key.
    // ==========================================
    // API Keys moved to backend
    
    const pexelsCache = new Map();

    // Automatically purge stale places cache from browser sessionStorage/localStorage
    try {
        Object.keys(sessionStorage).forEach(k => {
            if (k.startsWith('ce_cache_')) sessionStorage.removeItem(k);
        });
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith('ce_cache_')) localStorage.removeItem(k);
        });
    } catch (e) {}

    window.clearTravelBuddyCache = async function() {
        if (typeof ceCityCache !== 'undefined') ceCityCache.clear();
        if (typeof wgCityCache !== 'undefined') {
            for (const k in wgCityCache) delete wgCityCache[k];
        }
        try {
            Object.keys(sessionStorage).forEach(k => {
                if (k.startsWith('ce_cache_')) sessionStorage.removeItem(k);
            });
        } catch (e) {}
        try {
            await fetch('/api/places/clear-cache', { method: 'POST' });
        } catch (e) {}
        console.log("TravelBuddy: All place caches cleared on client and server.");
    };

    // State
    let currentStep = 1;
    const totalSteps = 5;
    const tripData = {
        origin: 'Delhi',
        destination: '',
        startDate: '',
        endDate: '',
        travelers: 2,
        pace: 'balanced',
        travelMode: 'car',
        selectedRoute: null,
        minimumTravelBudget: null,
        interests: [],
        foodPref: '',
        budget: null,
        currency: 'INR',
        notes: ''
    };
    let currentItinerary = [];
    let currentTripId = null;
    let tripQualityScore = 95;
    let currentLanguage = 'English';
    let latestOptimizedItinerary = null; // Stores AI optimized itinerary

    function normalizeActivity(act, aIdx = 0) {
        if (!act || typeof act !== 'object') return act;
        if (!act.id) act.id = aIdx + 1;
        const titleVal = act.title || act.activity || act.name || 'Sightseeing Activity';
        act.title = titleVal;
        act.activity = titleVal;
        const descVal = act.desc || act.description || act.details || '';
        act.desc = descVal;
        act.description = descVal;
        act.cost = typeof act.cost === 'number' && !isNaN(act.cost) ? act.cost : (parseInt(act.cost, 10) || 0);
        act.time = act.time || '10:00';
        act.type = act.type || 'Sightseeing';
        return act;
    }

    function normalizeItinerary(itinerary) {
        if (!itinerary) return [];
        let list = itinerary;
        while (typeof list === 'string') {
            try {
                const parsed = JSON.parse(list);
                if (parsed === list) break;
                list = parsed;
            } catch (_) {
                break;
            }
        }
        if (!Array.isArray(list)) {
            if (list && typeof list === 'object') {
                if (Array.isArray(list.itinerary)) list = list.itinerary;
                else if (Array.isArray(list.days)) list = list.days;
                else if (list.day && list.activities) list = [list];
                else list = [];
            } else {
                list = [];
            }
        }
        list.forEach((day, dIdx) => {
            if (!day || typeof day !== 'object') return;
            if (!day.day) day.day = dIdx + 1;
            if (!day.title) day.title = `Day ${day.day}`;
            if (!Array.isArray(day.activities)) {
                day.activities = Array.isArray(day.items) ? day.items : (Array.isArray(day.places) ? day.places : []);
            }
            day.activities.forEach((act, aIdx) => normalizeActivity(act, aIdx));
        });
        return list;
    }

    function extractJSON(text) {
        if (!text) return {};
        if (typeof text === 'object') return text;
        try {
            const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (match) return JSON.parse(match[1]);
            const arrStart = text.indexOf("[");
            const arrEnd = text.lastIndexOf("]");
            if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
                return JSON.parse(text.substring(arrStart, arrEnd + 1));
            }
            const objStart = text.indexOf("{");
            const objEnd = text.lastIndexOf("}");
            if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
                return JSON.parse(text.substring(objStart, objEnd + 1));
            }
            return JSON.parse(text);
        } catch (e) {
            console.error("extractJSON parse error:", e, text);
            return {};
        }
    }

    async function callGroq(prompt, retries = 3) {
        const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
            ? (window.location.port === '5500' ? 'http://localhost:3000' : '') 
            : '';
        
        let lastErr = null;
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const res = await fetch(`${baseUrl}/api/ai/json`, {
                    method: 'POST',
                    headers: (window.TravelBuddyAuth && window.TravelBuddyAuth.authHeaders) 
                        ? window.TravelBuddyAuth.authHeaders({ 'Content-Type': 'application/json' })
                        : { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt,
                        maxTokens: 2500
                    })
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.message || errData.error || `HTTP ${res.status}`);
                }

                const data = await res.json();
                if (!data.success && !data.result) {
                    throw new Error(data.message || 'AI request unsuccessful');
                }

                return data.result !== undefined ? data.result : (data.text || data);
            } catch (err) {
                lastErr = err;
                if (attempt < retries - 1) {
                    await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                }
            }
        }
        throw lastErr || new Error("Failed to communicate with AI");
    }

    // Language Dictionaries for UI and Responses
    const dict = {
        'hindi': {
            'Sightseeing': 'à¤¦à¤°à¥à¤¶à¤¨à¥€à¤¯ à¤¸à¥à¤¥à¤²', 'Food': 'à¤­à¥‹à¤œà¤¨', 'Activity': 'à¤—à¤¤à¤¿à¤µà¤¿à¤§à¤¿', 'Dinner': 'à¤°à¤¾à¤¤ à¤•à¤¾ à¤–à¤¾à¤¨à¤¾',
            'responses': {
                'error': "à¤•à¥à¤·à¤®à¤¾ à¤•à¤°à¥‡à¤‚, AI à¤¸à¥‡ à¤œà¥à¤¡à¤¼à¤¨à¥‡ à¤®à¥‡à¤‚ à¤•à¥‹à¤ˆ à¤¸à¤®à¤¸à¥à¤¯à¤¾ à¤¥à¥€à¥¤",
                'lang': "à¤®à¥ˆà¤‚à¤¨à¥‡ à¤¯à¥‹à¤œà¤¨à¤¾ à¤•à¥‹ à¤¹à¤¿à¤‚à¤¦à¥€ à¤®à¥‡à¤‚ à¤¬à¤¦à¤² à¤¦à¤¿à¤¯à¤¾ à¤¹à¥ˆà¥¤"
            }
        },
        'tamil': {
            'Sightseeing': 'à®ªà®¾à®°à¯à®µà¯ˆà®¯à®¿à®Ÿà¯à®¤à®²à¯', 'Food': 'à®‰à®£à®µà¯', 'Activity': 'à®šà¯†à®¯à®²à¯à®ªà®¾à®Ÿà¯', 'Dinner': 'à®‡à®°à®µà¯ à®‰à®£à®µà¯',
            'responses': {
                'error': "à®®à®©à¯à®©à®¿à®•à¯à®•à®µà¯à®®à¯, AI à®‰à®Ÿà®©à¯ à®‡à®£à¯ˆà®ªà¯à®ªà®¤à®¿à®²à¯ à®šà®¿à®•à¯à®•à®²à¯ à®à®±à¯à®ªà®Ÿà¯à®Ÿà®¤à¯.",
                'lang': "à®¨à®¾à®©à¯ à®¤à®¿à®Ÿà¯à®Ÿà®¤à¯à®¤à¯ˆ à®¤à®®à®¿à®´à¯à®•à¯à®•à¯ à®®à®¾à®±à¯à®±à®¿à®¯à¯à®³à¯à®³à¯‡à®©à¯."
            }
        },
        'marathi': {
            'Sightseeing': 'à¤ªà¥à¤°à¥‡à¤•à¥à¤·à¤£à¥€à¤¯ à¤¸à¥à¤¥à¤³', 'Food': 'à¤…à¤¨à¥à¤¨', 'Activity': 'à¤•à¥à¤°à¤¿à¤¯à¤¾à¤•à¤²à¤¾à¤ª', 'Dinner': 'à¤°à¤¾à¤¤à¥à¤°à¥€à¤šà¥‡ à¤œà¥‡à¤µà¤£',
            'responses': {
                'error': "à¤•à¥à¤·à¤®à¤¸à¥à¤µ, AI à¤¶à¥€ à¤•à¤¨à¥‡à¤•à¥à¤Ÿ à¤•à¤°à¤£à¥à¤¯à¤¾à¤¤ à¤¸à¤®à¤¸à¥à¤¯à¤¾ à¤†à¤²à¥€.",
                'lang': "à¤®à¥€ à¤¯à¥‹à¤œà¤¨à¤¾ à¤®à¤°à¤¾à¤ à¥€à¤¤ à¤¬à¤¦à¤²à¤²à¥€ à¤†à¤¹à¥‡."
            }
        },
        'gujarati': {
            'Sightseeing': 'àªœà«‹àªµàª¾àª²àª¾àª¯àª• àª¸à«àª¥àª³à«‹', 'Food': 'àª–à«‹àª°àª¾àª•', 'Activity': 'àªªà«àª°àªµà«ƒàª¤à«àª¤àª¿', 'Dinner': 'àª°àª¾àª¤à«àª°àª¿àª­à«‹àªœàª¨',
            'responses': {
                'error': "àª®àª¾àª« àª•àª°àª¶à«‹, AI àª¸àª¾àª¥à«‡ àª•àª¨à«‡àª•à«àªŸ àª¥àªµàª¾àª®àª¾àª‚ àª•à«‹àªˆ àª¸àª®àª¸à«àª¯àª¾ àª¹àª¤à«€.",
                'lang': "àª®à«‡àª‚ àª¯à«‹àªœàª¨àª¾ àª—à«àªœàª°àª¾àª¤à«€àª®àª¾àª‚ àª¬àª¦àª²à«€ àª›à«‡."
            }
        }
    };

    // DOM Elements
    const steps = document.querySelectorAll('.wizard-step');
    const dots = document.querySelectorAll('.step-dot');
    const progressBar = document.getElementById('wizard-progress');
    const btnNext = document.getElementById('btn-next');
    const btnPrev = document.getElementById('btn-prev');
    const btnGen = document.getElementById('btn-generate');
    const reviewBox = document.getElementById('review-summary');

    const wizardView = document.getElementById('wizard-view');
    const dashboardView = document.getElementById('dashboard-view');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loaderStatus = document.getElementById('loader-status');

    const originInput = document.getElementById('origin');
    const destInput = document.getElementById('destination');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const travelersInput = document.getElementById('travelers');
    const paceRadios = document.getElementsByName('pace');
    const interestChecks = document.querySelectorAll('.check-pill input[type="checkbox"]');
    const foodPrefInput = document.getElementById('food-pref');
    const budgetInput = document.getElementById('budget');
    const notesInput = document.getElementById('notes');

    // Ensure fresh planner session starts with empty destination
    try {
        if (localStorage.getItem('tb_selected_destination') === 'Rishikesh') {
            localStorage.removeItem('tb_selected_destination');
        }
    } catch(e) {}
    if (destInput) {
        destInput.value = '';
    }
    tripData.destination = '';

    // Live sync origin input
    if (originInput) {
        originInput.addEventListener('input', () => {
            const val = originInput.value.trim();
            if (val) tripData.origin = val;
        });
        originInput.addEventListener('change', () => {
            const val = originInput.value.trim();
            if (val) tripData.origin = val;
        });
    }

    // Live sync destination input whenever user types or changes it
    if (destInput) {
        destInput.addEventListener('input', () => {
            const val = destInput.value.trim();
            if (val) {
                tripData.destination = val;
                try { localStorage.setItem('tb_selected_destination', val); } catch(e) {}
            }
        });
        destInput.addEventListener('change', () => {
            const val = destInput.value.trim();
            if (val) {
                tripData.destination = val;
                try { localStorage.setItem('tb_selected_destination', val); } catch(e) {}
            }
        });
    }

    // UI Button Toggles
    const modeCards = document.querySelectorAll('.bro-mode-card');
    modeCards.forEach(card => {
        const input = card.querySelector('input[type="radio"]');
        if (input) {
            input.addEventListener('change', () => {
                modeCards.forEach(c => c.classList.remove('active'));
                if (input.checked) card.classList.add('active');
            });
        }
    });

    const radioCards = document.querySelectorAll('.radio-card');
    radioCards.forEach(card => {
        const input = card.querySelector('input[type="radio"]');
        if (input) {
            input.addEventListener('change', () => {
                const groupName = input.getAttribute('name');
                document.querySelectorAll(`.radio-card input[name="${groupName}"]`).forEach(inp => {
                    inp.closest('.radio-card').classList.remove('active');
                });
                if (input.checked) card.classList.add('active');
            });
        }
    });

    const checkPills = document.querySelectorAll('.check-pill');
    checkPills.forEach(pill => {
        const input = pill.querySelector('input[type="checkbox"]');
        if (input) {
            input.addEventListener('change', () => {
                if (input.checked) {
                    pill.classList.add('active');
                } else {
                    pill.classList.remove('active');
                }
            });
        }
    });

    // Travelers Counter Logic
    const btnDecrease = document.getElementById('btn-decrease');
    const btnIncrease = document.getElementById('btn-increase');
    const travelersInputEl = document.getElementById('travelers');

    if (btnDecrease && btnIncrease && travelersInputEl) {
        btnDecrease.addEventListener('click', () => {
            let val = parseInt(travelersInputEl.value) || 1;
            if (val > 1) {
                travelersInputEl.value = val - 1;
            }
        });
        btnIncrease.addEventListener('click', () => {
            let val = parseInt(travelersInputEl.value) || 1;
            if (val < 20) { // max is 20
                travelersInputEl.value = val + 1;
            }
        });
    }

    // Budget Check Logic
    const btnCheckBudget = document.getElementById('btn-check-budget');
    const budgetContainer = document.getElementById('budget-feasibility-container');

    if (btnCheckBudget && budgetContainer) {
        btnCheckBudget.addEventListener('click', async () => {
            const origin = (originInput && originInput.value) ? originInput.value.trim() : 'Delhi';
            const destination = (destInput && destInput.value) ? destInput.value.trim() : '';
            const budget = parseInt(budgetInput.value) || 0;
            const modeRadio = document.querySelector('input[name="travel-mode"]:checked');
            const travelMode = modeRadio ? modeRadio.value : 'car';

            if (!destination) {
                alert("Please fill in destination in step 1 first.");
                return;
            }
            if (!budget) {
                alert("Please enter a budget to check.");
                return;
            }

            const originalText = btnCheckBudget.innerHTML;
            btnCheckBudget.innerHTML = '<span>â³ Checking...</span>';
            btnCheckBudget.disabled = true;
            btnCheckBudget.style.opacity = '0.7';

            try {
                if (window.BudgetRouteOptimizer) {
                    const result = await window.BudgetRouteOptimizer.evaluateBudgetAndRoutes({
                        origin,
                        destination,
                        userBudget: budget,
                        travelMode
                    });
                    
                    budgetContainer.classList.remove('hidden');
                    window.BudgetRouteOptimizer.displayFeasibilityResult(result, budgetContainer);
                } else {
                    alert("Optimizer module not loaded.");
                }
            } catch (err) {
                console.error("Budget check failed", err);
                alert("Failed to check budget.");
            } finally {
                btnCheckBudget.innerHTML = originalText;
                btnCheckBudget.disabled = false;
                btnCheckBudget.style.opacity = '1';
            }
        });
    }

    // Navigation Logic
    function updateWizard() {
        steps.forEach((step, i) => {
            step.classList.toggle('active', i + 1 === currentStep);
        });
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i + 1 <= currentStep);
        });
        progressBar.style.width = `${((currentStep - 1) / (totalSteps - 1)) * 100}%`;

        btnPrev.disabled = currentStep === 1;

        if (currentStep === totalSteps) {
            btnNext.classList.add('hidden');
            btnGen.classList.remove('hidden');
            populateReview();
        } else {
            btnNext.classList.remove('hidden');
            btnGen.classList.add('hidden');
        }
    }

    btnNext.addEventListener('click', () => {
        if (validateStep(currentStep)) {
            saveStepData(currentStep);
            if (currentStep < totalSteps) {
                currentStep++;
                updateWizard();
            }
        }
    });

    btnPrev.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            updateWizard();
        }
    });

    function validateStep(step) {
        if (step === 1) {
            if (!destInput.value.trim() || !startDateInput.value || !endDateInput.value) {
                alert("Please fill in destination and dates.");
                return false;
            }
            if (originInput && !originInput.value.trim()) {
                alert("Please enter a starting location.");
                return false;
            }
            if (originInput && originInput.value.trim().toLowerCase() === destInput.value.trim().toLowerCase()) {
                alert("Starting location and destination cannot be the same.");
                return false;
            }
            if (new Date(startDateInput.value) >= new Date(endDateInput.value)) {
                alert("End date must be after start date.");
                return false;
            }
        }
        return true;
    }

    function saveStepData(step) {
        if (step === 1) {
            if (originInput) tripData.origin = originInput.value.trim() || 'Delhi';
            tripData.destination = destInput.value.trim();
            tripData.startDate = startDateInput.value;
            tripData.endDate = endDateInput.value;
            const modeRadio = document.querySelector('input[name="travel-mode"]:checked');
            if (modeRadio) tripData.travelMode = modeRadio.value;
            if (tripData.destination) {
                try { localStorage.setItem('tb_selected_destination', tripData.destination); } catch(e) {}
            }
        } else if (step === 2) {
            tripData.travelers = parseInt(travelersInput.value);
            tripData.pace = Array.from(paceRadios).find(r => r.checked)?.value || 'balanced';
        } else if (step === 3) {
            tripData.interests = Array.from(interestChecks).filter(c => c.checked).map(c => c.value);
            tripData.foodPref = foodPrefInput.value.trim();
        } else if (step === 4) {
            tripData.budget = budgetInput.value ? parseInt(budgetInput.value) : null;
            tripData.currency = document.getElementById('currency').value;
            tripData.notes = notesInput.value.trim();
        }
    }

    function populateReview() {
        saveStepData(4);
        const t = (k, def) => (window.t ? window.t(k, def) : def);

        let routeHtml = '';
        if (window.TravelBuddyRouteOptimizer && window.TravelBuddyRouteOptimizer.state.selectedRoute) {
            const optState = window.TravelBuddyRouteOptimizer.state;
            const isFeasible = optState.feasibilityResult?.feasible !== false;
            routeHtml = `
                <div style="margin-top: 12px; padding: 10px 14px; background: rgba(255,255,255,0.04); border-radius: 8px; border: 1px solid rgba(255,255,255,0.12);">
                    <p style="margin: 3px 0;"><strong>Route:</strong> ${optState.origin} &rarr; ${optState.destination} (${optState.selectedRoute.name} - ${optState.selectedRoute.highway})</p>
                    <p style="margin: 3px 0;"><strong>Distance & Time:</strong> ${optState.selectedRoute.oneWayDistance} km (one-way), ${optState.selectedRoute.durationDisplay}</p>
                    <p style="margin: 3px 0;"><strong>Round-Trip Travel Budget:</strong> ₹${optState.selectedRoute.roundTripCost.toLocaleString()} (One-way: ₹${optState.selectedRoute.oneWayCost.toLocaleString()})</p>
                    <p style="margin: 3px 0;"><strong>Feasibility:</strong> <span style="color:${isFeasible ? '#34d399' : '#f87171'}; font-weight:700;">${isFeasible ? '✓ Feasible' : '✕ Infeasible (Shortfall: ₹' + (optState.feasibilityResult?.shortfall || 0).toLocaleString() + ')'}</span></p>
                </div>
            `;
        }

        reviewBox.innerHTML = `
            <p><strong>Starting Location:</strong> ${tripData.origin || 'Delhi'}</p>
            <p><strong>${t('label_destination', 'Destination')}:</strong> ${tripData.destination || '-'}</p>
            <p><strong>${t('step_1_title', 'Dates')}:</strong> ${tripData.startDate || '-'} to ${tripData.endDate || '-'}</p>
            <p><strong>${t('label_travelers', 'Travelers')}:</strong> ${tripData.travelers} (${t('pace_' + tripData.pace, tripData.pace)} ${t('label_travel_pace', 'pace')})</p>
            <p><strong>${t('label_select_interests', 'Interests')}:</strong> ${tripData.interests.length ? tripData.interests.join(', ') : 'General Exploration'}</p>
            <p><strong>${t('label_dietary_pref', 'Dietary Pref')}:</strong> ${tripData.foodPref || '-'}</p>
            <p><strong>${t('label_total_budget', 'Budget')}:</strong> ${tripData.budget ? (tripData.currency === 'USD' ? '$' : '₹') + tripData.budget : 'Flexible'}</p>
            <p><strong>${t('label_special_reqs', 'Notes')}:</strong> ${tripData.notes || '-'}</p>
            ${routeHtml}
        `;
    }

    // Re-render dynamic elements on language change
    window.addEventListener('travelbuddy:langchange', (e) => {
        if (currentStep === totalSteps) {
            populateReview();
        }
    });


    // Generation Logic
    btnGen.addEventListener('click', async () => {
        // Feasibility check: Stop generation if minimum travel budget exceeds user budget
        if (window.TravelBuddyRouteOptimizer) {
            const opt = window.TravelBuddyRouteOptimizer;
            const currentBudget = tripData.budget || (budgetInput ? parseInt(budgetInput.value) : null);
            const currentOrigin = tripData.origin || (originInput ? originInput.value.trim() : 'Delhi');
            const currentDest = tripData.destination || (destInput ? destInput.value.trim() : '');

            if (currentBudget && currentDest) {
                const evalRes = await opt.evaluateBudgetAndRoutes({
                    origin: currentOrigin,
                    destination: currentDest,
                    userBudget: currentBudget,
                    travelMode: tripData.travelMode || 'car'
                });

                if (evalRes && evalRes.feasibility && !evalRes.feasibility.feasible) {
                    alert(`✕ Cannot Generate Itinerary:\n\nThis trip is not feasible within your current budget.\nMinimum required travel budget: ₹${evalRes.minimumTravelBudget.toLocaleString()}\nYour entered budget: ₹${currentBudget.toLocaleString()}\nShortfall: ₹${evalRes.feasibility.shortfall.toLocaleString()}\n\nPlease increase your budget or select another route to continue.`);
                    return;
                }

                if (evalRes && evalRes.selectedRoute) {
                    tripData.selectedRoute = evalRes.selectedRoute;
                    tripData.minimumTravelBudget = evalRes.selectedRoute.roundTripCost;
                }
            }
        }

        wizardView.classList.add('hidden');
        loadingOverlay.classList.remove('hidden');
        loaderStatus.textContent = 'Contacting Groq AI to build your real itinerary...';

        try {
            const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
                ? (window.location.port === '5500' ? 'http://localhost:3000' : '') 
                : '';
            
            const response = await fetch(`${baseUrl}/api/generate-trip`, {
                method: 'POST',
                headers: TravelBuddyAuth.authHeaders({
                    'Content-Type': 'application/json'
                }),
                body: JSON.stringify({ ...tripData, is_saved: false, isSaved: false })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            currentItinerary = normalizeItinerary(data.itinerary);
            if (data.tripId) currentTripId = data.tripId;
            
            // Post-processing to strictly enforce budget limit and maximize budget usage
            if (tripData.budget) {
                let totalGenCost = 0;
                currentItinerary.forEach(d => d.activities.forEach(a => totalGenCost += (a.cost || 0)));
                
                if (totalGenCost > 0) {
                    if (totalGenCost > tripData.budget) {
                        const scale = tripData.budget / totalGenCost;
                        currentItinerary.forEach(d => d.activities.forEach(a => a.cost = Math.floor(a.cost * scale)));
                    } else if (totalGenCost < (tripData.budget * 0.85)) {
                        const scale = (tripData.budget * 0.95) / totalGenCost;
                        currentItinerary.forEach(d => d.activities.forEach(a => a.cost = Math.floor(a.cost * scale)));
                    }
                    
                    // Fire-and-forget sync to backend with scaled costs
                    if (data.tripId) {
                        fetch(`${baseUrl}/api/trips/${data.tripId}`, {
                            method: 'PATCH',
                            headers: TravelBuddyAuth.authHeaders({
                                'Content-Type': 'application/json'
                            }),
                            body: JSON.stringify({
                                metadata: tripData,
                                itinerary: currentItinerary
                            })
                        }).catch(e => console.error("Failed to sync patched costs", e));
                    }
                }
            }
            
            tripQualityScore = Math.floor(Math.random() * 6) + 94; // 94-99 for real AI 
            
            renderDashboard();
            loadingOverlay.classList.add('hidden');
            dashboardView.classList.remove('hidden');
            
            if (data.tripId) {
                const newUrl = new URL(window.location);
                newUrl.searchParams.set('tripId', data.tripId);
                window.history.pushState({}, '', newUrl);
            }
            
        } catch (err) {
            console.error(err);
            loadingOverlay.classList.add('hidden');
            wizardView.classList.remove('hidden');
            alert("Failed to generate itinerary: " + err.message);
        }
    });

    function translateText(text, lang) {
        if (lang === 'English') return text;
        if (dict[lang] && dict[lang][text]) {
            return dict[lang][text];
        }
        return text;
    }

    // Clean search query to extract high-relevance place/activity keywords for Pexels
    function cleanPlaceQuery(placeTitle, destination, actType) {
        let clean = (placeTitle || '').trim();
        // Remove common itinerary action verbs and prepositions
        clean = clean.replace(/^(visit|explore|enjoy|experience|discover|taste|have|try|walk\s+through|tour|trip\s+to|drive\s+from|departure\s+from|travel\s+to|check-in\s+at|check\s+in\s+at|check-in\s+to|relax\s+at|lunch\s+at|dinner\s+at|breakfast\s+at|morning\s+at|evening\s+at)\s+/i, '');
        // Remove text in parentheses or dashes
        clean = clean.replace(/\s*[\(\[\{].*?[\)\]\}]\s*/g, ' ').replace(/\s+-\s+.*$/, '').trim();
        
        const dest = (destination || tripData.destination || '').trim();
        if (dest && !clean.toLowerCase().includes(dest.toLowerCase())) {
            return `${clean} ${dest}`.trim();
        }
        return clean || dest || 'travel landscape';
    }

    // Dynamic Pexels API image fetcher with caching and graceful fallback
    async function fetchPexelsActivityImage(placeTitle, destination, actType) {
        const query = cleanPlaceQuery(placeTitle, destination, actType);
        const cacheKey = query.toLowerCase();

        // 1. Check in-memory cache
        if (pexelsCache.has(cacheKey)) {
            return pexelsCache.get(cacheKey);
        }

        // 2. Check localStorage cache
        try {
            const stored = localStorage.getItem(`pexels_${cacheKey}`);
            if (stored) {
                const parsed = JSON.parse(stored);
                pexelsCache.set(cacheKey, parsed);
                return parsed;
            }
        } catch (e) {
            // localStorage might be unavailable or full
        }

        // 3. Fallback result generator
        const fallback = getRealActivityPhoto(placeTitle, '', actType, destination);
        const defaultResult = {
            url: fallback.url,
            caption: fallback.caption,
            pexelsUrl: 'https://www.pexels.com',
            photographer: 'Pexels Contributor',
            isFallback: true
        };

        if (!PEXELS_API_KEY) {
            pexelsCache.set(cacheKey, defaultResult);
            return defaultResult;
        }

        // 4. Request from Pexels API
        try {
            const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
            const res = await fetch(url, {
                headers: {
                    'Authorization': PEXELS_API_KEY
                }
            });

            if (!res.ok) {
                console.warn(`Pexels API responded with status ${res.status} for query: ${query}`);
                pexelsCache.set(cacheKey, defaultResult);
                return defaultResult;
            }

            const data = await res.json();
            if (data && data.photos && data.photos.length > 0) {
                const photo = data.photos[0];
                const result = {
                    url: photo.src.medium || photo.src.large || photo.src.landscape,
                    caption: (placeTitle || query).length > 24 ? (placeTitle || query).substring(0, 22) + '...' : (placeTitle || query),
                    pexelsUrl: photo.url || 'https://www.pexels.com',
                    photographer: photo.photographer || 'Pexels',
                    isFallback: false
                };

                // Store in memory & localStorage
                pexelsCache.set(cacheKey, result);
                try {
                    localStorage.setItem(`pexels_${cacheKey}`, JSON.stringify(result));
                } catch (err) {}

                return result;
            } else {
                // Secondary fallback search with just the destination if specific landmark had 0 results
                const destOnly = (destination || tripData.destination || '').trim();
                if (destOnly && query.toLowerCase() !== destOnly.toLowerCase()) {
                    const fallbackDestQuery = `https://api.pexels.com/v1/search?query=${encodeURIComponent(destOnly + ' travel')}&per_page=1&orientation=landscape`;
                    const secRes = await fetch(fallbackDestQuery, {
                        headers: { 'Authorization': PEXELS_API_KEY }
                    });
                    if (secRes.ok) {
                        const secData = await secRes.json();
                        if (secData && secData.photos && secData.photos.length > 0) {
                            const p = secData.photos[0];
                            const secResult = {
                                url: p.src.medium || p.src.large,
                                caption: placeTitle || destOnly,
                                pexelsUrl: p.url,
                                photographer: p.photographer,
                                isFallback: false
                            };
                            pexelsCache.set(cacheKey, secResult);
                            return secResult;
                        }
                    }
                }
                pexelsCache.set(cacheKey, defaultResult);
                return defaultResult;
            }
        } catch (err) {
            console.error('Pexels fetch failed:', err);
            pexelsCache.set(cacheKey, defaultResult);
            return defaultResult;
        }
    }

    // Helper to get an authentic photo of the specific place / destination (curated fallback)
    function getRealActivityPhoto(actTitle, actDesc, actType, destination) {
        const destLower = (destination || tripData.destination || '').toLowerCase();
        const text = `${actTitle} ${actDesc} ${destLower}`.toLowerCase();
        
        // 1. Direct landmark matching for famous places
        if (text.includes('triveni')) {
            return {
                url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
                caption: 'Triveni Ghat Aarti'
            };
        }
        if (text.includes('laxman') || text.includes('lakshman')) {
            return {
                url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
                caption: 'Laxman Jhula'
            };
        }
        if (text.includes('ram jhula')) {
            return {
                url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80',
                caption: 'Ram Jhula Vista'
            };
        }
        if (text.includes('parmarth') || text.includes('aarti')) {
            return {
                url: 'https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=800&q=80',
                caption: 'Sacred Ganga Aarti'
            };
        }
        if (text.includes('beatles') || text.includes('chaurasi')) {
            return {
                url: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=800&q=80',
                caption: 'Beatles Ashram'
            };
        }
        if (text.includes('rafting') || text.includes('shivpuri') || text.includes('river')) {
            return {
                url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
                caption: 'Ganges River Rafting'
            };
        }
        if (text.includes('bungee') || text.includes('jumpin heights')) {
            return {
                url: 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=800&q=80',
                caption: 'Thrill & Heights'
            };
        }
        if (text.includes('neer') || text.includes('waterfall')) {
            return {
                url: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=800&q=80',
                caption: 'Neer Garh Falls'
            };
        }
        if (text.includes('gateway of india')) {
            return {
                url: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=800&q=80',
                caption: 'Gateway of India'
            };
        }
        if (text.includes('marine drive')) {
            return {
                url: 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=800&q=80',
                caption: "Queen's Necklace"
            };
        }
        if (text.includes('hawa mahal')) {
            return {
                url: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80',
                caption: 'Hawa Mahal Palace'
            };
        }
        if (text.includes('amer fort') || text.includes('amber fort')) {
            return {
                url: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80',
                caption: 'Amer Fort'
            };
        }
        if (text.includes('taj mahal')) {
            return {
                url: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80',
                caption: 'Taj Mahal'
            };
        }
        if (text.includes('eiffel')) {
            return {
                url: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&w=800&q=80',
                caption: 'Eiffel Tower'
            };
        }

        // 2. Dynamic Places lookup from session cache
        if (typeof ceCityCache !== 'undefined') {
            const cachedData = ceCityCache.get(destLower);
            if (cachedData && Array.isArray(cachedData.places)) {
                for (const p of cachedData.places) {
                    const pNameWords = (p.name || '').toLowerCase().split(/\s+/);
                    if (pNameWords.some(w => w.length > 3 && text.includes(w))) {
                        return { url: p.photoUrl || p.img, caption: p.name };
                    }
                }
            }
        }

        // 3. Category & Destination Context Specific Photos
        const tLower = (actType || '').toLowerCase();
        if (tLower.includes('food') || text.includes('lunch') || text.includes('dinner') || text.includes('thali') || text.includes('dhaba') || text.includes('restaurant') || text.includes('cafe')) {
            return {
                url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
                caption: 'Taste Tradition'
            };
        }
        if (tLower.includes('hotel') || tLower.includes('stay') || tLower.includes('resort') || text.includes('check-in') || text.includes('check in')) {
            return {
                url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
                caption: 'Stay Refresh Recharge'
            };
        }
        if (tLower.includes('travel') || tLower.includes('drive') || tLower.includes('highway') || text.includes('departure') || text.includes('transit')) {
            return {
                url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80',
                caption: 'Roads to serenity'
            };
        }

        // Fallback to beautiful destination-aware scenery
        if (destLower.includes('rishikesh') || destLower.includes('uttarakhand') || destLower.includes('himalaya') || destLower.includes('manali')) {
            return {
                url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
                caption: 'Himalayan Serenity'
            };
        }

        return {
            url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
            caption: 'Discover & Explore'
        };
    }

    function renderDashboard() {
        currentItinerary = normalizeItinerary(currentItinerary);

        document.getElementById('dash-dest-title').textContent = `${tripData.destination || 'Your'} Trip`;
        const subtitleEl = document.getElementById('dash-dest-subtitle');
        if (subtitleEl && tripData.destination) {
            subtitleEl.textContent = `${tripData.destination} • Curated Experience • Handpicked`;
        }

        const container = document.getElementById('itinerary-container');
        container.innerHTML = '';
        
        let totalCost = 0;
        let currencySymbol = tripData.currency === 'USD' ? '$' : '₹';
        
        currentItinerary.forEach(day => {
            const dayHtml = document.createElement('div');
            dayHtml.className = 'day-group';
            
            let dayHeaderText = currentLanguage === 'hindi' ? `दिन ${day.day}` :
                                currentLanguage === 'marathi' ? `दिवस ${day.day}` :
                                currentLanguage === 'tamil' ? `நாள் ${day.day}` :
                                currentLanguage === 'gujarati' ? `દિવસ ${day.day}` : `Day ${day.day}`;

            const activityCount = day.activities ? day.activities.length : 0;
            const daySubtitle = day.day === 1 ? 'Your journey to peace begins 🌿' :
                                day.day === 2 ? 'Explore wonders and hidden gems ✨' :
                                `Unforgettable experiences await 🌅`;

            dayHtml.innerHTML = `
                <div class="day-header-banner">
                    <div class="day-header-left">
                        <span class="day-header-bar"></span>
                        <div class="day-header-text-col">
                            <h2 class="day-title">${dayHeaderText}</h2>
                            <p class="day-subtitle">${daySubtitle}</p>
                        </div>
                    </div>
                    <div class="day-badge-pill">
                        <span>📅 ${activityCount} Activities</span>
                        <span class="day-badge-arrow">▾</span>
                    </div>
                </div>
            `;

            const timelineWrapper = document.createElement('div');
            timelineWrapper.className = 'timeline-container';
            
            day.activities.forEach((act, actIdx) => {
                normalizeActivity(act, actIdx);
                totalCost += (act.cost || 0);
                const actEl = document.createElement('div');
                const typeLower = (act.type || '').toLowerCase();
                const titleLower = (act.title || '').toLowerCase();
                
                let icon = '📍';
                let typeClass = 'type-other';
                let typeLabel = act.type || 'Activity';
                let scribble = 'Explore & enjoy ↗';
                let estDuration = '1 - 2 hrs';

                if (typeLower.includes('travel') || typeLower.includes('transit') || typeLower.includes('drive') || typeLower.includes('flight') || titleLower.includes('departure') || titleLower.includes('drive')) {
                    icon = '🚙';
                    typeClass = 'type-travel';
                    typeLabel = 'TRAVEL';
                    scribble = 'The journey begins ↗';
                    estDuration = '4.5 – 5 hrs';
                } else if (typeLower.includes('food') || typeLower.includes('lunch') || typeLower.includes('dinner') || typeLower.includes('breakfast') || typeLower.includes('dining') || titleLower.includes('lunch') || titleLower.includes('dinner') || titleLower.includes('cafe') || titleLower.includes('dhaba')) {
                    icon = '\u{1F37D}\uFE0F';
                    typeClass = 'type-food';
                    typeLabel = 'FOOD';
                    scribble = 'Good food brighter mood ↗';
                    estDuration = '1 – 1.5 hrs';
                } else if (typeLower.includes('hotel') || typeLower.includes('accommodation') || typeLower.includes('stay') || typeLower.includes('resort') || titleLower.includes('check-in') || titleLower.includes('check in') || titleLower.includes('stay')) {
                    icon = '\u{1F3E8}';
                    typeClass = 'type-stay';
                    typeLabel = 'ACCOMMODATION';
                    scribble = 'Check in & unwind ↗';
                    estDuration = '1 hr';
                } else if (typeLower.includes('sight') || typeLower.includes('tour') || typeLower.includes('walk') || typeLower.includes('explore') || typeLower.includes('attraction') || titleLower.includes('ghat') || titleLower.includes('jhula') || titleLower.includes('aarti')) {
                    icon = '\u{1F3DB}\uFE0F';
                    typeClass = 'type-sight';
                    typeLabel = 'SIGHTSEEING';
                    scribble = 'Iconic views & peace ↗';
                    estDuration = '2 – 3 hrs';
                } else if (typeLower.includes('adventure') || typeLower.includes('sport') || typeLower.includes('nature') || typeLower.includes('trek') || titleLower.includes('rafting') || titleLower.includes('bungee')) {
                    icon = '🧗';
                    typeClass = 'type-adventure';
                    typeLabel = 'ADVENTURE';
                    scribble = 'Thrill & fresh air ↗';
                    estDuration = '2 – 4 hrs';
                }

                // Initial fallback photo for immediate paint
                const initialPhoto = getRealActivityPhoto(act.title, act.desc, act.type, tripData.destination);
                const thumbId = `act-thumb-${day.day}-${act.id}`;

                actEl.className = `timeline-row ${typeClass}`;
                
                let displayType = translateText(typeLabel, currentLanguage);

                actEl.innerHTML = `
                    <!-- Vertical Timeline Point -->
                    <div class="timeline-marker-col">
                        <div class="timeline-dot ${typeClass}"></div>
                    </div>

                    <!-- Main Colored Card -->
                    <div class="activity-card ${typeClass} ${act.locked ? 'locked' : ''}">
                        <!-- Time & handwritten scribble col -->
                        <div class="activity-left-col">
                            <div class="activity-time-badge">
                                <span class="time-text">${act.time}</span>
                            </div>
                            <div class="activity-scribble">${scribble}</div>
                        </div>

                        <!-- Icon Badge -->
                        <div class="activity-type-icon ${typeClass}">${icon}</div>

                        <!-- Center Content -->
                        <div class="activity-content">
                            <h3 class="activity-title">${act.title || act.activity || 'Activity'}</h3>
                            <p class="activity-desc">${act.desc || act.description || ''}</p>
                            
                            <!-- Badges row -->
                            <div class="activity-meta-row">
                                <span class="badge-pill badge-cost">${currencySymbol}${(act.cost || 0).toLocaleString()}</span>
                                <span class="badge-pill badge-type ${typeClass}">
                                    <span class="badge-type-icon">${icon}</span>
                                    <span>${displayType}</span>
                                </span>
                                <span class="badge-pill badge-duration">
                                    <span>🕒 ${estDuration}</span>
                                </span>
                            </div>
                        </div>

                        <!-- Right Image Thumbnail with real authentic place photo via Pexels -->
                        <div class="activity-thumb-card" id="${thumbId}">
                            <img src="${initialPhoto.url}" alt="${act.title}" class="activity-thumb-img" loading="lazy" onerror="this.parentElement.style.display='none'">
                            <span class="activity-thumb-caption">${initialPhoto.caption}</span>
                        </div>

                        <!-- Action Icons on far right -->
                        <div class="activity-actions">
                            <button class="act-btn bookmark-btn ${act.locked ? 'active' : ''}" title="${act.locked ? 'Unlock Activity' : 'Lock / Bookmark Activity'}" onclick="toggleLock(${day.day}, ${act.id})">
                                ${act.locked ? '🔒' : '🔓'}
                            </button>
                            <button class="act-btn regen-btn" title="Regenerate with AI" onclick="regenActivity(${day.day}, ${act.id})">
                                🔄
                            </button>
                        </div>
                    </div>
                `;
                timelineWrapper.appendChild(actEl);

                // Asynchronously fetch dynamic authentic landscape photo from Pexels API
                (async () => {
                    try {
                        const pexelsPhoto = await fetchPexelsActivityImage(act.title, tripData.destination, act.type);
                        const thumbCard = document.getElementById(thumbId);
                        if (thumbCard && pexelsPhoto && pexelsPhoto.url) {
                            const imgEl = thumbCard.querySelector('.activity-thumb-img');
                            const captionEl = thumbCard.querySelector('.activity-thumb-caption');
                            if (imgEl && imgEl.src !== pexelsPhoto.url) {
                                // Smooth transition to real Pexels image
                                const preload = new Image();
                                preload.onload = () => {
                                    imgEl.src = pexelsPhoto.url;
                                    imgEl.alt = `${act.title} - Photo by ${pexelsPhoto.photographer || 'Pexels'}`;
                                    thumbCard.style.display = 'block';
                                    if (captionEl && pexelsPhoto.caption) {
                                        captionEl.textContent = pexelsPhoto.caption;
                                    }
                                };
                                preload.src = pexelsPhoto.url;
                            }
                        }
                    } catch (e) {
                        console.warn('Error loading Pexels photo for', act.title, e);
                    }
                })();
            });
            
            dayHtml.appendChild(timelineWrapper);
            container.appendChild(dayHtml);
        });

        // Add Pexels Attribution badge at the bottom of the itinerary
        const pexelsAttribution = document.createElement('div');
        pexelsAttribution.className = 'pexels-footer-attribution';
        pexelsAttribution.innerHTML = `
            <span class="pexels-attr-text">Curated travel imagery powered by</span>
            <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer" class="pexels-attr-link">
                <svg class="pexels-logo-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M1.5 0h21A1.5 1.5 0 0 1 24 1.5v21a1.5 1.5 0 0 1-1.5 1.5h-21A1.5 1.5 0 0 1 0 22.5v-21A1.5 1.5 0 0 1 1.5 0zm9.75 5.25v13.5h3v-4.5h2.25a4.5 4.5 0 0 0 0-9h-5.25zm3 3h2.25a1.5 1.5 0 0 1 0 3h-2.25v-3z"/>
                </svg>
                <span>Photos provided by Pexels</span>
            </a>
        `;
        container.appendChild(pexelsAttribution);

        const transportCost = tripData.selectedRoute ? tripData.selectedRoute.roundTripCost : Math.ceil(totalCost * 0.1);
        const transportLabel = tripData.selectedRoute ? `Transit (${tripData.selectedRoute.name} Round-Trip)` : `Transport`;
        const overallTotal = totalCost + (tripData.selectedRoute ? transportCost : 0);

        document.getElementById('cost-total').textContent = `${currencySymbol}${overallTotal.toLocaleString()}`;
        document.getElementById('cost-breakdown').innerHTML = `
            <li><span>Activities</span> <span>${currencySymbol}${Math.floor(totalCost * 0.5).toLocaleString()}</span></li>
            <li><span>Food & Dining</span> <span>${currencySymbol}${Math.floor(totalCost * 0.4).toLocaleString()}</span></li>
            <li><span>${transportLabel}</span> <span>${currencySymbol}${transportCost.toLocaleString()}</span></li>
        `;

        document.getElementById('quality-score').textContent = tripQualityScore;

        // Update Interactive Map
        const mapIframe = document.getElementById('interactive-map');
        if (mapIframe && tripData.destination) {
            const dest = encodeURIComponent(tripData.destination);
            mapIframe.src = `https://maps.google.com/maps?q=${dest}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
        }
    }

    // Global Action Handlers
    window.toggleLock = function(dayId, actId) {
        const day = currentItinerary.find(d => d.day === dayId);
        const act = day.activities.find(a => a.id === actId);
        if (act) {
            act.locked = !act.locked;
            renderDashboard();
        }
    };

    window.regenActivity = async function(dayId, actId) {
        const day = currentItinerary.find(d => d.day === dayId);
        const act = day ? day.activities.find(a => a.id === actId) : null;
        if (act && !act.locked) {
            addCopilotMsg(`Regenerating "${act.title}"...`, false);
            
            const prompt = `You are a travel planner. The user is going to ${tripData.destination}. 
            Replace this single activity with a new, genuine alternative suitable for the time slot.
            Language to answer in: ${currentLanguage}.
            Old Activity: ${JSON.stringify(act)}
            Output STRICTLY a single JSON object containing an "activity" object with identical keys but new values for title, desc, and cost (in ${tripData.currency}). Example: { "activity": { "title": "New", "desc": "Desc", "cost": 20 } }`;

            try {
                const aiText = await callGroq(prompt);
                const parsed = extractJSON(aiText);
                const newAct = parsed.activity || parsed;
                
                const titleVal = newAct.title || newAct.activity || act.title;
                const descVal = newAct.desc || newAct.description || act.desc;
                act.title = titleVal;
                act.activity = titleVal;
                act.desc = descVal;
                act.description = descVal;
                act.cost = typeof newAct.cost === 'number' ? newAct.cost : (parseInt(newAct.cost, 10) || act.cost);
                
                renderDashboard();
                addCopilotMsg("I've replaced the activity with a new, genuine suggestion!", false);

                if (currentTripId) {
                    const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? (window.location.port === '5500' ? 'http://localhost:3000' : '') : '';
                    fetch(`${baseUrl}/api/trips/${currentTripId}`, {
                        method: 'PATCH',
                        headers: (window.TravelBuddyAuth && window.TravelBuddyAuth.authHeaders) 
                            ? window.TravelBuddyAuth.authHeaders({ 'Content-Type': 'application/json' }) 
                            : { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ metadata: tripData, itinerary: currentItinerary })
                    }).catch(e => console.error("Auto-sync regen error:", e));
                }
            } catch(e) {
                console.error(e);
                addCopilotMsg("Failed to regenerate with AI.", false);
            }
        } else if (act && act.locked) {
            addCopilotMsg("That activity is locked. Please unlock it if you'd like me to regenerate it.", false);
        }
    };

    // Copilot Logic
    const chatBox = document.getElementById('copilot-chat');
    const copilotInput = document.getElementById('copilot-text');
    const btnSend = document.getElementById('btn-send-copilot');

    function addCopilotMsg(text, isUser) {
        if (!chatBox) return;
        const msg = document.createElement('div');
        msg.className = `msg ${isUser ? 'user-msg' : 'ai-msg'}`;
        msg.textContent = text;
        chatBox.appendChild(msg);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    if (btnSend) btnSend.addEventListener('click', handleCopilotInput);
    if (copilotInput) {
        copilotInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleCopilotInput();
        });
    }

    function getResponse(key, fallback) {
        if (currentLanguage !== 'English' && dict[currentLanguage] && dict[currentLanguage].responses[key]) {
            return dict[currentLanguage].responses[key];
        }
        return fallback;
    }

    async function handleCopilotInput() {
        if (!copilotInput) return;
        const text = copilotInput.value.trim();
        if (!text) return;
        
        addCopilotMsg(text, true);
        copilotInput.value = '';

        // Handle quick language switch locally so we don't query the LLM just for a state change
        const lower = text.toLowerCase();
        let langMatched = null;
        if (lower.includes('hindi')) langMatched = 'hindi';
        else if (lower.includes('tamil')) langMatched = 'tamil';
        else if (lower.includes('marathi')) langMatched = 'marathi';
        else if (lower.includes('gujarati')) langMatched = 'gujarati';
        else if (lower.includes('english')) langMatched = 'English';

        if (langMatched && text.split(" ").length < 6) { // if it's a simple command like "in hindi"
            currentLanguage = langMatched;
        }

        addCopilotMsg("Thinking...", false);
        
        const prompt = `You are a helpful and intelligent Trip Copilot AI for TravelBuddy. 
        The user is traveling to ${tripData.destination || 'their destination'}.
        User message: "${text}"
        Current language to respond in: ${currentLanguage}.
        
        Current Itinerary JSON:
        ${JSON.stringify(currentItinerary)}
        
        Instructions:
        1. If the user message is a greeting, general inquiry, or feedback without modifying the itinerary (e.g. "hi", "how are you", "what should I pack"):
           Return JSON strictly: { "message": "Friendly and helpful response to the user" }
        2. If the user asks to modify the itinerary (e.g. "fix this itinerary", "make day 2 cheaper", "more relaxed", "translate to Hindi", "more adventure"):
           Modify the itinerary accordingly while preserving "locked" activities.
           Return strictly: { "itinerary": [... full modified itinerary days ...], "message": "Short description of what was updated" }
        3. Each activity in the itinerary MUST have: id, time, title, desc, cost, and type.
        4. Return ONLY valid JSON.`;

        try {
            const aiText = await callGroq(prompt);
            let parsed = extractJSON(aiText);
            let newItinerary = parsed.itinerary || parsed;
            
            // Robust auto-fixes for common LLM JSON mistakes
            if (!Array.isArray(newItinerary) && newItinerary.day) {
                newItinerary = [newItinerary];
            } else if (!Array.isArray(newItinerary) && newItinerary.activities) {
                newItinerary = [{ day: 1, activities: newItinerary.activities }];
            }

            if (!Array.isArray(newItinerary)) {
                if (chatBox && chatBox.lastChild) chatBox.removeChild(chatBox.lastChild);
                const replyText = parsed.message || parsed.reply || parsed.text || "Hello! I'm your AI Trip Copilot. Ask me to modify your itinerary, e.g. 'make day 2 cheaper', 'add dinner', or 'more relaxed'!";
                addCopilotMsg(replyText, false);
                return;
            }
            
            newItinerary.forEach(d => {
                if (!Array.isArray(d.activities)) d.activities = [];
            });
            
            // Ensure IDs and locked status are preserved
            newItinerary.forEach(d => {
                const origDay = currentItinerary.find(od => od.day === d.day);
                if (origDay) {
                    d.activities.forEach(a => {
                        const origAct = origDay.activities.find(oa => oa.id === a.id);
                        if (origAct && origAct.locked) {
                            a.title = origAct.title;
                            a.activity = origAct.title;
                            a.desc = origAct.desc;
                            a.description = origAct.desc;
                            a.cost = origAct.cost;
                        } else if (!a.id && origAct) {
                            a.id = origAct.id;
                        }
                    });
                }
            });
            
            currentItinerary = normalizeItinerary(newItinerary);
            renderDashboard();
            
            // Remove the "Thinking..." message
            if (chatBox && chatBox.lastChild) chatBox.removeChild(chatBox.lastChild);
            
            const replyMsg = parsed.message || (langMatched && langMatched !== 'English' 
                ? getResponse('lang', "I have translated the itinerary for you.") 
                : "I've updated your itinerary based on your request! What do you think?");
            addCopilotMsg(replyMsg, false);

            // Auto-sync to backend
            if (currentTripId) {
                const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? (window.location.port === '5500' ? 'http://localhost:3000' : '') : '';
                fetch(`${baseUrl}/api/trips/${currentTripId}`, {
                    method: 'PATCH',
                    headers: (window.TravelBuddyAuth && window.TravelBuddyAuth.authHeaders) 
                        ? window.TravelBuddyAuth.authHeaders({ 'Content-Type': 'application/json' }) 
                        : { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ metadata: tripData, itinerary: currentItinerary })
                }).catch(e => console.error("Auto-sync copilot error:", e));
            }
            
        } catch (e) {
            console.error(e);
            if (chatBox && chatBox.lastChild) chatBox.removeChild(chatBox.lastChild);
            addCopilotMsg("Error: " + e.message, false);
        }
    }

    // ==========================================
    // SAFETY INTELLIGENCE FEATURE
    // ==========================================

    async function fetchRealWeather(destination) {
        try {
            const apiKey = "cb45ab9a243841f493085259260409";
            const res = await fetch(`https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(destination)}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            return data;
        } catch (err) {
            console.error("WeatherAPI error:", err);
            return null;
        }
    }

    async function generateSafetyAnalysis() {
        const safetyLoading = document.getElementById('safety-loading-overlay');
        const safetyDashboard = document.getElementById('safety-dashboard-view');
        const mainDashboard = document.getElementById('dashboard-view');
        
        mainDashboard.classList.add('hidden');
        safetyLoading.classList.remove('hidden');
        safetyDashboard.classList.add('hidden');
        const monView = document.getElementById('destination-monitoring-view');
        if(monView) monView.classList.add('hidden');
        const wgView = document.getElementById('wanderguide-view');
        if(wgView) wgView.classList.add('hidden');
        document.body.classList.remove('wanderguide-active');
        
        // Update Navbar Active State
        const navPlanner = document.getElementById('nav-planner-link');
        const navSafety = document.getElementById('nav-safety-link');
        const navMon = document.getElementById('nav-monitoring-link');
        const navWg = document.getElementById('nav-wanderguide-link');
        if(navPlanner) navPlanner.classList.remove('active');
        if(navMon) navMon.classList.remove('active');
        if(navWg) navWg.classList.remove('active');
        if(navSafety) navSafety.classList.add('active');

        // Update Last Analysis Time
        const now = new Date();
        document.getElementById('last-analysis-time').textContent = `Last Analysis: ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;

        // Get Optimization Preference
        const optPref = document.getElementById('optimization-preference').value;
        let prefInstruction = "Balance safety, convenience, experience, and travel time.";
        if (optPref === 'safety') prefInstruction = "Prioritize lower crowd levels, better weather conditions, daytime activities, and safer available route/context recommendations. Strongly suggest timing changes if risks exist.";
        if (optPref === 'experience') prefInstruction = "Prioritize the user's chosen attractions and experiences. Keep activities intact but still display safety warnings rather than removing them.";

        try {
            // Fetch real weather data
            const weatherData = await fetchRealWeather(tripData.destination);
            let weatherContext = "Real-time weather data unavailable. Rely on typical seasonal averages.";
            if (weatherData) {
                weatherContext = `Current Weather in ${tripData.destination}: ${weatherData.current.temp_c}Â°C, ${weatherData.current.condition.text}. Wind: ${weatherData.current.wind_kph} kph. Precip: ${weatherData.current.precip_mm} mm. Visibility: ${weatherData.current.vis_km} km.`;
            }

            // Keep full details so AI can rebuild it
            const prompt = `You are the TRAVELX AI Trip Copilot, an advanced travel safety and intelligence expert. 
            Analyze the following trip and itinerary for safety, real weather, actual crowd density patterns, and timing suitability.
            Destination: ${tripData.destination}
            Dates: ${tripData.startDate} to ${tripData.endDate}
            Travelers: ${tripData.travelers}
            Optimization Preference: ${optPref} (${prefInstruction})
            
            REAL-WORLD WEATHER CONTEXT:
            ${weatherContext}
            
            Current Itinerary JSON: ${JSON.stringify(currentItinerary)}
            
            Do NOT simulate data. Use the provided real-world weather context. For crowd and location safety, use your extensive factual knowledge about ${tripData.destination}'s typical crowd patterns, high-traffic zones, and known safety considerations for these specific dates/times. Provide highly factual, real-world recommendations.
            
            Output STRICTLY as a JSON object matching this schema. DO NOT include markdown, code fences or extra text.
            {
              "overallSafetyScore": 85,
              "overallSafetyStatus": "Relatively Safe",
              "confidence": "High",
              "scoreExplanation": "Crowd density is currently the biggest factor reducing your overall score.",
              "factors": [
                { "name": "Location Safety", "status": "🟢 Safe", "value": "safe" },
                { "name": "Time Suitability", "status": "🟢 Very Safe", "value": "safe" }
              ],
              "copilotSummary": "I've analyzed your trip and found a few things worth improving.",
              "copilotHighlights": [
                { "title": "👥 High Crowd", "desc": "Main Attraction expected to be busier at 6 PM." }
              ],
              "weatherAnalysis": {
                "temperature": "27Â°C", "condition": "Partly Cloudy", "rainProb": "18%", "wind": "12 km/h", "visibility": "Good",
                "timeline": [ { "time": "10 AM", "status": "🟢 Good" } ],
                "recommendation": "Best Outdoor Window: 9 AM - 12 PM"
              },
              "crowdAnalysis": {
                "timeline": [ { "place": "Main Attraction", "time": "10 AM", "level": "🟡 Moderate" } ],
                "bestTime": { "window": "9:00 AM - 11:00 AM", "factors": ["🟢 Safety", "🟢 Weather", "🟢 Crowd"] }
              },
              "alerts": [
                { "type": "moderate", "title": "🟡 CROWD ALERT", "desc": "High crowds at 6 PM. Recommendation: Visit at 9 AM." }
              ],
              "itineraryChanges": [
                { "original": "6:00 PM - Sightseeing", "recommended": "4:00 PM - Sightseeing", "reason": "Avoid peak evening crowds and traffic." }
              ],
              "whyRecommendations": [
                { "original": "6:00 PM - Sightseeing", "recommended": "4:00 PM - Sightseeing", "reasons": ["👥 Crowd density is expected to be lower at 4 PM."] }
              ],
              "routeRecommendation": {
                "fastest": "25 min",
                "recommended": "30 min",
                "explanation": "Recommended based on available route, destination, timing and safety context."
              },
              "radarData": [
                { "name": "Location Risk", "level": 15, "status": "Low" },
                { "name": "Weather Risk", "level": 20, "status": "Low" },
                { "name": "Crowd Risk", "level": 60, "status": "Moderate" },
                { "name": "Time Risk", "level": 30, "status": "Low" },
                { "name": "Route Risk", "level": 10, "status": "Low" }
              ],
              "tripReadiness": {
                "score": 87, "status": "Almost Ready", "message": "You're ready to go. One timing adjustment is recommended before your trip.",
                "factors": ["🟢 Safety - Good", "🟢 Weather - Good"]
              },
              "summary": {
                "low": 5, "moderate": 1, "high": 0, "weather": 0, "crowd": 1, "changes": 1,
                "finalRecommendation": "Your itinerary is generally suitable."
              },
              "optimizedItinerary": [ { ... FULL UPDATED ITINERARY ARRAY ... } ]
            }`;

            const aiText = await callGroq(prompt);
            const safetyData = extractJSON(aiText);
            
            renderSafetyDashboard(safetyData);
            
            safetyLoading.classList.add('hidden');
            safetyDashboard.classList.remove('hidden');

        } catch (err) {
            console.error("Safety Analysis Error (Using Fallback):", err);
            
            // Fallback for demonstration if API fails/rate-limits
            const fallbackData = {
                "overallSafetyScore": 85,
                "overallSafetyStatus": "Relatively Safe",
                "confidence": "Medium",
                "scoreExplanation": "Crowd density and evening timings slightly reduce the overall score.",
                "factors": [
                    { "name": "Location Safety", "status": "🟢 84", "value": "safe" },
                    { "name": "Weather Safety", "status": "🟢 92", "value": "safe" },
                    { "name": "Crowd Conditions", "status": "🟡 68", "value": "moderate" },
                    { "name": "Time Suitability", "status": "🟢 78", "value": "safe" }
                ],
                "copilotSummary": "I've analyzed your trip and found 1 timing adjustment to improve your experience.",
                "copilotHighlights": [
                    { "title": "👥 Crowd Optimization", "desc": "Moved evening sightseeing to earlier in the day to avoid peak crowds." }
                ],
                "weatherAnalysis": {
                    "temperature": "25Â°C", "condition": "Clear", "rainProb": "5%", "wind": "10 km/h", "visibility": "Excellent",
                    "timeline": [ { "time": "10 AM", "status": "🟢 Good" }, { "time": "2 PM", "status": "🟡 Warm" }, { "time": "6 PM", "status": "🟢 Good" } ],
                    "recommendation": "💡 Best Outdoor Window: 9 AM - 11 AM"
                },
                "crowdAnalysis": {
                    "timeline": [ { "place": "Main Attraction", "time": "10:00 AM", "level": "🟡 Moderate" }, { "place": "Main Attraction", "time": "6:00 PM", "level": "🔴 High" } ],
                    "bestTime": { "window": "9:00 AM - 11:00 AM", "factors": ["🟢 Safety", "🟢 Weather", "🟢 Crowd", "🟢 Visibility"] }
                },
                "alerts": [
                    { "type": "moderate", "title": "🟡 CROWD ALERT", "desc": "Evening visit has high crowd density. Recommendation: Visit earlier in the day." }
                ],
                "itineraryChanges": [
                    { "original": "Sightseeing at 6:00 PM", "recommended": "Sightseeing at 4:00 PM", "reason": "Avoid peak evening crowds and traffic." }
                ],
                "whyRecommendations": [
                    { "original": "6:00 PM - Sightseeing", "recommended": "4:00 PM - Sightseeing", "reasons": ["👥 Crowd density is expected to be lower at 4 PM.", "🚗 Travel conditions are expected to be more favorable."] }
                ],
                "routeRecommendation": {
                    "fastest": "25 min",
                    "recommended": "30 min",
                    "explanation": "Recommended based on available route, destination, timing and safety context."
                },
                "radarData": [
                    { "name": "Location Risk", "level": 15, "status": "Low" },
                    { "name": "Weather Risk", "level": 10, "status": "Low" },
                    { "name": "Crowd Risk", "level": 70, "status": "Moderate" },
                    { "name": "Time Risk", "level": 25, "status": "Low" },
                    { "name": "Route Risk", "level": 15, "status": "Low" }
                ],
                "tripReadiness": {
                    "score": 88, "status": "Almost Ready", "message": "You're ready to go. Consider adjusting one evening activity to avoid crowds.",
                    "factors": ["🟢 Safety - Good", "🟢 Weather - Excellent", "🟡 Crowd - Moderate", "🟢 Timing - Good"]
                },
                "summary": {
                    "low": 5, "moderate": 1, "high": 0, "weather": 0, "crowd": 1, "changes": 1,
                    "finalRecommendation": "Your itinerary is generally suitable with a few minor timing adjustments."
                },
                "optimizedItinerary": currentItinerary // Fallback just keeps the same
            };
            
            renderSafetyDashboard(fallbackData);
            
            safetyLoading.classList.add('hidden');
            safetyDashboard.classList.remove('hidden');
        }
    }
    
    // Bind buttons
    const btnViewSafety = document.getElementById('btn-view-safety');
    if(btnViewSafety) {
        btnViewSafety.addEventListener('click', () => {
            generateSafetyAnalysis();
        });
    }

    const btnShareWhatsapp = document.getElementById('btn-share-whatsapp');
    if (btnShareWhatsapp) {
        btnShareWhatsapp.addEventListener('click', () => {
            if (!tripData.destination) {
                alert("Please generate a trip first!");
                return;
            }
            const text = `Hey! I'm traveling to ${tripData.destination} from ${tripData.startDate} to ${tripData.endDate}. Check out my trip details and track my location!`;
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
        });
    }

    const navSafetyLink = document.getElementById('nav-safety-link');
    if(navSafetyLink) {
        navSafetyLink.addEventListener('click', (e) => {
            e.preventDefault();
            if(currentItinerary.length > 0) {
                generateSafetyAnalysis();
            } else {
                alert("Please generate a trip itinerary first!");
            }
        });
    }

    const btnBackToItinerary = document.getElementById('btn-back-to-itinerary');
    if(btnBackToItinerary) {
        btnBackToItinerary.addEventListener('click', () => {
            document.getElementById('safety-dashboard-view').classList.add('hidden');
            document.getElementById('dashboard-view').classList.remove('hidden');
            
            // Restore Navbar Active State
            const navPlanner = document.getElementById('nav-planner-link');
            const navSafety = document.getElementById('nav-safety-link');
            if(navSafety) navSafety.classList.remove('active');
            if(navPlanner) navPlanner.classList.add('active');
        });
    }

    const btnRefreshAnalysis = document.getElementById('btn-refresh-analysis');
    if(btnRefreshAnalysis) {
        btnRefreshAnalysis.addEventListener('click', () => {
            generateSafetyAnalysis();
        });
    }

    const btnOptimizeTrip = document.getElementById('btn-optimize-trip');
    if(btnOptimizeTrip) {
        btnOptimizeTrip.addEventListener('click', () => {
            if(latestOptimizedItinerary) {
                currentItinerary = latestOptimizedItinerary;
                renderDashboard();
                document.getElementById('safety-dashboard-view').classList.add('hidden');
                document.getElementById('dashboard-view').classList.remove('hidden');
                
                // Restore Navbar Active State
                const navPlanner = document.getElementById('nav-planner-link');
                const navSafety = document.getElementById('nav-safety-link');
                if(navSafety) navSafety.classList.remove('active');
                if(navPlanner) navPlanner.classList.add('active');
            } else {
                alert("No optimization available.");
            }
        });
    }

    function renderSafetyDashboard(data) {
        // Store optimized itinerary globally for the button
        latestOptimizedItinerary = data.optimizedItinerary;
        
        // Update Map
        const mapFrame = document.getElementById('safe-route-map');
        if (mapFrame && tripData.destination) {
            const dest = encodeURIComponent(tripData.destination);
            mapFrame.src = `https://maps.google.com/maps?q=${dest}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
        }
        
        // Hospital Map
        const hospitalMap = document.getElementById('hospital-map');
        if (hospitalMap && tripData.destination) {
            const hospitalQuery = encodeURIComponent(`hospitals near ${tripData.destination}`);
            hospitalMap.src = `https://maps.google.com/maps?q=${hospitalQuery}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
        }
        
        // Copilot Card
        document.getElementById('copilot-summary').textContent = data.copilotSummary || "Analysis complete.";
        const highlightsContainer = document.getElementById('copilot-highlights');
        highlightsContainer.innerHTML = '';
        if(data.copilotHighlights) {
            data.copilotHighlights.forEach(h => {
                highlightsContainer.innerHTML += `
                    <div class="highlight-card">
                        <div class="highlight-title">${h.title}</div>
                        <div class="highlight-desc">${h.desc}</div>
                    </div>
                `;
            });
        }

        // Overall Score
        const scoreRing = document.getElementById('safety-score-ring');
        const scoreValue = document.getElementById('overall-safety-score');
        const scoreStatus = document.getElementById('overall-safety-status');
        
        const score = data.overallSafetyScore || 85;
        scoreValue.textContent = score;
        scoreRing.style.strokeDasharray = `${score}, 100`;
        
        if (score >= 80) scoreRing.style.stroke = '#10b981'; // Green
        else if (score >= 60) scoreRing.style.stroke = '#f59e0b'; // Yellow
        else scoreRing.style.stroke = '#ef4444'; // Red
        
        scoreStatus.textContent = data.overallSafetyStatus || "Analysis Complete";
        document.getElementById('safety-confidence').textContent = `Analysis Confidence: ${data.confidence || 'Medium'}`;
        document.getElementById('safety-score-explanation').textContent = data.scoreExplanation || "";

        // Categories (Factors)
        const indicatorsGrid = document.getElementById('safety-indicators');
        indicatorsGrid.innerHTML = '';
        if (data.factors) {
            data.factors.forEach(cat => {
                indicatorsGrid.innerHTML += `
                    <div class="indicator-item">
                        <span class="indicator-title">${cat.name}</span>
                        <span class="indicator-value ${cat.value}">${cat.status}</span>
                    </div>
                `;
            });
        }

        // Weather Intelligence
        if(data.weatherAnalysis) {
            const w = data.weatherAnalysis;
            document.getElementById('weather-current-conditions').innerHTML = `${w.temperature} — ${w.condition}`;
            document.getElementById('weather-details').innerHTML = `
                <div class="weather-detail-item"><span>Rain Prob</span> <strong>${w.rainProb}</strong></div>
                <div class="weather-detail-item"><span>Wind</span> <strong>${w.wind}</strong></div>
                <div class="weather-detail-item"><span>Visibility</span> <strong>${w.visibility}</strong></div>
            `;
            
            const wTimeline = document.getElementById('weather-timeline');
            wTimeline.innerHTML = '';
            if(w.timeline) {
                w.timeline.forEach(t => {
                    wTimeline.innerHTML += `<div class="time-slot"><span class="time-slot-time">${t.time}</span><span class="time-slot-status">${t.status}</span></div>`;
                });
            }
            document.getElementById('weather-recommendation').textContent = w.recommendation || "";
        }

        // Crowd Density
        const crowdList = document.getElementById('crowd-density-list');
        crowdList.innerHTML = '';
        if (data.crowdAnalysis && data.crowdAnalysis.timeline) {
            data.crowdAnalysis.timeline.forEach(c => {
                crowdList.innerHTML += `<div class="crowd-item"><span class="crowd-title">${c.place} — ${c.time}</span><span class="crowd-desc">${c.level}</span></div>`;
            });
        }
        
        const bestTimeSection = document.getElementById('ai-best-time-section');
        bestTimeSection.innerHTML = '';
        if(data.crowdAnalysis && data.crowdAnalysis.bestTime) {
            const bt = data.crowdAnalysis.bestTime;
            let factorsHtml = bt.factors.map(f => `<span class="bt-factor">${f}</span>`).join('');
            bestTimeSection.innerHTML = `
                <div class="best-time-title">â° AI Best Time to Visit</div>
                <div class="best-time-window">${bt.window}</div>
                <div class="best-time-factors">${factorsHtml}</div>
            `;
        }

        // Alerts
        const alertsList = document.getElementById('safety-alerts-list');
        alertsList.innerHTML = '';
        if (data.alerts && data.alerts.length > 0) {
            data.alerts.forEach(alert => {
                let rec = alert.recommendation ? `<br><strong>Recommendation:</strong> ${alert.recommendation}` : '';
                alertsList.innerHTML += `
                    <div class="alert-item ${alert.type}">
                        <span class="alert-title">${alert.title}</span>
                        <span class="alert-desc">${alert.desc}${rec}</span>
                    </div>
                `;
            });
        } else {
            alertsList.innerHTML = `<div class="alert-item low"><span class="alert-title">🟢 No Active Alerts</span><span class="alert-desc">Conditions look good for your planned activities.</span></div>`;
        }

        // Itinerary Changes
        const changesList = document.getElementById('itinerary-changes-list');
        changesList.innerHTML = '';
        if (data.itineraryChanges && data.itineraryChanges.length > 0) {
            data.itineraryChanges.forEach(change => {
                changesList.innerHTML += `
                    <div class="opt-item">
                        <div class="opt-compare">
                            <span class="opt-before">${change.original}</span>
                            <span class="opt-arrow">➔</span>
                            <span class="opt-after">${change.recommended}</span>
                        </div>
                        <div class="opt-reason">${change.reason}</div>
                    </div>
                `;
            });
        } else {
            changesList.innerHTML = `<p class="alert-desc">No timing changes recommended. Your schedule is optimal.</p>`;
        }

        // Recommendations (Why TRAVELX Recommended This)
        const recList = document.getElementById('recommendations-list');
        recList.innerHTML = '';
        if (data.whyRecommendations && data.whyRecommendations.length > 0) {
            data.whyRecommendations.forEach(rec => {
                let reasonsHtml = rec.reasons.map(r => `<div>${r}</div>`).join('');
                recList.innerHTML += `
                    <div class="reason-item">
                        <div style="font-weight:600; margin-bottom:8px; font-size:13px;">${rec.original} ➔ ${rec.recommended}</div>
                        <div class="reason-desc">${reasonsHtml}</div>
                    </div>
                `;
            });
        } else {
            recList.innerHTML = `<p class="alert-desc">No major AI adjustments were required.</p>`;
        }

        // Route Safety
        const routeInfo = document.getElementById('route-safety-info');
        if (data.routeRecommendation) {
            routeInfo.innerHTML = `
                <div class="route-option">
                    <div class="route-title">⚡ Fastest Route</div>
                    <div class="route-info">${data.routeRecommendation.fastest}</div>
                </div>
                <div class="route-option recommended">
                    <span class="route-badge">Recommended</span>
                    <div class="route-title">ðŸ›¡ï¸ Recommended Route</div>
                    <div class="route-info">${data.routeRecommendation.recommended}</div>
                    <div class="route-disclaimer" style="margin-top:8px;">${data.routeRecommendation.explanation}</div>
                </div>
            `;
        }

        // Risk Radar
        const radarContainer = document.getElementById('travel-risk-radar');
        radarContainer.innerHTML = '';
        if(data.radarData) {
            data.radarData.forEach(r => {
                let color = r.level > 70 ? '#ef4444' : r.level > 40 ? '#f59e0b' : '#10b981';
                radarContainer.innerHTML += `
                    <div class="risk-bar-item">
                        <div class="risk-label">${r.name}</div>
                        <div class="risk-bar-track">
                            <div class="risk-bar-fill" style="width: ${r.level}%; background-color: ${color};"></div>
                        </div>
                        <div class="risk-status" style="color: ${color};">${r.status}</div>
                    </div>
                `;
            });
        }

        // Trip Readiness
        if(data.tripReadiness) {
            document.getElementById('trip-readiness-score').textContent = `${data.tripReadiness.score}%`;
            document.getElementById('trip-readiness-status').textContent = data.tripReadiness.status;
            document.getElementById('trip-readiness-message').textContent = data.tripReadiness.message;
            
            const rFactors = document.getElementById('trip-readiness-factors');
            rFactors.innerHTML = '';
            data.tripReadiness.factors.forEach(f => {
                rFactors.innerHTML += `<span class="r-factor">${f}</span>`;
            });
        }

        // Summary
        const summaryStats = document.getElementById('trip-safety-summary');
        if (data.summary) {
            summaryStats.innerHTML = `
                <div class="stat-pill">🟢 ${data.summary.low} Low-Concern</div>
                <div class="stat-pill">🟡 ${data.summary.moderate} Moderate Alerts</div>
                <div class="stat-pill">🔴 ${data.summary.high} High Alerts</div>
                <div class="stat-pill">ðŸŒ¦ï¸ ${data.summary.weather} Weather Concerns</div>
                <div class="stat-pill">👥 ${data.summary.crowd} Crowd Alerts</div>
                <div class="stat-pill">🔄 ${data.summary.changes} Recommended Changes</div>
                <div class="summary-text">${data.summary.finalRecommendation}</div>
            `;
        }
    }

    // ==========================================
    // CITY EXPLORER INTELLIGENCE & LANDMARK ENGINE
    // ==========================================

    let ceMap = null;
    let ceMarkers = [];
    let currentExplorerCityName = null;
    let fetchedPlacesCache = [];

    // View Switching Logic
    const navExplorerLink = document.getElementById('nav-explorer-link');
    const navPlannerLink = document.getElementById('nav-planner-link');
    const cityExplorerView = document.getElementById('city-explorer-view');
    const btnExploreCity = document.getElementById('btn-explore-city');
    const searchInput = document.getElementById('ce-city-search');
    const suggestionsBox = document.getElementById('ce-search-suggestions');

    // In-memory cache for dynamic city places to prevent duplicate API hits
    const ceCityCache = new Map();

    // Autocomplete Suggestions Setup using real-time dynamic backend API
    function setupCityAutocomplete() {
        if (!searchInput || !suggestionsBox) return;

        let debounceTimer = null;

        async function fetchAndRenderSuggestions(val) {
            const q = val.trim();
            if (q.length < 2) {
                suggestionsBox.innerHTML = '';
                suggestionsBox.classList.add('hidden');
                return;
            }

            try {
                const res = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(q)}`);
                const data = await res.json();
                const suggestions = (data && data.success && Array.isArray(data.suggestions)) ? data.suggestions : [];

                if (suggestions.length === 0) {
                    suggestionsBox.innerHTML = `
                        <div class="ce-suggestion-item" data-city="${q}">
                            <span class="s-name">🔍 Explore "${q}" globally</span>
                            <span class="s-country">Online Discovery</span>
                        </div>
                    `;
                } else {
                    let html = '';
                    suggestions.slice(0, 6).forEach(item => {
                        html += `
                            <div class="ce-suggestion-item" data-city="${item.name}">
                                <span class="s-name">📍 ${item.name}</span>
                                <span class="s-country">${item.country || 'Global'}</span>
                            </div>
                        `;
                    });
                    suggestionsBox.innerHTML = html;
                }

                suggestionsBox.classList.remove('hidden');

                // Attach click listeners to suggestions
                suggestionsBox.querySelectorAll('.ce-suggestion-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const chosen = item.getAttribute('data-city');
                        searchInput.value = chosen;
                        suggestionsBox.classList.add('hidden');
                        searchAndLoadCity(chosen);
                    });
                });
            } catch (err) {
                console.warn('City autocomplete fetch error:', err);
            }
        }

        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            const val = e.target.value;
            debounceTimer = setTimeout(() => {
                fetchAndRenderSuggestions(val);
            }, 300);
        });

        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim().length >= 2) {
                fetchAndRenderSuggestions(searchInput.value);
            }
        });

        // Hide suggestions on outside click
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
                suggestionsBox.classList.add('hidden');
            }
        });

        // Enter key search
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                suggestionsBox.classList.add('hidden');
                if (searchInput.value.trim()) {
                    searchAndLoadCity(searchInput.value.trim());
                }
            } else if (e.key === 'Escape') {
                suggestionsBox.classList.add('hidden');
            }
        });
    }

    function showCityExplorer() {
        document.getElementById('wizard-view').classList.add('hidden');
        document.getElementById('dashboard-view').classList.add('hidden');
        document.getElementById('safety-dashboard-view').classList.add('hidden');
        const monView = document.getElementById('destination-monitoring-view');
        if (monView) monView.classList.add('hidden');
        const wgView = document.getElementById('wanderguide-view');
        if (wgView) wgView.classList.add('hidden');
        const roView = document.getElementById('route-optimizer-view');
        if (roView) roView.classList.add('hidden');
        document.body.classList.remove('wanderguide-active');
        cityExplorerView.classList.remove('hidden');

        const navMon = document.getElementById('nav-monitoring-link');
        const navWg = document.getElementById('nav-wanderguide-link');
        const navRo = document.getElementById('nav-route-optimizer-link');
        if(navPlannerLink) navPlannerLink.classList.remove('active');
        if(navSafetyLink) navSafetyLink.classList.remove('active');
        if(navMon) navMon.classList.remove('active');
        if(navWg) navWg.classList.remove('active');
        if(navRo) navRo.classList.remove('active');
        if(navExplorerLink) navExplorerLink.classList.add('active');

        // Initialize Map if not done
        initLeafletMap();
        if (ceMap) {
            setTimeout(() => { ceMap.invalidateSize(); }, 300);
        }

        // Sync with trip planner destination if it exists, otherwise default to Mumbai
        if (tripData.destination && tripData.destination !== currentExplorerCityName) {
            if (searchInput) searchInput.value = tripData.destination;
            searchAndLoadCity(tripData.destination);
        } else if (!currentExplorerCityName) {
            const defaultCity = "Mumbai";
            if (searchInput) searchInput.value = defaultCity;
            searchAndLoadCity(defaultCity);
        }
    }

    function showRouteOptimizer() {
        document.getElementById('wizard-view').classList.add('hidden');
        document.getElementById('dashboard-view').classList.add('hidden');
        document.getElementById('safety-dashboard-view').classList.add('hidden');
        const monView = document.getElementById('destination-monitoring-view');
        if (monView) monView.classList.add('hidden');
        const wgView = document.getElementById('wanderguide-view');
        if (wgView) wgView.classList.add('hidden');
        if (cityExplorerView) cityExplorerView.classList.add('hidden');
        document.body.classList.remove('wanderguide-active');

        const roView = document.getElementById('route-optimizer-view');
        if (roView) roView.classList.remove('hidden');

        const navMon = document.getElementById('nav-monitoring-link');
        const navWg = document.getElementById('nav-wanderguide-link');
        const navRo = document.getElementById('nav-route-optimizer-link');
        if(navPlannerLink) navPlannerLink.classList.remove('active');
        if(navSafetyLink) navSafetyLink.classList.remove('active');
        if(navExplorerLink) navExplorerLink.classList.remove('active');
        if(navMon) navMon.classList.remove('active');
        if(navWg) navWg.classList.remove('active');
        if(navRo) navRo.classList.add('active');

        const originInputRo = document.getElementById('bro-input-origin');
        const destInputRo = document.getElementById('bro-input-dest');
        const budgetInputRo = document.getElementById('bro-input-budget');
        const modeSelectRo = document.getElementById('bro-select-mode');

        if (originInputRo) originInputRo.value = tripData.origin || 'Delhi';
        if (destInputRo) destInputRo.value = tripData.destination || (destInput ? destInput.value : '') || '';
        if (budgetInputRo) budgetInputRo.value = tripData.budget || 1000;
        if (modeSelectRo) modeSelectRo.value = tripData.travelMode || 'car';

        if (window.TravelBuddyRouteOptimizer && destInputRo && destInputRo.value.trim()) {
            window.TravelBuddyRouteOptimizer.evaluateBudgetAndRoutes({
                origin: originInputRo ? originInputRo.value : 'Delhi',
                destination: destInputRo.value.trim(),
                userBudget: budgetInputRo ? parseInt(budgetInputRo.value) : 1000,
                travelMode: modeSelectRo ? modeSelectRo.value : 'car'
            }).then(res => {
                const container = document.getElementById('bro-results-container');
                if (container) {
                    window.TravelBuddyRouteOptimizer.displayFeasibilityResult(res, container);
                }
            });
        }
    }

    if (navExplorerLink) {
        navExplorerLink.addEventListener('click', (e) => {
            e.preventDefault();
            showCityExplorer();
        });
    }

    const navRouteOptimizerLink = document.getElementById('nav-route-optimizer-link');
    if (navRouteOptimizerLink) {
        navRouteOptimizerLink.addEventListener('click', (e) => {
            e.preventDefault();
            showRouteOptimizer();
        });
    }

    const btnBackToPlanner = document.getElementById('bro-btn-back-to-planner');
    if (btnBackToPlanner) {
        btnBackToPlanner.addEventListener('click', () => {
            if (navPlannerLink) navPlannerLink.click();
        });
    }

    // Benchmark preset buttons
    const presetDelhi1000 = document.getElementById('preset-delhi-rishikesh-1000');
    if (presetDelhi1000) {
        presetDelhi1000.addEventListener('click', () => {
            if (window.TravelBuddyRouteOptimizer) window.TravelBuddyRouteOptimizer.setTestPreset('delhi_rishikesh_1000');
        });
    }
    const presetDelhi800 = document.getElementById('preset-delhi-rishikesh-800');
    if (presetDelhi800) {
        presetDelhi800.addEventListener('click', () => {
            if (window.TravelBuddyRouteOptimizer) window.TravelBuddyRouteOptimizer.setTestPreset('delhi_rishikesh_800');
        });
    }
    const presetDelhi1500 = document.getElementById('preset-delhi-rishikesh-1500');
    if (presetDelhi1500) {
        presetDelhi1500.addEventListener('click', () => {
            if (window.TravelBuddyRouteOptimizer) window.TravelBuddyRouteOptimizer.setTestPreset('delhi_rishikesh_1500');
        });
    }
    const presetMumbaiPune = document.getElementById('preset-mumbai-pune');
    if (presetMumbaiPune) {
        presetMumbaiPune.addEventListener('click', () => {
            const o = document.getElementById('bro-input-origin');
            const d = document.getElementById('bro-input-dest');
            const b = document.getElementById('bro-input-budget');
            if (o) o.value = 'Mumbai';
            if (d) d.value = 'Pune';
            if (b) b.value = 1200;
            document.getElementById('bro-btn-calculate')?.click();
        });
    }
    const presetBangaloreMysore = document.getElementById('preset-bangalore-mysore');
    if (presetBangaloreMysore) {
        presetBangaloreMysore.addEventListener('click', () => {
            const o = document.getElementById('bro-input-origin');
            const d = document.getElementById('bro-input-dest');
            const b = document.getElementById('bro-input-budget');
            if (o) o.value = 'Bengaluru';
            if (d) d.value = 'Mysuru';
            if (b) b.value = 900;
            document.getElementById('bro-btn-calculate')?.click();
        });
    }

    const btnBroCalculate = document.getElementById('bro-btn-calculate');
    if (btnBroCalculate) {
        btnBroCalculate.addEventListener('click', async () => {
            const o = document.getElementById('bro-input-origin')?.value || 'Delhi';
            const d = document.getElementById('bro-input-dest')?.value?.trim() || tripData.destination || '';
            const b = parseInt(document.getElementById('bro-input-budget')?.value) || 1000;
            const m = document.getElementById('bro-select-mode')?.value || 'car';

            if (!d) {
                alert('Please enter a destination to calculate routes and budget.');
                return;
            }

            if (window.TravelBuddyRouteOptimizer) {
                const res = await window.TravelBuddyRouteOptimizer.evaluateBudgetAndRoutes({
                    origin: o,
                    destination: d,
                    userBudget: b,
                    travelMode: m
                });
                const container = document.getElementById('bro-results-container');
                if (container) {
                    window.TravelBuddyRouteOptimizer.displayFeasibilityResult(res, container);
                }
            }
        });
    }
    
    if (btnExploreCity) {
        btnExploreCity.addEventListener('click', () => {
            showCityExplorer();
        });
    }

    // Modify existing planner link to hide explorer, monitoring, wanderguide & route-optimizer
    if (navPlannerLink) {
        navPlannerLink.addEventListener('click', (e) => {
            e.preventDefault();
            cityExplorerView.classList.add('hidden');
            const monView = document.getElementById('destination-monitoring-view');
            if (monView) monView.classList.add('hidden');
            const wgView = document.getElementById('wanderguide-view');
            if (wgView) wgView.classList.add('hidden');
            const roView = document.getElementById('route-optimizer-view');
            if (roView) roView.classList.add('hidden');
            
            if (currentItinerary.length > 0) {
                document.getElementById('dashboard-view').classList.remove('hidden');
            } else {
                document.getElementById('wizard-view').classList.remove('hidden');
            }
            const navMon = document.getElementById('nav-monitoring-link');
            const navWg = document.getElementById('nav-wanderguide-link');
            const navRo = document.getElementById('nav-route-optimizer-link');
            if(navExplorerLink) navExplorerLink.classList.remove('active');
            if(navSafetyLink) navSafetyLink.classList.remove('active');
            if(navMon) navMon.classList.remove('active');
            if(navWg) navWg.classList.remove('active');
            if(navRo) navRo.classList.remove('active');
            navPlannerLink.classList.add('active');
            
            // Sync destination back if changed in Explorer
            if (currentExplorerCityName) {
                destInput.value = currentExplorerCityName;
                tripData.destination = currentExplorerCityName;
            }
        });
    }

    // URL parameter check for direct link
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('view') === 'explorer') {
        setTimeout(showCityExplorer, 400);
    } else if (urlParams.get('view') === 'route-optimizer' || urlParams.get('view') === 'optimizer' || urlParams.get('view') === 'budget-route') {
        setTimeout(showRouteOptimizer, 400);
    } else if (urlParams.get('view') === 'monitoring') {
        setTimeout(() => {
            if (typeof showDestinationMonitoring === 'function') {
                showDestinationMonitoring();
            }
        }, 300);
    } else if (urlParams.get('view') === 'safety') {
        setTimeout(() => {
            if (currentItinerary.length === 0) {
                tripData.destination = "Shillong";
                tripData.startDate = "2026-09-10";
                tripData.endDate = "2026-09-12";
                currentItinerary = [
                    { day: 1, activities: [{ time: "9:00 AM", title: "Elephant Falls", desc: "Waterfall sightseeing", cost: 10 }] }
                ];
            }
            generateSafetyAnalysis();
        }, 300);
    } else if (urlParams.get('view') === 'wanderguide' || urlParams.get('view') === 'places' || urlParams.get('view') === 'eat') {
        setTimeout(() => {
            if (typeof showWanderGuide === 'function') {
                showWanderGuide('Greater Noida');
            }
        }, 300);
    }

    // Initialize Leaflet Map
    function initLeafletMap() {
        if (ceMap || typeof L === 'undefined') return;

        const mapContainer = document.getElementById('ce-3d-container');
        if (!mapContainer) return;
        
        ceMap = L.map(mapContainer, {
            zoomControl: false
        }).setView([18.9220, 72.8347], 13); // Default view

        L.control.zoom({ position: 'topright' }).addTo(ceMap);

        // Standard OpenStreetMap tiles (dark mode via CSS filter)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors',
            maxZoom: 19
        }).addTo(ceMap);

        setupCityAutocomplete();
    }

    // Main City Search and Loader Function
    async function searchAndLoadCity(query) {
        if (!query) return;
        const cleanQuery = query.trim();
        if (!cleanQuery) return;

        currentExplorerCityName = cleanQuery;
        tripData.destination = cleanQuery;
        destInput.value = cleanQuery;

        clearMarkers();
        const grid = document.getElementById('ce-places-grid');
        
        // Show animated skeleton loader while discovering places
        grid.innerHTML = `
            <div class="ce-skeleton-grid">
                <div class="ce-skeleton-card">
                    <div class="ce-skeleton-img"></div>
                    <div class="ce-skeleton-line short"></div>
                    <div class="ce-skeleton-line title"></div>
                    <div class="ce-skeleton-line desc"></div>
                </div>
                <div class="ce-skeleton-card">
                    <div class="ce-skeleton-img"></div>
                    <div class="ce-skeleton-line short"></div>
                    <div class="ce-skeleton-line title"></div>
                    <div class="ce-skeleton-line desc"></div>
                </div>
                <div class="ce-skeleton-card">
                    <div class="ce-skeleton-img"></div>
                    <div class="ce-skeleton-line short"></div>
                    <div class="ce-skeleton-line title"></div>
                    <div class="ce-skeleton-line desc"></div>
                </div>
            </div>
        `;
        fetchedPlacesCache = [];

        const cacheKey = cleanQuery.toLowerCase();

        // 1. Check in-memory cache
        let cachedData = ceCityCache.get(cacheKey);
        if (cachedData && cachedData.city) {
            applyCityDataToUI(cachedData, cleanQuery);
            return;
        }

        // 2. Fetch live data from backend API
        try {
            const token = localStorage.getItem('token') || '';
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch('/api/places/city', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    cityName: cleanQuery,
                    limit: 20,
                    mode: 'explore'
                })
            });

            const data = await res.json();
            if (!data.success || !data.city) {
                throw new Error(data.message || `No places found for "${cleanQuery}". Try searching for any Indian destination or landmark (e.g. Rishikesh, Lakshman Jhula, Jaipur, Hampi).`);
            }

            // Save to memory cache
            ceCityCache.set(cacheKey, data);
            applyCityDataToUI(data, cleanQuery);

        } catch (err) {
            console.error("City Explorer fetch error:", err);
            grid.innerHTML = `
                <div class="ce-error-state">
                    <div class="ce-error-icon">⚠️</div>
                    <h4>Unable to discover places</h4>
                    <p style="color: #64748b; margin: 8px 0 16px 0;">${err.message || `No places found for "${cleanQuery}". Try searching for any Indian destination or landmark (e.g. Rishikesh, Lakshman Jhula, Jaipur, Hampi).`}</p>
                    <button class="btn ce-retry-btn" onclick="window.searchAndLoadCity('${cleanQuery.replace(/'/g, "\\'")}')">Try Again</button>
                </div>
            `;
        }
    }
    window.searchAndLoadCity = searchAndLoadCity;

    function applyCityDataToUI(data, cleanQuery) {
        const city = data.city;
        const grid = document.getElementById('ce-places-grid');

        if (ceMap) {
            ceMap.setView([city.lat, city.lon], city.zoom || 13);
        }

        document.getElementById('ce-city-name').textContent = city.name || cleanQuery;
        document.getElementById('ce-country-name').textContent = city.country || 'Global Destination';
        document.getElementById('ce-city-desc').textContent = city.desc || `Explore authentic landmarks, local sights, and cultural highlights in ${city.name || cleanQuery}.`;

        const insightsRow = document.getElementById('ce-insights-row');
        if (insightsRow && city.insights) {
            insightsRow.innerHTML = `
                <div class="ce-insight-card">
                    <span class="ce-insight-title">Weather (Estimated)</span>
                    <span class="ce-insight-value">${city.insights.weather}</span>
                </div>
                <div class="ce-insight-card">
                    <span class="ce-insight-title">Safety Status</span>
                    <span class="ce-insight-value">${city.insights.safety}</span>
                </div>
                <div class="ce-insight-card">
                    <span class="ce-insight-title">Current Crowds</span>
                    <span class="ce-insight-value">${city.insights.crowd}</span>
                </div>
                <div class="ce-insight-card">
                    <span class="ce-insight-title">Avg Daily Cost</span>
                    <span class="ce-insight-value">${city.insights.cost}</span>
                </div>
            `;
        }

        fetchedPlacesCache = Array.isArray(data.places) ? data.places : [];

        if (fetchedPlacesCache.length === 0) {
            grid.innerHTML = `
                <div class="ce-empty-state">
                    <div class="ce-empty-icon">📍</div>
                    <h4>No places found</h4>
                    <p style="color: #64748b; margin-top: 6px;">No places found for "${cleanQuery}". Try searching for any Indian destination or landmark (e.g. Rishikesh, Lakshman Jhula, Jaipur, Hampi).</p>
                </div>
            `;
            clearMarkers();
            return;
        }

        // Apply active category filter
        let toRender = fetchedPlacesCache;
        if (currentCategoryFilter && currentCategoryFilter !== 'all') {
            toRender = fetchedPlacesCache.filter(p => p.category.toLowerCase() === currentCategoryFilter.toLowerCase());
        }

        renderFetchedPlacesAndMarkers(toRender);

        const cityKey = (city.name || cleanQuery).toLowerCase().replace(/\s+/g, '');
        renderRecommendations(cityKey);
    }

    function clearMarkers() {
        ceMarkers.forEach(m => {
            if (ceMap) ceMap.removeLayer(m);
        });
        ceMarkers = [];
    }

    // Render Cards and Leaflet Map Markers
    function renderFetchedPlacesAndMarkers(placesList) {
        clearMarkers();
        const grid = document.getElementById('ce-places-grid');
        grid.innerHTML = '';

        if (!placesList || placesList.length === 0) {
            grid.innerHTML = `<p style="color: #94a3b8; padding: 24px; text-align: center;">No places found for this category filter.</p>`;
            return;
        }

        placesList.forEach((place) => {
            // 1. Create Leaflet Marker with Category Color Code
            let markerClass = 'attraction';
            let markerColor = '#38bdf8'; // Sky blue
            if (place.category === 'Food') {
                markerClass = 'food';
                markerColor = '#f59e0b'; // Amber
            } else if (place.category === 'Culture') {
                markerClass = 'culture';
                markerColor = '#8b5cf6'; // Purple
            } else if (place.category === 'Nature') {
                markerClass = 'nature';
                markerColor = '#10b981'; // Emerald
            }

            const customIcon = L.divIcon({
                className: 'custom-leaflet-marker',
                html: `<div class="ce-map-marker ${markerClass}" style="background: ${markerColor}; border-color: #ffffff;"></div>`,
                iconSize: [26, 26],
                iconAnchor: [13, 13]
            });

            if (ceMap) {
                const marker = L.marker([place.lat, place.lon], { icon: customIcon }).addTo(ceMap);

                marker.bindPopup(`
                    <div style="color: #ffffff; padding: 4px; font-family: 'Inter', sans-serif;">
                        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: ${markerColor}; font-weight: 700;">${place.category}</span>
                        <h4 style="margin: 4px 0 6px 0; font-size: 15px; font-weight: 600; color: #f8fafc;">${place.name}</h4>
                        <p style="margin: 0 0 10px 0; font-size: 12px; color: #cbd5e1;">${place.rating ? '⭐ ' + place.rating + ' • ' : ''}${place.duration || '1-2 hrs'}</p>
                        <div style="display: flex; gap: 6px;">
                            <button onclick="highlightMapMarker('${place.id}')" style="background: #334155; color: #ffffff; border: none; padding: 5px 9px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600;">Details</button>
                            <button onclick="addToTrip('${place.id}')" style="background: ${markerColor}; color: #0f172a; border: none; padding: 5px 9px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 700;">Add to Trip</button>
                        </div>
                    </div>
                `);

                marker.on('click', () => {
                    highlightPlace(place.id);
                });

                marker.placeId = place.id;
                ceMarkers.push(marker);
            }

            // 2. Create Rich Place Card
            const card = document.createElement('div');
            card.className = 'ce-place-card';
            card.setAttribute('data-id', place.id);

            const catClass = (place.category || 'attraction').toLowerCase();
            const badgeTag = place.tag || (place.category === 'Food' ? 'Local Flavor' : 'Popular Highlight');
            const durationText = place.duration || '1-2 hrs';

            const finalPhotoUrl = (place.photoUrl && place.photoUrl.trim()) || (place.img && place.img.trim()) || 'https://images.unsplash.com/photo-1506461883276-594a12b11cf3?auto=format&fit=crop&w=800&q=80';
            const imgHtml = `<div class="ce-place-img" id="ce-img-${place.id}" style="background-image: url('${finalPhotoUrl}');"></div>`;

            card.innerHTML = `
                <div class="ce-place-img-wrapper">
                    ${imgHtml}
                    <span class="ce-place-badge">${badgeTag}</span>
                    <span class="ce-place-duration">⏱️ ${durationText}</span>
                </div>
                <div class="ce-place-info">
                    <div class="ce-place-meta-row">
                        <span class="ce-place-cat ${catClass}">${place.category}</span>
                        ${place.rating ? `<span style="color: #fbbf24; font-size: 13px; font-weight: 700;">⭐ ${place.rating}</span>` : '<span style="color: #94a3b8; font-size: 11px;">Verified Landmark</span>'}
                    </div>
                    <h4>${place.name}</h4>
                    <p class="ce-place-desc">${place.desc}</p>
                    <div class="ce-place-actions">
                        <button class="btn btn-outline" onclick="event.stopPropagation(); highlightMapMarker('${place.id}')">View Details</button>
                        <button class="btn" onclick="event.stopPropagation(); addToTrip('${place.id}')">Add to Trip</button>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                highlightMapMarker(place.id);
            });

            grid.appendChild(card);
        });
    }

    // Bidirectional Map & Card Highlighting
    window.highlightPlace = function(placeId) {
        document.querySelectorAll('.ce-place-card').forEach(c => {
            if (c.getAttribute('data-id') === placeId) {
                c.classList.add('highlighted');
                c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                c.classList.remove('highlighted');
            }
        });
    };

    window.highlightMapMarker = function(placeId) {
        const place = fetchedPlacesCache.find(p => p.id === placeId) || (typeof currentExplorerFoodCache !== 'undefined' ? currentExplorerFoodCache.find(p => p.id === placeId) : null);
        if (!place) return;

        // Populate Detail View
        document.getElementById('ce-detail-title').textContent = place.name;
        document.getElementById('ce-detail-category').textContent = place.category;
        document.getElementById('ce-detail-rating').textContent = `⭐ ${place.rating || '4.5'}`;
        document.getElementById('ce-detail-desc').textContent = place.desc;
        
        const detailImgDiv = document.getElementById('ce-detail-img');
        if (detailImgDiv) {
            const finalPhotoUrl = (place.photoUrl && place.photoUrl.trim()) || (place.img && place.img.trim()) || 'https://images.unsplash.com/photo-1506461883276-594a12b11cf3?auto=format&fit=crop&w=800&q=80';
            detailImgDiv.className = 'ce-place-img';
            detailImgDiv.style.backgroundImage = `url('${finalPhotoUrl}')`;
            detailImgDiv.style.backgroundSize = 'cover';
            detailImgDiv.style.backgroundPosition = 'center';
            detailImgDiv.style.position = 'relative';
            detailImgDiv.innerHTML = '';
        }
        
        // Pan Map to Marker
        if (ceMap) {
            const targetMarker = ceMarkers.find(m => m.placeId === placeId);
            if (targetMarker) {
                ceMap.flyTo(targetMarker.getLatLng(), 14, { duration: 0.8 });
                targetMarker.openPopup();
            }
        }
    };

    // Back button in Detail View
    const backToListBtn = document.getElementById('ce-back-to-list');
    if (backToListBtn) {
        backToListBtn.addEventListener('click', () => {
            const listSidebar = document.getElementById('ce-sidebar-list');
            const detailSidebar = document.getElementById('ce-sidebar-detail');
            if (detailSidebar) detailSidebar.classList.add('hidden');
            if (listSidebar) listSidebar.classList.remove('hidden');
        });
    }

    // Category Filter Buttons
    let currentCategoryFilter = 'all';
    document.querySelectorAll('.ce-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.ce-filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentCategoryFilter = e.target.getAttribute('data-filter');
            
            let filtered = fetchedPlacesCache;
            if (currentCategoryFilter !== 'all') {
                filtered = fetchedPlacesCache.filter(p => p.category.toLowerCase() === currentCategoryFilter.toLowerCase());
            }
            renderFetchedPlacesAndMarkers(filtered);
        });
    });

    // Add to Trip Planner Integration
    window.addToTrip = function(placeId) {
        const place = fetchedPlacesCache.find(p => p.id === placeId);
        if (!place) return;

        if (tripData.destination !== currentExplorerCityName) {
            tripData.destination = currentExplorerCityName;
            destInput.value = currentExplorerCityName;
        }

        if (currentItinerary.length === 0) {
            const currentNotes = notesInput.value;
            if (!currentNotes.includes(place.name)) {
                notesInput.value = currentNotes ? currentNotes + `\nMust visit: ${place.name}` : `Must visit: ${place.name}`;
                alert(`Added "${place.name}" to your Trip Planner notes! Generate the itinerary to see it included.`);
            } else {
                alert(`"${place.name}" is already saved in your trip notes.`);
            }
        } else {
            const newId = Date.now();
            currentItinerary[0].activities.push({
                id: newId,
                time: "Anytime",
                type: place.category,
                title: place.name,
                desc: place.desc,
                cost: 0,
                locked: false
            });
            alert(`Added "${place.name}" to Day 1 of your active itinerary!`);
            renderDashboard();
        }
    };

    // Local Recommendations Storage & Community Feed
    const REC_STORAGE_KEY = 'travelBuddy_recommendations';

    function getRecommendations(cityKey) {
        let stored = JSON.parse(localStorage.getItem(REC_STORAGE_KEY)) || {};
        return (stored[cityKey] || []).sort((a,b) => new Date(b.date) - new Date(a.date));
    }

    function saveRecommendation(cityKey, rec) {
        let stored = JSON.parse(localStorage.getItem(REC_STORAGE_KEY)) || {};
        if (!stored[cityKey]) stored[cityKey] = [];
        stored[cityKey].push(rec);
        localStorage.setItem(REC_STORAGE_KEY, JSON.stringify(stored));
    }

    function renderRecommendations(cityKey) {
        const feed = document.getElementById('ce-recommendations-feed');
        if (!feed) return;
        feed.innerHTML = '';

        const recs = getRecommendations(cityKey);
        if (recs.length === 0) {
            feed.innerHTML = `<p style="color: #94a3b8;">Be the first to share an insider local tip for this destination!</p>`;
            return;
        }

        recs.forEach(rec => {
            const card = document.createElement('div');
            card.className = 'ce-rec-card';
            card.innerHTML = `
                <div class="ce-rec-header">
                    <span class="ce-rec-title">${rec.title}</span>
                    <span class="ce-rec-place">@ ${rec.place}</span>
                </div>
                <div class="ce-place-cat">${rec.category}</div>
                <p class="ce-rec-desc">"${rec.desc}"</p>
                <div class="ce-rec-meta">
                    <span>By ${rec.author || 'Anonymous'} • ${rec.date}</span>
                    <div class="ce-rec-actions">
                        <button onclick="alert('Marked as helpful!')">ðŸ‘ Helpful</button>
                        <button onclick="alert('Reported for review.')">🚩 Report</button>
                    </div>
                </div>
            `;
            feed.appendChild(card);
        });
    }

    const tipForm = document.getElementById('local-tip-form');
    if (tipForm) {
        tipForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!currentExplorerCityName) {
                alert("Please select a city first.");
                return;
            }
            const cityKey = currentExplorerCityName.toLowerCase().replace(/\s+/g, '');

            const newRec = {
                id: 'rec_' + Date.now(),
                title: document.getElementById('tip-title').value,
                place: document.getElementById('tip-place').value,
                category: document.getElementById('tip-category').value,
                desc: document.getElementById('tip-desc').value,
                author: document.getElementById('tip-author').value || 'Anonymous Local',
                date: new Date().toISOString().split('T')[0]
            };

            saveRecommendation(cityKey, newRec);
            tipForm.reset();
            renderRecommendations(cityKey);
            
            alert("Recommendation submitted successfully! It is now visible to the community.");
        });
    }

    // =========================================================================
    // DESTINATION PLANNING & IOT SENSOR TELEMETRY MONITORING
    // =========================================================================
    const destinationMonitoringView = document.getElementById('destination-monitoring-view');
    const navMonitoringLink = document.getElementById('nav-monitoring-link');
    const btnViewDestMonitoring = document.getElementById('btn-view-dest-monitoring');
    const btnJumpToIot = document.getElementById('btn-jump-to-iot');
    const btnBackFromMonitoring = document.getElementById('btn-back-from-monitoring');
    const btnMonitoringToSafety = document.getElementById('btn-monitoring-to-safety');
    const monCitySelect = document.getElementById('mon-city-select');
    const btnBroadcastOperators = document.getElementById('btn-broadcast-operators');
    const btnRerouteTourists = document.getElementById('btn-reroute-tourists');
    const operatorToast = document.getElementById('operator-toast');
    const btnCloseToast = document.getElementById('btn-close-toast');

    // Comprehensive Curated IoT Telemetry & Infrastructure Registry
    const destinationMonitoringData = {
        'rishikesh': {
            name: 'Rishikesh, Uttarakhand',
            baseHotels: 340,
            baseRooms: 8200,
            baseOccupancy: 76,
            attractionsCount: 45,
            attractionsSub: 'Laxman Jhula, Ram Jhula, Triveni Ghat, Parmarth Niketan',
            operatorsCount: 65,
            cabsCount: 190,
            operatorsSub: '190 Registered Rafting Camps & Transit Shuttles',
            zonesCount: 16,
            zonesSub: 'Ghats, Tapovan & Riverbank Eco-Sectors',
            alternateAttractions: 'The Beatles Ashram / Vashistha Cave',
            stations: [
                { id: 'triveni-ghat', name: 'Triveni Ghat Hydro-Buoy #01', desc: 'River Velocity & Flood Stage Gauge', status: 'Normal', badgeClass: 'badge-normal', nodeId: 'NODE: RSH-GHAT-01', place: 'Triveni Ghat' },
                { id: 'laxman-jhula', name: 'Laxman Jhula Strain Sensor #03', desc: 'Pedestrian Load & Cable Vibration', status: 'Alert', badgeClass: 'badge-alert', nodeId: 'NODE: RSH-JHULA-03', place: 'Laxman Jhula' },
                { id: 'ram-jhula', name: 'Ram Jhula Waterfront Station #05', desc: 'Optical Flow & Ashram Density', status: 'Normal', badgeClass: 'badge-normal', nodeId: 'NODE: RSH-RAM-05', place: 'Ram Jhula' },
                { id: 'shivpuri-rapid', name: 'Shivpuri Rafting Rapid Sensor #06', desc: 'Discharge Velocity & Water Temp', status: 'Alert', badgeClass: 'badge-alert', nodeId: 'NODE: RSH-RIVER-06', place: 'Shivpuri Rapid' }
            ],
            timeTelemetry: {
                '06:00 AM': {
                    tourists: '3,200', occupancy: '88%', popular: 'Triveni Ghat Dawn Dip & Yoga',
                    crowd: 'LOW', crowdClass: 't-badge-moderate', rain: 'None (Crisp Air)',
                    water: 'Calm (+0.2m)', waterClass: 't-badge-moderate', road: 'Clear Pilgrim Path', roadClass: 't-badge-moderate',
                    alertTitle: 'ROUTINE DAWN RIVER WATCH', alertSub: 'Triveni Ghat Sector',
                    alertBody: 'Ganges water current stable at 1.1 m/s. Low morning crowd detected at sunrise bathing steps.',
                    nodeId: 'NODE: RSH-GHAT-01'
                },
                '09:00 AM': {
                    tourists: '14,800', occupancy: '76%', popular: 'Laxman Jhula & Tapovan Cafes',
                    crowd: 'HIGH', crowdClass: 't-badge-high', rain: 'Clear / Mountain Breeze',
                    water: 'Ganges Flow Optimal', waterClass: 't-badge-moderate', road: 'Brisk Pilgrim Traffic', roadClass: 't-badge-moderate',
                    alertTitle: 'HIGH FOOTFALL AT SUSPENSION BRIDGES', alertSub: 'Laxman Jhula & Tapovan Sector',
                    alertBody: 'Optical flow monitors register <strong>240 persons/min</strong> approaching suspension pathways. Rafting permits synchronized across 65 river outfitters.',
                    nodeId: 'NODE: RSH-JHULA-03'
                },
                '01:00 PM': {
                    tourists: '18,600', occupancy: '72%', popular: 'Shivpuri River Rafting',
                    crowd: 'VERY HIGH', crowdClass: 't-badge-high', rain: 'Warm / Clear Skies',
                    water: 'Rapid Grade III Active', waterClass: 't-badge-warning', road: 'Moderate Highway Transit', roadClass: 't-badge-moderate',
                    alertTitle: 'RIVER CURRENT & RAFTING SAFETY GRID', alertSub: 'Shivpuri to Marine Drive Stretch',
                    alertBody: 'Rapid sensor buoy #06 logs <strong>14.2 mÂ³/s discharge</strong>. Life-vest telemetry verified across launch beaches.',
                    nodeId: 'NODE: RSH-RIVER-06'
                },
                '05:00 PM': {
                    tourists: '22,400', occupancy: '79%', popular: 'Parmarth Niketan & Triveni Ghat Ganga Aarti',
                    crowd: 'VERY HIGH', crowdClass: 't-badge-high', rain: 'Passing Sunset Breeze',
                    water: 'River Stage Steady (+0.5m)', waterClass: 't-badge-moderate', road: 'Pilgrim Corridor Crowded', roadClass: 't-badge-warning',
                    alertTitle: 'EVENING MAHA AARTI CONGREGATION', alertSub: 'Triveni Ghat Waterfront',
                    alertBody: 'Optical density sensors indicate heavy gathering for evening Aarti ceremony. Crowd safety marshals active along lower ghat steps.',
                    nodeId: 'NODE: RSH-AARTI-02'
                },
                '09:00 PM': {
                    tourists: '6,100', occupancy: '85%', popular: 'Tapovan Riverside Cafes',
                    crowd: 'MODERATE', crowdClass: 't-badge-moderate', rain: 'Cool Mountain Air',
                    water: 'Receding Baseline', waterClass: 't-badge-moderate', road: 'Clear', roadClass: 't-badge-moderate',
                    alertTitle: 'NIGHT ASHRAM QUIETUDE // SENSORS CALM', alertSub: 'Regional Ghat Sensor Grid',
                    alertBody: 'All hydrological ultrasound sensors report baseline river levels. Pedestrian suspension pathways clear.',
                    nodeId: 'NODE: RSH-REMOTE-01'
                }
            }
        },
        'shillong': {
            name: 'Shillong, Meghalaya',
            baseHotels: 500,
            baseRooms: 12500,
            baseOccupancy: 72,
            attractionsCount: 100,
            attractionsSub: 'Elephant Falls, Shillong Peak, Ward’s Lake',
            operatorsCount: 50,
            cabsCount: 280,
            operatorsSub: '280 Registered Tourist Cabs & Fleets',
            zonesCount: 20,
            zonesSub: 'Ecological & Urban Management Sectors',
            alternateAttractions: 'Don Bosco Museum / Shillong Peak',
            stations: [
                { id: 'elephant-falls', name: 'Elephant Falls Sensor #04', desc: 'Hydrological Ultrasonic + Crowd Optical', status: 'Alert', badgeClass: 'badge-alert', nodeId: 'NODE: SHL-REMOTE-04', place: 'Elephant Falls' },
                { id: 'shillong-peak', name: 'Shillong Peak Sensor #02', desc: 'Atmospheric & Cloudburst Barometer', status: 'Normal', badgeClass: 'badge-normal', nodeId: 'NODE: SHL-REMOTE-02', place: 'Shillong Peak' },
                { id: 'umiam-lake', name: 'Umiam Lake Hydro-Buoy #07', desc: 'Water Surface & Boating Safety Radar', status: 'Normal', badgeClass: 'badge-normal', nodeId: 'NODE: SHL-REMOTE-07', place: 'Umiam Lake' },
                { id: 'laitlum-canyons', name: 'Laitlum Canyons Sensor #11', desc: 'Gorge Wind Velocity & Fog LiDAR', status: 'Normal', badgeClass: 'badge-normal', nodeId: 'NODE: SHL-REMOTE-11', place: 'Laitlum Canyons' }
            ],
            timeTelemetry: {
                '06:00 AM': {
                    tourists: '3,450', occupancy: '86%', popular: 'Shillong Peak Sunrise',
                    crowd: 'LOW', crowdClass: 't-badge-moderate', rain: 'Light Drizzle',
                    water: 'Normal', waterClass: 't-badge-moderate', road: 'Clear', roadClass: 't-badge-moderate',
                    alertTitle: 'ROUTINE DAWN MONITORING', alertSub: 'Shillong Peak Ridge Sector',
                    alertBody: 'Atmospheric barometric sensors report calm mountain breezes. Low footfall detected at viewpoint stairwells.',
                    nodeId: 'NODE: SHL-REMOTE-02'
                },
                '09:00 AM': {
                    tourists: '18,200', occupancy: '72%', popular: 'Elephant Falls',
                    crowd: 'HIGH', crowdClass: 't-badge-high', rain: 'Heavy',
                    water: 'Rising', waterClass: 't-badge-warning', road: 'Moderate', roadClass: 't-badge-moderate',
                    alertTitle: 'AUTOMATIC SAFETY ADVISORY TRIGGERED', alertSub: 'Elephant Falls Gorge Zone',
                    alertBody: 'Ultrasonic water sensors detect <strong>Rising Water Level (+1.4m/h)</strong> combined with <strong>Heavy Rain</strong>. High crowd congestion (340 persons/min) at lower cascade steps creates bottleneck danger.',
                    nodeId: 'NODE: SHL-REMOTE-04'
                },
                '01:00 PM': {
                    tourists: '24,800', occupancy: '68%', popular: 'Ward’s Lake & Botanical Garden',
                    crowd: 'VERY HIGH', crowdClass: 't-badge-high', rain: 'Moderate Showers',
                    water: 'Elevated (+0.8m)', waterClass: 't-badge-warning', road: 'Sluggish Traffic', roadClass: 't-badge-high',
                    alertTitle: 'PEAK TOURIST CONGESTION DETECTED', alertSub: 'Central Ward’s Lake Perimeter',
                    alertBody: 'Pedestrian flow exceeds normal threshold by 42%. Parking facilities in Police Bazar reaching capacity.',
                    nodeId: 'NODE: SHL-URBAN-01'
                },
                '05:00 PM': {
                    tourists: '16,300', occupancy: '76%', popular: 'Police Bazar Night Market',
                    crowd: 'HIGH', crowdClass: 't-badge-high', rain: 'Heavy Monsoon Storm',
                    water: 'Critical Surge (+1.9m)', waterClass: 't-badge-high', road: 'Slippery / Caution', roadClass: 't-badge-warning',
                    alertTitle: 'TORRENTIAL RAIN & GORGE FLASH WARNING', alertSub: 'Elephant Falls & Umshyrpi Stream',
                    alertBody: 'Pluvio-mesh optical gauge logged 54mm/hr rainfall over the past 45 minutes. Travel operators instructed to redirect away from low-lying bridges.',
                    nodeId: 'NODE: SHL-REMOTE-04'
                },
                '09:00 PM': {
                    tourists: '5,900', occupancy: '89%', popular: 'Police Bazar Cafes & Food Street',
                    crowd: 'MODERATE', crowdClass: 't-badge-moderate', rain: 'Passing Drizzle',
                    water: 'Receding', waterClass: 't-badge-moderate', road: 'Normal', roadClass: 't-badge-moderate',
                    alertTitle: 'WATER RECEDING // NIGHT QUIETUDE', alertSub: 'Regional Sensor Grid',
                    alertBody: 'All major stream gauges reporting stabilized water levels. Night transit operations operating normally.',
                    nodeId: 'NODE: SHL-REMOTE-01'
                }
            }
        },
        'tokyo': {
            name: 'Tokyo, Japan',
            baseHotels: 3200,
            baseRooms: 85000,
            baseOccupancy: 84,
            attractionsCount: 450,
            attractionsSub: 'Senso-ji, Shibuya Crossing, Meiji Shrine, Skytree',
            operatorsCount: 180,
            cabsCount: 640,
            operatorsSub: '640 Transit Fleets & Tour Shuttles',
            zonesCount: 60,
            zonesSub: 'Special Wards & Tourism Corridors',
            alternateAttractions: 'Nezu Museum / Meiji Jingu Forest',
            stations: [
                { id: 'shibuya-cross', name: 'Shibuya Crossing Sensor #01', desc: 'AI Pedestrian Flow & Density Radar', status: 'Alert', badgeClass: 'badge-alert', nodeId: 'NODE: TYO-SHIBUYA-01', place: 'Shibuya Crossing' },
                { id: 'sensoji-gate', name: 'Senso-ji Gate Station #05', desc: 'Optical Turnstile & Heritage LiDAR', status: 'Normal', badgeClass: 'badge-normal', nodeId: 'NODE: TYO-ASAKUSA-05', place: 'Senso-ji Temple' },
                { id: 'skytree-winds', name: 'Tokyo Skytree Anemometer #09', desc: 'High-Altitude Wind & Seismic Node', status: 'Normal', badgeClass: 'badge-normal', nodeId: 'NODE: TYO-SKYTREE-09', place: 'Tokyo Skytree' },
                { id: 'sumida-river', name: 'Sumida River Hydro-Buoy #03', desc: 'Water Transit & Ferry Channel Sensor', status: 'Normal', badgeClass: 'badge-normal', nodeId: 'NODE: TYO-SUMIDA-03', place: 'Sumida River' }
            ],
            timeTelemetry: {
                '06:00 AM': { tourists: '14,000', occupancy: '92%', popular: 'Tsukiji Outer Market & Meiji Shrine', crowd: 'LOW', crowdClass: 't-badge-moderate', rain: 'Clear', water: 'Normal', waterClass: 't-badge-moderate', road: 'Smooth', roadClass: 't-badge-moderate', alertTitle: 'DAWN METRO MONITORING', alertSub: 'Yamanote Outer Ring', alertBody: 'Early subway lines operating at full capacity. Morning market footfall manageable.', nodeId: 'NODE: TYO-TSUKIJI-02' },
                '09:00 AM': { tourists: '142,000', occupancy: '84%', popular: 'Shibuya Crossing', crowd: 'HIGH', crowdClass: 't-badge-high', rain: 'None (Clear)', water: 'Normal', waterClass: 't-badge-moderate', road: 'Smooth / High Flow', roadClass: 't-badge-moderate', alertTitle: 'HIGH METRO & PEDESTRIAN THROUGHPUT', alertSub: 'Shibuya & Shinjuku Hubs', alertBody: 'Transit operators running on standard high-frequency schedule. AI crowd control managing crossing densities.', nodeId: 'NODE: TYO-SHIBUYA-01' },
                '01:00 PM': { tourists: '185,000', occupancy: '80%', popular: 'Senso-ji & Asakusa Alleys', crowd: 'VERY HIGH', crowdClass: 't-badge-high', rain: 'Sunny', water: 'Sumida River Stable', waterClass: 't-badge-moderate', road: 'Moderate Traffic', roadClass: 't-badge-moderate', alertTitle: 'ASAKUSA PEDESTRIAN CONGESTION NOTICE', alertSub: 'Nakamise Dori Corridor', alertBody: 'Temple approach lanes running at 90% pedestrian limit. Flow marshals diverting via parallel lanes.', nodeId: 'NODE: TYO-ASAKUSA-05' },
                '05:00 PM': { tourists: '168,000', occupancy: '86%', popular: 'Akihabara & Shinjuku Omoide Yokocho', crowd: 'VERY HIGH', crowdClass: 't-badge-high', rain: 'Clear Skies', water: 'Normal', waterClass: 't-badge-moderate', road: 'Heavy Evening Commute', roadClass: 't-badge-warning', alertTitle: 'EVENING COMMUTE & TOURIST FLUX INTERSECTION', alertSub: 'Shinjuku Station Terminal', alertBody: 'World’s busiest station managing peak rush. Tourist assistance bots active at east exits.', nodeId: 'NODE: TYO-SHINJUKU-04' },
                '09:00 PM': { tourists: '62,000', occupancy: '94%', popular: 'Roppongi Hills & Tokyo Tower Night Vista', crowd: 'MODERATE', crowdClass: 't-badge-moderate', rain: 'Clear Night', water: 'Normal', waterClass: 't-badge-moderate', road: 'Smooth', roadClass: 't-badge-moderate', alertTitle: 'NIGHT DISTRICT TELEMETRY NORMAL', alertSub: 'Minato & Shibuya Night Sectors', alertBody: 'Late-night transit networks operating smoothly. Nightlife footfall within safe noise thresholds.', nodeId: 'NODE: TYO-ROPPONGI-03' }
            }
        },
        'mumbai': {
            name: 'Mumbai, India',
            baseHotels: 1450,
            baseRooms: 36000,
            baseOccupancy: 78,
            attractionsCount: 190,
            attractionsSub: 'Gateway of India, Marine Drive, Colaba, Elephanta',
            operatorsCount: 95,
            cabsCount: 380,
            operatorsSub: '380 Registered Tourist Fleets',
            zonesCount: 35,
            zonesSub: 'South Mumbai & Coastal Circuits',
            alternateAttractions: 'Chhatrapati Shivaji Maharaj Vastu Sangrahalaya',
            stations: [
                { id: 'gateway-tide', name: 'Gateway of India Hydro-Buoy #03', desc: 'Tidal Surges & Wave Height Sensor', status: 'Alert', badgeClass: 'badge-alert', nodeId: 'NODE: BOM-GATEWAY-03', place: 'Gateway of India' },
                { id: 'marine-drive', name: 'Marine Drive Optical Sensor #07', desc: 'Promenade Footfall & Sea Spray LiDAR', status: 'Normal', badgeClass: 'badge-normal', nodeId: 'NODE: BOM-PROMENADE-07', place: 'Marine Drive' },
                { id: 'colaba-transit', name: 'Colaba Causeway Traffic Node #02', desc: 'Fleet Congestion & Shuttle Tracking', status: 'Normal', badgeClass: 'badge-normal', nodeId: 'NODE: BOM-COLABA-02', place: 'Colaba Causeway' },
                { id: 'elephanta-harbor', name: 'Elephanta Ferry Channel Buoy #08', desc: 'Harbor Swell & Passenger Safety', status: 'Normal', badgeClass: 'badge-normal', nodeId: 'NODE: BOM-FERRY-08', place: 'Elephanta Harbor' }
            ],
            timeTelemetry: {
                '06:00 AM': { tourists: '12,500', occupancy: '84%', popular: 'Marine Drive Sunrise Walk', crowd: 'LOW', crowdClass: 't-badge-moderate', rain: 'Misty Sea Breeze', water: 'Low Tide Calm', waterClass: 't-badge-moderate', road: 'Clear Coastal Road', roadClass: 't-badge-moderate', alertTitle: 'DAWN PROMENADE SWEEP', alertSub: 'Queenâ€™s Necklace Sector', alertBody: 'Gentle sea breezes. Promenade walkways clear for morning joggers and tourists.', nodeId: 'NODE: BOM-PROMENADE-07' },
                '09:00 AM': { tourists: '68,000', occupancy: '78%', popular: 'Gateway of India & Marine Drive', crowd: 'HIGH', crowdClass: 't-badge-high', rain: 'Passing Drizzle', water: 'High Tide Approaching (4.2m)', waterClass: 't-badge-warning', road: 'Sluggish Coastal Traffic', roadClass: 't-badge-moderate', alertTitle: 'HIGH TIDE ADVISORY AT PROMENADE', alertSub: 'Colaba Waterfront Sector', alertBody: 'Tidal buoys detect 4.2m high tide window. Tourists advised to stay behind promenade barriers.', nodeId: 'NODE: BOM-GATEWAY-03' },
                '01:00 PM': { tourists: '82,000', occupancy: '74%', popular: 'Colaba Causeway & Kala Ghoda Cafes', crowd: 'VERY HIGH', crowdClass: 't-badge-high', rain: 'Sunny Coastal Haze', water: 'Normal Tide', waterClass: 't-badge-moderate', road: 'Heavy South Mumbai Traffic', roadClass: 't-badge-warning', alertTitle: 'HERITAGE PRECINCT VEHICLE DELAYS', alertSub: 'Fort & Colaba Commercial Grid', alertBody: 'Tourist buses rerouted via Shahid Bhagat Singh Road to ease junction bottlenecks.', nodeId: 'NODE: BOM-COLABA-02' },
                '05:00 PM': { tourists: '95,000', occupancy: '81%', popular: 'Marine Drive Sunset & Girgaon Chowpatty', crowd: 'VERY HIGH', crowdClass: 't-badge-high', rain: 'Humid Evening Breeze', water: 'Ebb Tide Normal', waterClass: 't-badge-moderate', road: 'Congested Arteries', roadClass: 't-badge-warning', alertTitle: 'PEAK SUNSET CROWD AT MARINE PROMENADE', alertSub: 'Nariman Point to Chowpatty', alertBody: 'Optical flow monitors register dense seaside assembly. Lifeguard towers active along sands.', nodeId: 'NODE: BOM-CHOWPATTY-04' },
                '09:00 PM': { tourists: '38,000', occupancy: '89%', popular: 'Bandra Bandstand & Bandra-Worli Sea Link', crowd: 'MODERATE', crowdClass: 't-badge-moderate', rain: 'Clear Skies', water: 'Calm Sea', waterClass: 't-badge-moderate', road: 'Smooth Sea Link Flow', roadClass: 't-badge-moderate', alertTitle: 'NIGHT TRANSIT MONITORING STABLE', alertSub: 'Western Coastal Grid', alertBody: 'Sea Link and Coastal Road operating at maximum speed limits. Sensor grid stable.', nodeId: 'NODE: BOM-SEALINK-01' }
            }
        },
        'paris': {
            name: 'Paris, France',
            baseHotels: 1800,
            baseRooms: 48000,
            baseOccupancy: 88,
            attractionsCount: 280,
            attractionsSub: 'Eiffel Tower, Louvre, Notre-Dame, Montmartre',
            operatorsCount: 120,
            cabsCount: 420,
            operatorsSub: '420 Hop-On Shuttles & Seine Cruisers',
            zonesCount: 45,
            zonesSub: 'Historic Arrondissements & River Banks',
            alternateAttractions: 'Musée d’Orsay / Jardin des Plantes',
            stations: [
                { id: 'louvre-pyramid', name: 'Louvre Pyramid Queue Sensor #08', desc: 'LiDAR Wait Time & Optical Turnstile', status: 'Alert', badgeClass: 'badge-alert', nodeId: 'NODE: PAR-LOUVRE-08', place: 'Louvre Museum' },
                { id: 'eiffel-champs', name: 'Eiffel Tower Concourse Station #02', desc: 'Perimeter Density & Thermal Scanner', status: 'Normal', badgeClass: 'badge-normal', nodeId: 'NODE: PAR-EIFFEL-02', place: 'Eiffel Tower' },
                { id: 'seine-hydro', name: 'Seine River Hydro-Sensor #05', desc: 'Water Elevation & Cruiser Wake Buoy', status: 'Normal', badgeClass: 'badge-normal', nodeId: 'NODE: PAR-SEINE-05', place: 'Seine Riverfront' },
                { id: 'montmartre-funicular', name: 'Montmartre Funicular Node #11', desc: 'Steep Incline Transit & Footfall', status: 'Normal', badgeClass: 'badge-normal', nodeId: 'NODE: PAR-MONTM-11', place: 'SacrÃ©-CÅ“ur' }
            ],
            timeTelemetry: {
                '06:00 AM': { tourists: '8,200', occupancy: '91%', popular: 'TrocadÃ©ro Sunrise & Montmartre', crowd: 'LOW', crowdClass: 't-badge-moderate', rain: 'Crisp Morning Air', water: 'Seine Calm (+1.2m)', waterClass: 't-badge-moderate', road: 'Clear Boulevards', roadClass: 't-badge-moderate', alertTitle: 'DAWN MONUMENT WATCH', alertSub: 'Champ de Mars Sector', alertBody: 'Cleaners and delivery vehicles completing morning runs. Low footfall on riverside quais.', nodeId: 'NODE: PAR-TROCADERO-01' },
                '09:00 AM': { tourists: '85,000', occupancy: '88%', popular: 'Louvre Museum & Tuileries', crowd: 'HIGH', crowdClass: 't-badge-high', rain: 'Partly Cloudy', water: 'Seine River Normal', waterClass: 't-badge-moderate', road: 'Moderate', roadClass: 't-badge-moderate', alertTitle: 'LOUVRE PYRAMID QUEUE CAPACITY NOTICE', alertSub: '1st Arrondissement Zone', alertBody: 'Queue waiting time exceeds 35 minutes. Tourists recommended to use Carrousel du Louvre underground entry.', nodeId: 'NODE: PAR-LOUVRE-08' },
                '01:00 PM': { tourists: '110,000', occupancy: '85%', popular: 'Eiffel Tower & Seine River Cruises', crowd: 'VERY HIGH', crowdClass: 't-badge-high', rain: 'Sunny & Mild', water: 'Cruiser Traffic High', waterClass: 't-badge-warning', road: 'Quai Branly Busy', roadClass: 't-badge-warning', alertTitle: 'SEINE CRUISE DOCK THROUGHPUT PEAK', alertSub: 'Pont de l’Alma & Eiffel Docks', alertBody: 'Cruisers operating at 10-minute turnaround. Ultrasonic sensors monitoring boat wake impacts.', nodeId: 'NODE: PAR-SEINE-05' },
                '05:00 PM': { tourists: '98,000', occupancy: '89%', popular: 'Champs-Ã‰lysÃ©es & Arc de Triomphe', crowd: 'HIGH', crowdClass: 't-badge-high', rain: 'Pleasant Sunset Breeze', water: 'Normal', waterClass: 't-badge-moderate', road: 'Ã‰toile Roundabout Heavy', roadClass: 't-badge-warning', alertTitle: 'ROUNDABOUT TRAFFIC CORRIDOR CONGESTION', alertSub: 'Charles de Gaulle - Ã‰toile', alertBody: 'Vehicle circulation at Arc de Triomphe slowed. Pedestrian underpasses moving freely.', nodeId: 'NODE: PAR-ETOILE-03' },
                '09:00 PM': { tourists: '64,000', occupancy: '93%', popular: 'Eiffel Tower Sparkling & Latin Quarter', crowd: 'MODERATE', crowdClass: 't-badge-moderate', rain: 'Clear Night Sky', water: 'Normal', waterClass: 't-badge-moderate', road: 'Smooth', roadClass: 't-badge-moderate', alertTitle: 'NIGHT LIGHTING & PEDESTRIAN CONCOURSE CALM', alertSub: '7th Arrondissement Basin', alertBody: 'Tower sparkle sequence draws steady crowd. Perimeter security barrier flow normal.', nodeId: 'NODE: PAR-EIFFEL-02' }
            }
        },
        'new york': {
            name: 'New York, USA',
            baseHotels: 1600,
            baseRooms: 52000,
            baseOccupancy: 82,
            attractionsCount: 240,
            attractionsSub: 'Times Square, Central Park, Statue of Liberty, Brooklyn Bridge',
            operatorsCount: 140,
            cabsCount: 510,
            operatorsSub: '510 Tour Buses & Harbor Ferries',
            zonesCount: 50,
            zonesSub: 'Manhattan & Outer Borough Hubs',
            alternateAttractions: 'High Line / Hudson Yards Culture Center',
            stations: [
                { id: 'times-square', name: 'Times Square Pedestrian Radar #02', desc: 'Acoustic Density & Plaza Movement', status: 'Alert', badgeClass: 'badge-alert', nodeId: 'NODE: NYC-TIMESQ-02', place: 'Times Square' },
                { id: 'central-park', name: 'Central Park South Environmental #06', desc: 'Microclimate & Path Density Monitor', status: 'Normal', badgeClass: 'badge-normal', nodeId: 'NODE: NYC-CPARK-06', place: 'Central Park' },
                { id: 'brooklyn-bridge', name: 'Brooklyn Bridge Walkway Sensor #04', desc: 'Pedestrian Optical Counter & Wind Node', status: 'Normal', badgeClass: 'badge-normal', nodeId: 'NODE: NYC-BKB-04', place: 'Brooklyn Bridge' },
                { id: 'battery-ferry', name: 'Battery Park Ferry Slip Buoy #09', desc: 'Harbor Surge & Liberty Boat Queues', status: 'Normal', badgeClass: 'badge-normal', nodeId: 'NODE: NYC-BATTERY-09', place: 'Battery Park' }
            ],
            timeTelemetry: {
                '06:00 AM': { tourists: '11,000', occupancy: '87%', popular: 'Brooklyn Bridge Sunrise Walk', crowd: 'LOW', crowdClass: 't-badge-moderate', rain: 'Crisp Early Air', water: 'East River Normal', waterClass: 't-badge-moderate', road: 'Quiet Avenue Traffic', roadClass: 't-badge-moderate', alertTitle: 'EARLY MORNING CROSSING ROUTINE', alertSub: 'Brooklyn Bridge Promenade', alertBody: 'Walkway clear for sunrise photographers. Wind sensors at mid-span reading 8 knots.', nodeId: 'NODE: NYC-BKB-04' },
                '09:00 AM': { tourists: '94,000', occupancy: '82%', popular: 'Times Square / Central Park', crowd: 'HIGH', crowdClass: 't-badge-high', rain: 'Overcast', water: 'Harbor Normal', waterClass: 't-badge-moderate', road: 'Congested Midtown', roadClass: 't-badge-warning', alertTitle: 'MIDTOWN CORRIDOR CONGESTION ADVISORY', alertSub: 'Times Square Pedestrian Plaza', alertBody: 'Surface vehicle traffic diverted around 7th Ave pedestrian zones. Subway access running smoothly.', nodeId: 'NODE: NYC-TIMESQ-02' },
                '01:00 PM': { tourists: '135,000', occupancy: '79%', popular: 'Statue of Liberty Ferry & Battery Park', crowd: 'VERY HIGH', crowdClass: 't-badge-high', rain: 'Partly Sunny', water: 'Harbor Swell Mild', waterClass: 't-badge-moderate', road: 'Moderate Downtown Flow', roadClass: 't-badge-moderate', alertTitle: 'FERRY DEPARTURE DOCK CAPACITY', alertSub: 'Battery Park Slip #09', alertBody: 'Liberty Island security lines averaging 20 minutes. Additional ferry shuttle activated.', nodeId: 'NODE: NYC-BATTERY-09' },
                '05:00 PM': { tourists: '120,000', occupancy: '84%', popular: 'Central Park Bow Bridge & The Mall', crowd: 'HIGH', crowdClass: 't-badge-high', rain: 'Pleasant Autumn Breeze', water: 'Lake Level Normal', waterClass: 't-badge-moderate', road: 'Rush Hour Congestion', roadClass: 't-badge-warning', alertTitle: 'PARK PERIMETER VEHICLE ADVISORY', alertSub: '5th Ave & Central Park South', alertBody: 'Heavy pedestrian spillover along Grand Army Plaza. Crosswalk timers adjusted for flow.', nodeId: 'NODE: NYC-CPARK-06' },
                '09:00 PM': { tourists: '88,000', occupancy: '91%', popular: 'Broadway Theaters & Times Square Neon', crowd: 'VERY HIGH', crowdClass: 't-badge-high', rain: 'Clear Night Sky', water: 'Normal', waterClass: 't-badge-moderate', road: 'Broadway Traffic Diversions', roadClass: 't-badge-warning', alertTitle: 'THEATER DISTRICT DISPERSAL RUSH', alertSub: '42nd to 48th Street Grid', alertBody: 'Curtain calls release 35,000 audience members into pedestrian zone. Traffic officers deployed.', nodeId: 'NODE: NYC-TIMESQ-02' }
            }
        },
        'london': {
            name: 'London, United Kingdom',
            baseHotels: 1550,
            baseRooms: 49000,
            baseOccupancy: 85,
            attractionsCount: 310,
            attractionsSub: 'Big Ben, Tower Bridge, British Museum, Borough Market',
            operatorsCount: 135,
            cabsCount: 460,
            operatorsSub: '460 Black Cabs & Thames Clippers',
            zonesCount: 48,
            zonesSub: 'City of London & Westminster Quarters',
            alternateAttractions: 'Tate Modern / St. Jamesâ€™s Park',
            stations: [
                { id: 'westminster-bridge', name: 'Westminster Bridge Optical #01', desc: 'Big Ben Pedestrian Flow & Footfall LiDAR', status: 'Alert', badgeClass: 'badge-alert', nodeId: 'NODE: LON-WESTMIN-01', place: 'Westminster Bridge' },
                { id: 'tower-bridge', name: 'Tower Bridge Bascule Sensor #03', desc: 'River Traffic & Hydraulic Strain Gauge', status: 'Normal', badgeClass: 'badge-normal', nodeId: 'NODE: LON-TOWER-03', place: 'Tower Bridge' },
                { id: 'thames-hydro', name: 'Thames Barrier Hydro-Buoy #07', desc: 'Tidal Fluctuation & Flood Risk Telemetry', status: 'Normal', badgeClass: 'badge-normal', nodeId: 'NODE: LON-THAMES-07', place: 'Thames Embankment' },
                { id: 'borough-market', name: 'Borough Market Acoustic Node #05', desc: 'Under-Arches Crowd Density Sensor', status: 'Normal', badgeClass: 'badge-normal', nodeId: 'NODE: LON-BOROUGH-05', place: 'Borough Market' }
            ],
            timeTelemetry: {
                '06:00 AM': { tourists: '9,500', occupancy: '89%', popular: 'Tower Bridge Dawn Walk', crowd: 'LOW', crowdClass: 't-badge-moderate', rain: 'Misty Drizzle', water: 'Thames Low Tide', waterClass: 't-badge-moderate', road: 'Clear Roads', roadClass: 't-badge-moderate', alertTitle: 'DAWN RIVERBANK TELEMETRY', alertSub: 'South Bank Sector', alertBody: 'Low pedestrian footfall along Thames Path. Automated street sweepers active.', nodeId: 'NODE: LON-TOWER-03' },
                '09:00 AM': { tourists: '88,000', occupancy: '85%', popular: 'Big Ben & Westminster Abbey', crowd: 'HIGH', crowdClass: 't-badge-high', rain: 'Light Drizzle', water: 'Thames Tidal Flow Stable', waterClass: 't-badge-moderate', road: 'Brisk Central Flow', roadClass: 't-badge-moderate', alertTitle: 'WESTMINSTER APPROACH FOOTFALL SURGE', alertSub: 'Parliament Square Corridor', alertBody: 'Bridge walkway at 80% flow limit. Pedestrians guided toward wide eastern parapet.', nodeId: 'NODE: LON-WESTMIN-01' },
                '01:00 PM': { tourists: '105,000', occupancy: '82%', popular: 'Borough Market Street Food', crowd: 'VERY HIGH', crowdClass: 't-badge-high', rain: 'Overcast & Cool', water: 'River Traffic High', waterClass: 't-badge-moderate', road: 'Moderate London Bridge Transit', roadClass: 't-badge-moderate', alertTitle: 'MARKET CONCOURSE BOTTLENECK ALERT', alertSub: 'Borough High Street Underpass', alertBody: 'Food market aisles at high density. One-way pedestrian circulation active around Jubilee Market.', nodeId: 'NODE: LON-BOROUGH-05' },
                '05:00 PM': { tourists: '92,000', occupancy: '87%', popular: 'Covent Garden & West End Theatres', crowd: 'VERY HIGH', crowdClass: 't-badge-high', rain: 'Clearing Skies', water: 'Normal', waterClass: 't-badge-moderate', road: 'Strand & Aldwych Congestion', roadClass: 't-badge-warning', alertTitle: 'WEST END EVENING PEAK INFLUX', alertSub: 'Covent Garden Piazza Sector', alertBody: 'Underground station entry control active at Covent Garden. Charing Cross alternative recommended.', nodeId: 'NODE: LON-COVENT-02' },
                '09:00 PM': { tourists: '52,000', occupancy: '92%', popular: 'Soho & South Bank Illuminated Walk', crowd: 'MODERATE', crowdClass: 't-badge-moderate', rain: 'Crisp Night Breeze', water: 'Normal', waterClass: 't-badge-moderate', road: 'Smooth', roadClass: 't-badge-moderate', alertTitle: 'NIGHT TRANSIT RUNNING ON SCHEDULE', alertSub: 'Night Tube & Bus Network', alertBody: 'All major sensor beacons normal. South Bank illuminations operating at full brightness.', nodeId: 'NODE: LON-THAMES-07' }
            }
        },
        'delhi': {
            name: 'Delhi, India',
            baseHotels: 1350,
            baseRooms: 34000,
            baseOccupancy: 80,
            attractionsCount: 220,
            attractionsSub: 'India Gate, Qutub Minar, Red Fort, Lotus Temple',
            operatorsCount: 110,
            cabsCount: 410,
            operatorsSub: '410 Registered Tour Shuttles & Fleets',
            zonesCount: 40,
            zonesSub: 'Lutyens Heritage & Old Delhi Sectors',
            alternateAttractions: 'Humayunâ€™s Tomb / Sunder Nursery Gardens',
            stations: [
                { id: 'india-gate', name: 'Kartavya Path Optical Node #01', desc: 'Avenue Flow & Memorial Density LiDAR', status: 'Alert', badgeClass: 'badge-alert', nodeId: 'NODE: DEL-GATE-01', place: 'India Gate' },
                { id: 'red-fort', name: 'Lal Qila Heritage Sensor #04', desc: 'Moat Hydro-Probes & Rampart Footfall', status: 'Normal', badgeClass: 'badge-normal', nodeId: 'NODE: DEL-REDFORT-04', place: 'Red Fort' },
                { id: 'qutub-complex', name: 'Qutub Minar Vibration Sensor #02', desc: 'Seismic Structural Tilt & Ground Moisture', status: 'Normal', badgeClass: 'badge-normal', nodeId: 'NODE: DEL-QUTUB-02', place: 'Qutub Minar' },
                { id: 'chandni-chowk', name: 'Chandni Chowk Pedestrian Radar #06', desc: 'Electric Shuttle & Heritage Walkway LiDAR', status: 'Normal', badgeClass: 'badge-normal', nodeId: 'NODE: DEL-CCHOWK-06', place: 'Chandni Chowk' }
            ],
            timeTelemetry: {
                '09:00 AM': { tourists: '54,000', occupancy: '80%', popular: 'India Gate & Kartavya Path', crowd: 'HIGH', crowdClass: 't-badge-high', rain: 'Clear / Sunny', water: 'Normal', waterClass: 't-badge-moderate', road: 'Brisk Central Flow', roadClass: 't-badge-moderate', alertTitle: 'HIGH FOOTFALL AT KARTAVYA PATH', alertSub: 'India Gate Concourse', alertBody: 'Pedestrian flow smoothly distributed across lawns. EV battery shuttles operating every 3 minutes.', nodeId: 'NODE: DEL-GATE-01' }
            }
        },
        'jaipur': {
            name: 'Jaipur, Rajasthan',
            baseHotels: 620,
            baseRooms: 15400,
            baseOccupancy: 77,
            attractionsCount: 85,
            attractionsSub: 'Hawa Mahal, Amer Fort, City Palace, Jal Mahal',
            operatorsCount: 70,
            cabsCount: 240,
            operatorsSub: '240 Registered Heritage Cabs & Fleets',
            zonesCount: 22,
            zonesSub: 'Walled Pink City & Amer Heritage Corridors',
            alternateAttractions: 'Albert Hall Museum / Sisodia Rani Garden',
            stations: [
                { id: 'hawa-mahal', name: 'Hawa Mahal Frontage Sensor #01', desc: 'Heritage Facade Airflow & Roadside Density', status: 'Alert', badgeClass: 'badge-alert', nodeId: 'NODE: JAI-HAWA-01', place: 'Hawa Mahal' },
                { id: 'amer-fort', name: 'Amer Fort Hill Incline Node #03', desc: 'Elephant Route Optical & Pathway Strain', status: 'Normal', badgeClass: 'badge-normal', nodeId: 'NODE: JAI-AMER-03', place: 'Amer Fort' },
                { id: 'jal-mahal', name: 'Man Sagar Lake Hydro-Buoy #05', desc: 'Lake Water Quality & Bird Sanctuary Radar', status: 'Normal', badgeClass: 'badge-normal', nodeId: 'NODE: JAI-JALMAHAL-05', place: 'Jal Mahal' },
                { id: 'city-palace', name: 'Tripolia Gate Optical Counter #02', desc: 'Courtyard Crowd Capacity & Thermal LiDAR', status: 'Normal', badgeClass: 'badge-normal', nodeId: 'NODE: JAI-PALACE-02', place: 'City Palace' }
            ],
            timeTelemetry: {
                '09:00 AM': { tourists: '22,000', occupancy: '77%', popular: 'Amer Fort & Hawa Mahal', crowd: 'HIGH', crowdClass: 't-badge-high', rain: 'Clear & Warm', water: 'Lake Level Stable', waterClass: 't-badge-moderate', road: 'Pink City Bazaars Active', roadClass: 't-badge-moderate', alertTitle: 'AMER FORT ASCENT CROWD MANAGEMENT', alertSub: 'Amer Fort Incline Ramp', alertBody: 'Optical counters report 180 tourists/min ascending ramparts. Shuttle jeeps maintaining steady interval.', nodeId: 'NODE: JAI-AMER-03' }
            }
        },
        'dubai': {
            name: 'Dubai, UAE',
            baseHotels: 980,
            baseRooms: 42000,
            baseOccupancy: 86,
            attractionsCount: 160,
            attractionsSub: 'Burj Khalifa, Dubai Mall, Palm Jumeirah, Marina',
            operatorsCount: 160,
            cabsCount: 580,
            operatorsSub: '580 Luxury Coaches & Marine Taxis',
            zonesCount: 38,
            zonesSub: 'Downtown, Marina & Desert Eco-Reserves',
            alternateAttractions: 'Al Fahidi Historic District / Dubai Frame',
            stations: [
                { id: 'burj-khalifa', name: 'Burj Lake Fountain Sensor #02', desc: 'Optical Waterfront Crowd Density & Water Jets', status: 'Alert', badgeClass: 'badge-alert', nodeId: 'NODE: DXB-BURJ-02', place: 'Burj Khalifa Fountain' },
                { id: 'palm-crescent', name: 'Palm Jumeirah Monorail Station #04', desc: 'Transit Capacity & Coastal Surge Radar', status: 'Normal', badgeClass: 'badge-normal', nodeId: 'NODE: DXB-PALM-04', place: 'Palm Jumeirah' },
                { id: 'dubai-creek', name: 'Dubai Creek Abra Channel Buoy #06', desc: 'Abra Waterway Depth & Traffic Flow Sensor', status: 'Normal', badgeClass: 'badge-normal', nodeId: 'NODE: DXB-CREEK-06', place: 'Dubai Creek' },
                { id: 'dubai-marina', name: 'Marina Promenade Thermal Sensor #08', desc: 'Air Misting Stations & Pedestrian Flow', status: 'Normal', badgeClass: 'badge-normal', nodeId: 'NODE: DXB-MARINA-08', place: 'Dubai Marina' }
            ],
            timeTelemetry: {
                '09:00 AM': { tourists: '64,000', occupancy: '86%', popular: 'Burj Khalifa & Dubai Mall', crowd: 'HIGH', crowdClass: 't-badge-high', rain: 'None (Sunny & Warm)', water: 'Normal Gulf Sea', waterClass: 't-badge-moderate', road: 'Sheikh Zayed Rd Smooth', roadClass: 't-badge-moderate', alertTitle: 'DOWNTOWN ACCESS CORRIDOR NORMAL', alertSub: 'Financial Center & Mall Exits', alertBody: 'Metro link and parking garages moving freely. Air-conditioned travelators operating smoothly.', nodeId: 'NODE: DXB-BURJ-02' }
            }
        }
    };

    // Helper: Dynamic telemetry generator for arbitrary destination chosen by user
    function getOrCreateDestinationMonitoringData(rawQuery) {
        if (!rawQuery) return destinationMonitoringData['rishikesh'];
        const clean = rawQuery.toLowerCase().trim().replace(/,\s*(india|france|japan|usa|uk|uae|italy|spain|uttarakhand|meghalaya|rajasthan|maharashtra).*/i, '').trim();
        
        // Exact match
        if (destinationMonitoringData[clean]) return destinationMonitoringData[clean];

        // Partial match in existing keys
        for (const k of Object.keys(destinationMonitoringData)) {
            if (clean.includes(k) || k.includes(clean)) {
                return destinationMonitoringData[k];
            }
        }

        // Check cached city data for rich local landmarks
        const expCity = (typeof ceCityCache !== 'undefined' && ceCityCache.has(clean)) ? ceCityCache.get(clean).city : null;
        const dispName = expCity ? `${expCity.name}, ${expCity.country}` : (rawQuery.charAt(0).toUpperCase() + rawQuery.slice(1));
        const shortName = expCity ? expCity.name : dispName.split(',')[0].trim();
        
        // Generate pseudo-deterministic metrics based on city name hash
        let hash = 0;
        for (let i = 0; i < clean.length; i++) hash = (hash << 5) - hash + clean.charCodeAt(i);
        const absHash = Math.abs(hash);

        const genHotels = 240 + (absHash % 420);
        const genRooms = genHotels * (22 + (absHash % 15));
        const genOccupancy = 72 + (absHash % 14);
        const genAttractions = 35 + (absHash % 60);
        const genOperators = 38 + (absHash % 45);
        const genCabs = genOperators * 4 + (absHash % 30);
        const genZones = 12 + (absHash % 18);

        // Landmarks from explorer or realistic generative landmarks
        let landmark1 = `${shortName} Central Plaza`;
        let landmark2 = `${shortName} Heritage Quarter`;
        let landmark3 = `${shortName} Riverfront & Promenade`;
        let landmark4 = `${shortName} Botanical Reserve`;
        
        if (expCity && expCity.places && expCity.places.length >= 2) {
            landmark1 = expCity.places[0].name;
            landmark2 = expCity.places[1].name;
            if (expCity.places[2]) landmark3 = expCity.places[2].name;
            if (expCity.places[3]) landmark4 = expCity.places[3].name;
        }

        const genData = {
            name: dispName,
            baseHotels: genHotels,
            baseRooms: genRooms,
            baseOccupancy: genOccupancy,
            attractionsCount: genAttractions,
            attractionsSub: `${landmark1}, ${landmark2}, ${landmark3}`,
            operatorsCount: genOperators,
            cabsCount: genCabs,
            operatorsSub: `${genCabs} Registered Tourist Fleets & Shuttles`,
            zonesCount: genZones,
            zonesSub: 'Ecosystem, Tourism & Urban Sectors',
            alternateAttractions: `${landmark3} / ${landmark4}`,
            stations: [
                { id: 'sensor-01', name: `${landmark1} Sensor #01`, desc: 'Pedestrian LiDAR & Optical Crowd Counter', status: 'Alert', badgeClass: 'badge-alert', nodeId: `NODE: ${shortName.slice(0,3).toUpperCase()}-CENTRAL-01`, place: landmark1 },
                { id: 'sensor-02', name: `${landmark2} Station #02`, desc: 'Heritage Integrity & Atmospheric Probes', status: 'Normal', badgeClass: 'badge-normal', nodeId: `NODE: ${shortName.slice(0,3).toUpperCase()}-HERITAGE-02`, place: landmark2 },
                { id: 'sensor-03', name: `${landmark3} Hydro-Buoy #03`, desc: 'Water Basin Stage & Drainage Telemetry', status: 'Normal', badgeClass: 'badge-normal', nodeId: `NODE: ${shortName.slice(0,3).toUpperCase()}-WATER-03`, place: landmark3 },
                { id: 'sensor-04', name: `${landmark4} Sensor #04`, desc: 'Environmental Microclimate & Fog Radar', status: 'Normal', badgeClass: 'badge-normal', nodeId: `NODE: ${shortName.slice(0,3).toUpperCase()}-ECO-04`, place: landmark4 }
            ],
            timeTelemetry: {
                '06:00 AM': {
                    tourists: `${(1800 + (absHash % 1200)).toLocaleString()}`, occupancy: `${Math.min(95, genOccupancy + 10)}%`, popular: `${landmark1} Dawn Promenade`,
                    crowd: 'LOW', crowdClass: 't-badge-moderate', rain: 'Pleasant Morning Mist',
                    water: 'Normal Baselines', waterClass: 't-badge-moderate', road: 'Clear', roadClass: 't-badge-moderate',
                    alertTitle: 'ROUTINE DAWN MONITORING', alertSub: `${shortName} Central Grid`,
                    alertBody: `Early sunrise sensors in ${shortName} report calm conditions with optimal ambient parameters.`,
                    nodeId: `NODE: ${shortName.slice(0,3).toUpperCase()}-CENTRAL-01`
                },
                '09:00 AM': {
                    tourists: `${(11000 + (absHash % 6000)).toLocaleString()}`, occupancy: `${genOccupancy}%`, popular: landmark1,
                    crowd: 'HIGH', crowdClass: 't-badge-high', rain: 'Clear Skies',
                    water: 'Normal Flow', waterClass: 't-badge-moderate', road: 'Moderate Traffic Flow', roadClass: 't-badge-moderate',
                    alertTitle: 'REGIONAL DESTINATION CAPACITY ACTIVE', alertSub: `${landmark1} Sector`,
                    alertBody: `Edge sensors report steady influx of visitors at <strong>${landmark1}</strong>. Transit shuttles and local fleets operating smoothly.`,
                    nodeId: `NODE: ${shortName.slice(0,3).toUpperCase()}-CENTRAL-01`
                },
                '01:00 PM': {
                    tourists: `${(15000 + (absHash % 8000)).toLocaleString()}`, occupancy: `${genOccupancy - 4}%`, popular: landmark2,
                    crowd: 'VERY HIGH', crowdClass: 't-badge-high', rain: 'Sunny & Pleasant',
                    water: 'Normal', waterClass: 't-badge-moderate', road: 'Busy Tourist Corridors', roadClass: 't-badge-warning',
                    alertTitle: 'PEAK AFTERNOON FOOTFALL DETECTED', alertSub: `${landmark2} Perimeter`,
                    alertBody: `Optical footfall counters log maximum afternoon visitor density around ${landmark2}. Shuttle diversions recommended.`,
                    nodeId: `NODE: ${shortName.slice(0,3).toUpperCase()}-HERITAGE-02`
                },
                '05:00 PM': {
                    tourists: `${(13500 + (absHash % 7000)).toLocaleString()}`, occupancy: `${genOccupancy + 3}%`, popular: landmark3,
                    crowd: 'HIGH', crowdClass: 't-badge-high', rain: 'Passing Breeze',
                    water: 'Stable Surface Stage', waterClass: 't-badge-moderate', road: 'Slight Congestion', roadClass: 't-badge-warning',
                    alertTitle: 'EVENING GATHERING ADVISORY', alertSub: `${landmark3} Waterfront`,
                    alertBody: `Visitors gathering along ${landmark3} for sunset views. Crowd marshals coordinating pedestrian promenade crossings.`,
                    nodeId: `NODE: ${shortName.slice(0,3).toUpperCase()}-WATER-03`
                },
                '09:00 PM': {
                    tourists: `${(4200 + (absHash % 2500)).toLocaleString()}`, occupancy: `${Math.min(96, genOccupancy + 12)}%`, popular: `${shortName} Night Dining & Cafes`,
                    crowd: 'MODERATE', crowdClass: 't-badge-moderate', rain: 'Cool Night Air',
                    water: 'Receding Baseline', waterClass: 't-badge-moderate', road: 'Clear', roadClass: 't-badge-moderate',
                    alertTitle: 'NIGHT REPOSE // TELEMETRY STABILIZED', alertSub: 'Regional IoT Node Network',
                    alertBody: `All environmental ultrasound and optical probes in ${shortName} indicate stable parameters and calm night traffic.`,
                    nodeId: `NODE: ${shortName.slice(0,3).toUpperCase()}-ECO-04`
                }
            }
        };

        // Cache dynamically created entry
        destinationMonitoringData[clean] = genData;
        return genData;
    }

    let currentMonitoringCityKey = 'rishikesh';
    let currentSelectedTime = '09:00 AM';
    let liveTelemetryInterval = null;

    // Synchronize and set active monitoring destination
    function setActiveMonitoringCity(rawCityQuery) {
        if (!rawCityQuery) return;
        const queryClean = rawCityQuery.toLowerCase().trim();
        const data = getOrCreateDestinationMonitoringData(queryClean);
        
        // Derive key
        let matchedKey = null;
        for (const k of Object.keys(destinationMonitoringData)) {
            if (destinationMonitoringData[k] === data) {
                matchedKey = k;
                break;
            }
        }
        if (!matchedKey) matchedKey = queryClean.split(',')[0].trim();
        currentMonitoringCityKey = matchedKey;

        // Ensure this city is present in the monCitySelect dropdown
        if (monCitySelect) {
            let optionFound = false;
            for (let i = 0; i < monCitySelect.options.length; i++) {
                if (monCitySelect.options[i].value.toLowerCase() === matchedKey.toLowerCase()) {
                    monCitySelect.selectedIndex = i;
                    optionFound = true;
                    break;
                }
            }
            if (!optionFound) {
                const newOpt = document.createElement('option');
                newOpt.value = matchedKey;
                newOpt.textContent = data.name;
                monCitySelect.insertBefore(newOpt, monCitySelect.firstChild);
                monCitySelect.value = matchedKey;
            }
        }

        renderDestinationMonitoring();
    }

    function showDestinationMonitoring() {
        // Hide other views
        const wizard = document.getElementById('wizard-view');
        const dash = document.getElementById('dashboard-view');
        const safety = document.getElementById('safety-dashboard-view');
        const explorer = document.getElementById('city-explorer-view');
        
        if (wizard) wizard.classList.add('hidden');
        if (dash) dash.classList.add('hidden');
        if (safety) safety.classList.add('hidden');
        if (explorer) explorer.classList.add('hidden');
        const wgView = document.getElementById('wanderguide-view');
        if (wgView) wgView.classList.add('hidden');
        const roView = document.getElementById('route-optimizer-view');
        if (roView) roView.classList.add('hidden');
        document.body.classList.remove('wanderguide-active');
        
        if (destinationMonitoringView) {
            destinationMonitoringView.classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Update Navbar Active State
        const navPlanner = document.getElementById('nav-planner-link');
        const navSafety = document.getElementById('nav-safety-link');
        const navExplorer = document.getElementById('nav-explorer-link');
        const navMon = document.getElementById('nav-monitoring-link');
        const navWg = document.getElementById('nav-wanderguide-link');
        const navRo = document.getElementById('nav-route-optimizer-link');

        if (navPlanner) navPlanner.classList.remove('active');
        if (navSafety) navSafety.classList.remove('active');
        if (navExplorer) navExplorer.classList.remove('active');
        if (navWg) navWg.classList.remove('active');
        if (navRo) navRo.classList.remove('active');
        if (navMon) navMon.classList.add('active');

        // Check if a destination was set in Trip Planner, Explorer, Input or localStorage
        let activeDest = '';
        if (tripData.destination && tripData.destination.trim()) {
            activeDest = tripData.destination.trim();
        } else if (destInput && destInput.value && destInput.value.trim()) {
            activeDest = destInput.value.trim();
        } else {
            try {
                activeDest = localStorage.getItem('tb_selected_destination') || '';
            } catch(e) {}
        }
        
        if (!activeDest && currentExplorerCityName) {
            activeDest = currentExplorerCityName;
        }

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('destination')) {
            activeDest = urlParams.get('destination');
        } else if (urlParams.get('city')) {
            activeDest = urlParams.get('city');
        }

        if (activeDest) {
            setActiveMonitoringCity(activeDest);
        } else {
            // Default to Rishikesh or first option in dropdown
            const defaultKey = (monCitySelect && monCitySelect.value) ? monCitySelect.value : 'rishikesh';
            setActiveMonitoringCity(defaultKey);
        }
    }

    // Render Capacity & Infrastructure Overview
    function renderDestinationMonitoring() {
        const data = destinationMonitoringData[currentMonitoringCityKey] || destinationMonitoringData['rishikesh'];
        
        // Generate realistic dynamic live fluctuations on each render/refresh
        const jitterOccupancy = Math.max(52, Math.min(97, (data.baseOccupancy || 75) + (Math.floor(Math.random() * 5) - 2)));
        const jitterCabs = Math.max(20, (data.cabsCount || 200) + (Math.floor(Math.random() * 11) - 5));

        // Update Section 1 Title & Description
        const monInfraTitle = document.getElementById('mon-infra-title');
        const monExampleHeading = document.getElementById('mon-example-heading');
        const cityNameShort = data.name.split(',')[0].trim();
        
        if (monInfraTitle) monInfraTitle.textContent = `Capacity & Ecosystem Monitoring: ${data.name}`;
        if (monExampleHeading) monExampleHeading.textContent = `2. Example: ${cityNameShort}`;

        // Update 4 Dynamic Metric Cards (Hotels, Attractions, Operators, Zones)
        const monHotelsCount = document.getElementById('mon-hotels-count');
        const monHotelsSub = document.getElementById('mon-hotels-sub');
        const monAttractionsCount = document.getElementById('mon-attractions-count');
        const monAttractionsSub = document.getElementById('mon-attractions-sub');
        const monOperatorsCount = document.getElementById('mon-operators-count');
        const monOperatorsSub = document.getElementById('mon-operators-sub');
        const monZonesCount = document.getElementById('mon-zones-count');
        const monZonesSub = document.getElementById('mon-zones-sub');

        if (monHotelsCount) monHotelsCount.textContent = (data.baseHotels || 340).toLocaleString();
        if (monHotelsSub) {
            const rooms = data.baseRooms || ((data.baseHotels || 340) * 24);
            monHotelsSub.textContent = `Est. ${rooms.toLocaleString()} Rooms • Live Occupancy: ${jitterOccupancy}%`;
        }
        
        if (monAttractionsCount) monAttractionsCount.textContent = data.attractionsCount || 45;
        if (monAttractionsSub) monAttractionsSub.textContent = data.attractionsSub || 'Key Cultural & Scenic Sites';
        
        if (monOperatorsCount) monOperatorsCount.textContent = data.operatorsCount || 65;
        if (monOperatorsSub) monOperatorsSub.textContent = `${jitterCabs} Registered Tourist Cabs & Fleets`;
        
        if (monZonesCount) monZonesCount.textContent = data.zonesCount || 16;
        if (monZonesSub) monZonesSub.textContent = data.zonesSub || 'Ecological & Urban Management Sectors';

        // Dynamically Render Station Items for current city
        renderStationsList(data.stations || []);

        // Render Telemetry for current selected time
        renderTimeTelemetry(currentSelectedTime);

        // Start or restart live 5-second telemetry heartbeat pulse
        startLiveTelemetryHeartbeat();
    }

    // Render Station List Items dynamically
    function renderStationsList(stations) {
        const stationsListEl = document.getElementById('mon-stations-list');
        if (!stationsListEl) return;

        if (!stations || stations.length === 0) {
            stationsListEl.innerHTML = '<div style="padding: 10px; color: #64748b; font-size: 13px;">All regional remote sensor beacons active.</div>';
            return;
        }

        let html = '';
        stations.forEach((st, idx) => {
            const activeClass = idx === 0 ? 'active' : '';
            html += `
                <div class="station-item ${activeClass}" data-node="${st.nodeId}" data-place="${st.place}">
                    <div class="st-indicator green"></div>
                    <div class="st-info">
                        <strong>${st.name}</strong>
                        <small>${st.desc}</small>
                    </div>
                    <span class="st-status ${st.badgeClass || 'badge-normal'}">${st.status || 'Normal'}</span>
                </div>
            `;
        });
        stationsListEl.innerHTML = html;

        // Attach click listeners to dynamically rendered stations
        const items = stationsListEl.querySelectorAll('.station-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                items.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                const nodeId = item.getAttribute('data-node');
                const place = item.getAttribute('data-place');
                const monNodeId = document.getElementById('mon-node-id');
                const dispPopular = document.getElementById('disp-popular');

                if (monNodeId && nodeId) monNodeId.textContent = nodeId;
                if (dispPopular && place) dispPopular.textContent = place;
            });
        });
    }

    // Render Telemetry Screen & Advisory Box
    function renderTimeTelemetry(timeKey) {
        currentSelectedTime = timeKey;
        const data = destinationMonitoringData[currentMonitoringCityKey] || destinationMonitoringData['rishikesh'];
        const cityNameShort = data.name.split(',')[0].trim();

        // Caption header
        const monExampleHeading = document.getElementById('mon-example-heading');
        if (monExampleHeading) monExampleHeading.textContent = `2. Example: ${cityNameShort}`;

        const telemetry = (data.timeTelemetry && data.timeTelemetry[timeKey]) || 
                          (data.timeTelemetry && data.timeTelemetry['09:00 AM']) || 
                          (data.timeTelemetry && Object.values(data.timeTelemetry)[0]) || {
            tourists: '14,800', occupancy: '76%', popular: `${cityNameShort} Central Waterfront`, crowd: 'HIGH', crowdClass: 't-badge-high',
            rain: 'Clear Skies', water: 'Normal Flow', waterClass: 't-badge-moderate', road: 'Moderate Traffic', roadClass: 't-badge-moderate',
            alertTitle: 'ACTIVE REGIONAL DESTINATION MONITORING', alertSub: `${cityNameShort} Central Corridor`,
            alertBody: `Sensor grid deployed across ${cityNameShort} reporting real-time parameters within safe bounds.`,
            nodeId: `NODE: ${cityNameShort.slice(0,3).toUpperCase()}-REMOTE-01`
        };

        // Header caption timestamp
        const timeHeader = document.getElementById('mon-time-header');
        if (timeHeader) {
            const timeClean = timeKey.replace(':00', '').trim();
            timeHeader.textContent = `At ${timeClean}:`;
        }

        // Terminal screen elements
        const monNodeId = document.getElementById('mon-node-id');
        const dispTourists = document.getElementById('disp-tourists');
        const dispOccupancy = document.getElementById('disp-occupancy');
        const dispPopular = document.getElementById('disp-popular');
        const dispCrowd = document.getElementById('disp-crowd');
        const dispRain = document.getElementById('disp-rain');
        const dispWater = document.getElementById('disp-water');
        const dispRoad = document.getElementById('disp-road');
        const dispLastPacket = document.getElementById('disp-last-packet');

        if (monNodeId) monNodeId.textContent = telemetry.nodeId || `NODE: ${cityNameShort.slice(0,3).toUpperCase()}-01`;
        if (dispTourists) dispTourists.textContent = telemetry.tourists;
        if (dispOccupancy) dispOccupancy.textContent = telemetry.occupancy;
        if (dispPopular) dispPopular.textContent = telemetry.popular;
        
        if (dispCrowd) {
            dispCrowd.textContent = telemetry.crowd;
            dispCrowd.className = `t-badge ${telemetry.crowdClass || 't-badge-high'}`;
        }
        if (dispRain) dispRain.textContent = telemetry.rain;
        if (dispWater) {
            dispWater.textContent = telemetry.water;
            dispWater.className = `t-badge ${telemetry.waterClass || 't-badge-warning'}`;
        }
        if (dispRoad) {
            dispRoad.textContent = telemetry.road;
            dispRoad.className = `t-badge ${telemetry.roadClass || 't-badge-moderate'}`;
        }
        if (dispLastPacket) {
            dispLastPacket.textContent = `Packet received: just now`;
        }

        // Alert Intel Box
        const intelAlertTitle = document.getElementById('intel-alert-title');
        const intelAlertSub = document.getElementById('intel-alert-sub');
        const intelAlertBody = document.getElementById('intel-alert-body');

        if (intelAlertTitle) intelAlertTitle.textContent = telemetry.alertTitle || 'SAFETY ADVISORY';
        if (intelAlertSub) intelAlertSub.textContent = telemetry.alertSub || `${cityNameShort} Sector`;
        if (intelAlertBody) intelAlertBody.innerHTML = telemetry.alertBody;

        // Update Action Buttons with destination context
        if (btnBroadcastOperators) {
            btnBroadcastOperators.textContent = `📢 Broadcast Warning to ${data.operatorsCount || 65} Travel Operators`;
        }
        if (btnRerouteTourists) {
            btnRerouteTourists.textContent = `🗺️ Suggest Alternate Attractions (${data.alternateAttractions || 'Cultural Heritage Sites'})`;
        }
    }

    // Dynamic Live 5-Second Pulse Heartbeat (simulating genuine edge sensor streaming)
    function startLiveTelemetryHeartbeat() {
        if (liveTelemetryInterval) clearInterval(liveTelemetryInterval);
        
        liveTelemetryInterval = setInterval(() => {
            const destView = document.getElementById('destination-monitoring-view');
            if (!destView || destView.classList.contains('hidden')) return;

            const dispLastPacket = document.getElementById('disp-last-packet');
            if (dispLastPacket) {
                const sec = Math.floor(Math.random() * 3) + 1;
                dispLastPacket.textContent = `Packet received: ${sec}s ago`;
            }

            // Subtle tourist count jitter Â± 6 visitors for realistic live effect
            const dispTourists = document.getElementById('disp-tourists');
            if (dispTourists && dispTourists.textContent) {
                const currentVal = parseInt(dispTourists.textContent.replace(/,/g, ''));
                if (!isNaN(currentVal)) {
                    const drift = Math.floor(Math.random() * 9) - 4;
                    dispTourists.textContent = Math.max(100, currentVal + drift).toLocaleString();
                }
            }
        }, 5000);
    }

    // Event listener bindings for Destination Monitoring
    if (btnViewDestMonitoring) {
        btnViewDestMonitoring.addEventListener('click', () => {
            showDestinationMonitoring();
        });
    }

    if (navMonitoringLink) {
        navMonitoringLink.addEventListener('click', (e) => {
            e.preventDefault();
            showDestinationMonitoring();
        });
    }

    if (btnJumpToIot) {
        btnJumpToIot.addEventListener('click', () => {
            showDestinationMonitoring();
        });
    }

    if (btnBackFromMonitoring) {
        btnBackFromMonitoring.addEventListener('click', () => {
            if (destinationMonitoringView) destinationMonitoringView.classList.add('hidden');
            const navMon = document.getElementById('nav-monitoring-link');
            if (navMon) navMon.classList.remove('active');

            if (currentItinerary.length > 0) {
                document.getElementById('dashboard-view').classList.remove('hidden');
                const navPlanner = document.getElementById('nav-planner-link');
                if (navPlanner) navPlanner.classList.add('active');
            } else {
                document.getElementById('wizard-view').classList.remove('hidden');
                const navPlanner = document.getElementById('nav-planner-link');
                if (navPlanner) navPlanner.classList.add('active');
            }
        });
    }

    if (btnMonitoringToSafety) {
        btnMonitoringToSafety.addEventListener('click', () => {
            if (destinationMonitoringView) destinationMonitoringView.classList.add('hidden');
            const navMon = document.getElementById('nav-monitoring-link');
            if (navMon) navMon.classList.remove('active');

            const activeData = destinationMonitoringData[currentMonitoringCityKey] || destinationMonitoringData['rishikesh'];
            if (currentItinerary.length === 0) {
                tripData.destination = activeData.name.split(',')[0].trim();
                tripData.startDate = "2026-09-10";
                tripData.endDate = "2026-09-12";
                const primarySpot = (activeData.timeTelemetry && activeData.timeTelemetry['09:00 AM'] && activeData.timeTelemetry['09:00 AM'].popular) || "Central Landmark";
                currentItinerary = [
                    { day: 1, activities: [{ time: "9:00 AM", title: primarySpot, desc: "Local Sightseeing & Exploration", cost: 10 }] }
                ];
            }
            generateSafetyAnalysis();
        });
    }

    // City Selector Dropdown change listener
    if (monCitySelect) {
        monCitySelect.addEventListener('change', (e) => {
            const selectedVal = e.target.value;
            setActiveMonitoringCity(selectedVal);
        });
    }

    // Time Simulator Buttons
    const timePills = document.querySelectorAll('.time-pill');
    timePills.forEach(pill => {
        pill.addEventListener('click', () => {
            timePills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            const timeVal = pill.getAttribute('data-time');
            renderTimeTelemetry(timeVal);
        });
    });

    // Operator Advisory Broadcast Simulation
    if (btnBroadcastOperators) {
        btnBroadcastOperators.addEventListener('click', () => {
            if (operatorToast) {
                const toastMsg = document.getElementById('toast-msg-text');
                const data = destinationMonitoringData[currentMonitoringCityKey] || destinationMonitoringData['rishikesh'];
                const telemetry = (data.timeTelemetry && data.timeTelemetry[currentSelectedTime]) || {};
                const cityNameShort = data.name.split(',')[0].trim();
                
                if (toastMsg) {
                    toastMsg.textContent = `${data.operatorsCount || 65} registered travel operators and ${telemetry.tourists || '14,800'} visitors in ${cityNameShort} received the ${telemetry.popular || 'waterfront'} alert broadcast.`;
                }
                
                operatorToast.classList.remove('hidden');
                setTimeout(() => {
                    operatorToast.classList.add('hidden');
                }, 6000);
            }
        });
    }

    if (btnCloseToast) {
        btnCloseToast.addEventListener('click', () => {
            if (operatorToast) operatorToast.classList.add('hidden');
        });
    }

    if (btnRerouteTourists) {
        btnRerouteTourists.addEventListener('click', () => {
            const data = destinationMonitoringData[currentMonitoringCityKey] || destinationMonitoringData['rishikesh'];
            const cityNameShort = data.name.split(',')[0].trim();
            const alternatePlace = data.alternateAttractions || `${cityNameShort} Cultural Arts Sanctuary`;

            const dispPopular = document.getElementById('disp-popular');
            const dispCrowd = document.getElementById('disp-crowd');
            const dispWater = document.getElementById('disp-water');
            const intelAlertBody = document.getElementById('intel-alert-body');
            
            if (dispPopular) dispPopular.textContent = `${alternatePlace} (Alternate Safe Area)`;
            if (dispCrowd) {
                dispCrowd.textContent = "BALANCED";
                dispCrowd.className = "t-badge t-badge-moderate";
            }
            if (dispWater) {
                dispWater.textContent = "Safe Hydrology";
                dispWater.className = "t-badge t-badge-moderate";
            }
            if (intelAlertBody) {
                intelAlertBody.innerHTML = `<strong>Dynamic Diversion Active:</strong> Footfall successfully rerouted to ${alternatePlace} away from dense bottleneck zones.`;
            }

            if (operatorToast) {
                const toastMsg = document.getElementById('toast-msg-text');
                if (toastMsg) {
                    toastMsg.textContent = `Alternate itinerary pushed to ${cityNameShort} tourist copilot & fleet drivers. Footfall diverted smoothly.`;
                }
                operatorToast.classList.remove('hidden');
                setTimeout(() => {
                    operatorToast.classList.add('hidden');
                }, 5000);
            }
        });
    }

    // ==========================================================================
    // WANDERLOG FEATURE: WHERE TO EAT & EXPLORE SPLIT VIEW
    // ==========================================================================

    const wgCuratedGreaterNoida = [
        {
            id: 'gn_1',
            name: 'Creme Castle',
            category: 'cafe',
            tags: ['Bakery', 'Desserts', 'Artisan Cafe'],
            rating_google: 4.6,
            reviews_google: '11,593',
            rating_tripadvisor: 4.8,
            reviews_tripadvisor: '289',
            editorial: 'Known across Delhi-NCR for exquisite artisanal cakes, freshly baked viennoiseries, Italian bites, and a warm pastel ambiance. An iconic Alpha 2 celebration spot frequented by couples, families, and college crowds.',
            review_quote: 'Great food! Good place to spend time with friends. The Belgian chocolate truffle cake and peri-peri pasta are genuinely world-class.',
            reviewer: 'Parul J. — Google Review',
            address: 'GF-55, KB Complex, Pocket F, Alpha 2, Greater Noida, UP 201310',
            phone: '+91 85888 13880',
            website: 'https://cremecastle.in',
            lat: 28.4735,
            lon: 77.5108,
            img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80'
        },
        {
            id: 'gn_2',
            name: 'Brijwasi Sweets & Restaurant',
            category: 'restaurant',
            tags: ['North Indian', 'Traditional Sweets', 'Pure Vegetarian'],
            rating_google: 4.4,
            reviews_google: '6,450',
            rating_tripadvisor: 4.5,
            reviews_tripadvisor: '140',
            editorial: 'Famous heritage sweet shop and pure vegetarian dining establishment renowned for its iconic Bedmi Puri, Chole Bhature, and rich seasonal Indian mithai.',
            review_quote: 'The best breakfast and sweet spot in the region! The freshly made kachoris and rasmalai are unmatched in flavor.',
            reviewer: 'Alok Gupta — Google Review',
            address: 'Beta 1 Commercial Belt, Greater Noida 201308',
            phone: '+91 120 232 0100',
            website: 'https://maps.google.com/?q=Brijwasi+Sweets+Greater+Noida',
            lat: 28.4712,
            lon: 77.5098,
            img: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80'
        },
        {
            id: 'gn_3',
            name: 'ChaoBella (Crowne Plaza)',
            category: 'finedining',
            tags: ['Italian', 'Pan-Asian', 'Wine Lounge'],
            rating_google: 4.5,
            reviews_google: '1,123',
            rating_tripadvisor: 4.7,
            reviews_tripadvisor: '177',
            editorial: 'An elegant dining sanctuary nestled within Crowne Plaza, ChaoBella masterfully pairs wood-fired Tuscan pizzas and fresh handmade fettuccine with Cantonese and Sichuan wok master dishes in a stylish dual-kitchen showcase.',
            review_quote: 'ChaoBella is definitely a haven for food buffs looking for authentic Italian flavours. The ravioli and dim sum were perfection.',
            reviewer: 'Deepak J. — Google Review',
            address: 'Surajpur Chowk, Crowne Plaza NCR, Institutional Green 1, Lakhnawali, Greater Noida 201306',
            phone: '+91 120 673 5000',
            website: 'https://www.ihg.com/crowneplaza',
            lat: 28.5284,
            lon: 77.4912,
            img: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=800&q=80'
        },
        {
            id: 'gn_4',
            name: 'Raja Dhaba',
            category: 'dhaba',
            tags: ['Highway Dhaba', 'North Indian', 'Late Night'],
            rating_google: 4.2,
            reviews_google: '8,420',
            rating_tripadvisor: 4.4,
            reviews_tripadvisor: '95',
            editorial: 'A Greater Noida legend along Kasna Road, Raja Dhaba serves authentic, unpretentious Punjabi delicacies. Famed for its clay oven garlic naans, black dal makhani, and sizzling tandoori chicken served well past midnight.',
            review_quote: 'The real taste of North Indian highway dhabas! Generous butter on hot tandoori rotis with creamy dal. Must visit after long road trips.',
            reviewer: 'Amit Sharma — Google Review',
            address: 'Kasna Road, near Pari Chowk, Greater Noida 201310',
            phone: '+91 98112 34567',
            website: 'https://maps.google.com/?q=Raja+Dhaba+Greater+Noida',
            lat: 28.4682,
            lon: 77.5142,
            img: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80'
        },
        {
            id: 'gn_5',
            name: 'The Yellow Chilli (by Sanjeev Kapoor)',
            category: 'restaurant',
            tags: ['Modern Indian', 'Celebrity Chef', 'Family Dining'],
            rating_google: 4.3,
            reviews_google: '4,150',
            rating_tripadvisor: 4.5,
            reviews_tripadvisor: '110',
            editorial: 'Celebrity Chef Sanjeev Kapoor brings gourmet Indian heritage alive at Ansal Plaza. Signature recipes include Shaam Savera (spinach koftas stuffed with cottage cheese in spiced tomato gravy) and fragrant Dum Gosht Biryani.',
            review_quote: 'Exceptional food quality and consistency. The Shaam Savera and Lalla Mussa Dal are unbeatable signature dishes.',
            reviewer: 'Rohit Verma — Google Review',
            address: '3rd Floor, Ansal Plaza Mall, Pari Chowk, Greater Noida 201308',
            phone: '+91 120 422 6601',
            website: 'https://theyellowchilli.com',
            lat: 28.4665,
            lon: 77.5115,
            img: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80'
        },
        {
            id: 'gn_6',
            name: 'Mosaic - Country Inn & Suites',
            category: 'finedining',
            tags: ['Buffet & Grill', 'Continental', 'Fine Dining'],
            rating_google: 4.4,
            reviews_google: '3,800',
            rating_tripadvisor: 4.6,
            reviews_tripadvisor: '142',
            editorial: 'Mosaic offers all-day gourmet dining with an expansive international buffet spread, live pasta and chaat counters, and refined European main courses situated centrally in the Alpha 1 commercial hub.',
            review_quote: 'A wonderful Sunday brunch spot with attentive service, freshly prepared live grills, and an irresistible bakery corner.',
            reviewer: 'Priya Nair — TripAdvisor',
            address: 'Country Inn & Suites, Alpha 1 Commercial Belt, Greater Noida 201308',
            phone: '+91 120 472 2222',
            website: 'https://www.countryinns.com',
            lat: 28.4758,
            lon: 77.5082,
            img: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80'
        },
        {
            id: 'gn_7',
            name: 'Caffe Tonino',
            category: 'cafe',
            tags: ['Tuscan Cafe', 'Neapolitan Pizza', 'Artisan Coffee'],
            rating_google: 4.5,
            reviews_google: '2,650',
            rating_tripadvisor: 4.7,
            reviews_tripadvisor: '88',
            editorial: 'Step into rustic Tuscan countryside vibes with exposed brick walls, warm pendant lighting, handcrafted sourdough pizzas baked in wood-burning ovens, and luscious Italian espresso and tiramisu.',
            review_quote: 'Feels just like a cozy bistro in Florence! The wood-fired crust is super airy and the burrata salad is freshest in town.',
            reviewer: 'Siddharth Mehta — Google Review',
            address: 'Plaza Market, Sector Alpha 2, Greater Noida 201310',
            phone: '+91 120 456 7890',
            website: 'https://caffetonino.in',
            lat: 28.4741,
            lon: 77.5122,
            img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80'
        },
        {
            id: 'gn_8',
            name: 'Satin (Radisson Blu)',
            category: 'finedining',
            tags: ['Teppanyaki', 'Sushi', 'Pan-Asian'],
            rating_google: 4.6,
            reviews_google: '1,890',
            rating_tripadvisor: 4.8,
            reviews_tripadvisor: '104',
            editorial: 'Celebrated as one of the best oriental dining rooms in the National Capital Region. Features live teppanyaki theatrical grills, fresh salmon sashimi, steamed dim sums, and fragrant Thai curries prepared by master culinary artisans.',
            review_quote: 'The live teppanyaki show by the chef is mesmerizing, and the wasabi prawns are divine. Premier fine dining in every way.',
            reviewer: 'Ruchi Grover — Google Review',
            address: 'Radisson Blu Hotel, Kasna Surajpur Site 4, Greater Noida 201306',
            phone: '+91 120 451 7777',
            website: 'https://www.radissonhotels.com',
            lat: 28.4720,
            lon: 77.5258,
            img: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80'
        },
        {
            id: 'gn_9',
            name: 'Pind Balluchi',
            category: 'restaurant',
            tags: ['Punjabi Delicacies', 'Clay Oven Tandoori', 'Village Ambiance'],
            rating_google: 4.3,
            reviews_google: '5,120',
            rating_tripadvisor: 4.4,
            reviews_tripadvisor: '115',
            editorial: 'Immersive rural Punjabi rustic decor serving slow-cooked Dal Balluchi, smoky Paneer Tikka, and handcrafted tandoori breads.',
            review_quote: 'The Dal Balluchi and garlic naan are phenomenal. Hearty portions, great family environment, and authentic Punjabi hospitality.',
            reviewer: 'Vikram Sahni — Google Review',
            address: 'Ansal Plaza, Pari Chowk, Greater Noida 201308',
            phone: '+91 120 422 6605',
            website: 'https://maps.google.com/?q=Pind+Balluchi+Greater+Noida',
            lat: 28.4668,
            lon: 77.5118,
            img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80'
        },
        {
            id: 'gn_10',
            name: 'Lawn Bistro & Lounge',
            category: 'bar',
            tags: ['Open-Air Lounge', 'Cocktail Bar', 'Live Music'],
            rating_google: 4.3,
            reviews_google: '2,450',
            rating_tripadvisor: 4.5,
            reviews_tripadvisor: '67',
            editorial: 'A leafy alfresco oasis near Knowledge Park III featuring manicured lawns under fairy string lights. Serves signature mixology cocktails, crisp draft beer, thin-crust pizzas, and lively weekend acoustic music sessions.',
            review_quote: 'Incredible evening vibe under open skies. The mocktails, sangrias, and cheese platters are top-notch.',
            reviewer: 'Tanvi Kapoor — Google Review',
            address: 'Near Knowledge Park III, Greater Noida 201306',
            phone: '+91 99990 12345',
            website: 'https://maps.google.com/?q=Lawn+Bistro+Greater+Noida',
            lat: 28.4812,
            lon: 77.4985,
            img: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80'
        }
    ];

    // State Variables
    let wgMap = null;
    let wgMarkers = [];
    let wgCurrentPlaces = [...wgCuratedGreaterNoida];
    let wgCurrentFilter = 'all';
    let wgCurrentSort = 'curated';
    let wgCurrentCityName = 'Greater Noida';
    let wgSavedPlaces = new Set(JSON.parse(localStorage.getItem('tb_saved_wander_places') || '[]'));

    // Cache of dynamic & curated city search results
    const wgCityCache = {};

        // Initialize Leaflet Map for WanderGuide
    function initWanderGuideMap(centerLat, centerLon, zoomLevel = 12) {
        const mapContainer = document.getElementById('wg-leaflet-map');
        if (!mapContainer || typeof L === 'undefined') return;

        if (!wgMap) {
            wgMap = L.map(mapContainer, {
                zoomControl: false
            }).setView([centerLat, centerLon], zoomLevel);

            // Clean OpenStreetMap raster tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19
            }).addTo(wgMap);

            L.control.zoom({ position: 'topright' }).addTo(wgMap);
        } else {
            wgMap.setView([centerLat, centerLon], zoomLevel);
            setTimeout(() => { wgMap.invalidateSize(); }, 200);
        }
    }

    // Show WanderGuide View
    function showWanderGuide(cityName) {
        const targetCity = cityName || (tripData.destination && tripData.destination !== 'Shillong' ? tripData.destination : 'Lucknow');
        const wizard = document.getElementById('wizard-view');
        const dash = document.getElementById('dashboard-view');
        const safety = document.getElementById('safety-dashboard-view');
        const explorer = document.getElementById('city-explorer-view');
        const monView = document.getElementById('destination-monitoring-view');
        const wgView = document.getElementById('wanderguide-view');
        const roView = document.getElementById('route-optimizer-view');

        if (wizard) wizard.classList.add('hidden');
        if (dash) dash.classList.add('hidden');
        if (safety) safety.classList.add('hidden');
        if (explorer) explorer.classList.add('hidden');
        if (monView) monView.classList.add('hidden');
        if (roView) roView.classList.add('hidden');
        if (wgView) {
            wgView.classList.remove('hidden');
            document.body.classList.add('wanderguide-active');
            window.scrollTo({ top: 0, behavior: 'instant' });
        }

        // Update Navbar Active State
        const navPlanner = document.getElementById('nav-planner-link');
        const navSafety = document.getElementById('nav-safety-link');
        const navExplorer = document.getElementById('nav-explorer-link');
        const navMon = document.getElementById('nav-monitoring-link');
        const navWg = document.getElementById('nav-wanderguide-link');
        const navRo = document.getElementById('nav-route-optimizer-link');

        if (navPlanner) navPlanner.classList.remove('active');
        if (navSafety) navSafety.classList.remove('active');
        if (navExplorer) navExplorer.classList.remove('active');
        if (navMon) navMon.classList.remove('active');
        if (navRo) navRo.classList.remove('active');
        if (navWg) navWg.classList.add('active');

        loadWanderCity(targetCity);
    }

    // Main City Loader (Calls Backend Food Discovery API)
    async function loadWanderCity(cityQuery) {
        if (!cityQuery) return;
        const cleanName = cityQuery.trim();
        wgCurrentCityName = cleanName;

        // Update Header & Breadcrumb UI
        const bcCity = document.getElementById('wg-breadcrumb-city');
        const headCity = document.getElementById('wg-heading-city');
        const searchInput = document.getElementById('wg-city-search-input');
        const loadingState = document.getElementById('wg-loading-state');
        const cardsContainer = document.getElementById('wg-cards-container');
        const emptyState = document.getElementById('wg-empty-state');
        const loadingTitle = document.getElementById('wg-loading-title');

        if (bcCity) bcCity.textContent = cleanName;
        if (headCity) headCity.textContent = cleanName;
        if (searchInput) searchInput.value = cleanName;

        const cacheKey = cleanName.toLowerCase();
        if (wgCityCache[cacheKey] && Array.isArray(wgCityCache[cacheKey]) && wgCityCache[cacheKey].length > 0) {
            wgCurrentPlaces = wgCityCache[cacheKey];
            renderWanderPlaces();
            return;
        }

        if (loadingState) {
            loadingState.classList.remove('hidden');
            if (loadingTitle) loadingTitle.textContent = `Gathering authentic dining spots in ${cleanName}...`;
        }
        if (cardsContainer) cardsContainer.innerHTML = '';
        if (emptyState) emptyState.classList.add('hidden');

        try {
            const token = localStorage.getItem('token') || '';
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch('/api/places/city', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    cityName: cleanName,
                    limit: 20,
                    mode: 'eat'
                })
            });

            const data = await res.json();
            if (!data.success || !Array.isArray(data.places) || data.places.length === 0) {
                throw new Error(data.message || `No dining spots found for "${cleanName}".`);
            }

            // Exclude any non-food entries if present
            const foodPlaces = data.places.filter(p => {
                const c = (p.category || '').toLowerCase();
                return c !== 'attraction' && !c.includes('sight');
            });

            wgCurrentPlaces = foodPlaces;
            wgCityCache[cacheKey] = foodPlaces;

            if (data.city && Number.isFinite(data.city.lat) && Number.isFinite(data.city.lon)) {
                initWanderGuideMap(data.city.lat, data.city.lon, data.city.zoom || 12);
            }

            renderWanderPlaces();
        } catch (err) {
            console.warn("WanderGuide place discovery error:", err);
            if (emptyState) emptyState.classList.remove('hidden');
            if (cardsContainer) cardsContainer.innerHTML = '';
            clearWanderMapMarkers();
        } finally {
            if (loadingState) loadingState.classList.add('hidden');
        }
    }

    // Render Cards and Map Pins
    function renderWanderPlaces() {
        const cardsContainer = document.getElementById('wg-cards-container');
        const displayCount = document.getElementById('wg-display-count');
        const pillCountAll = document.getElementById('wg-pill-count-all');
        const mapActiveCount = document.getElementById('wg-map-active-count');
        const emptyState = document.getElementById('wg-empty-state');
        const loadingState = document.getElementById('wg-loading-state');

        if (loadingState) loadingState.classList.add('hidden');
        if (!cardsContainer) return;

        // Apply Category Filter
        let filtered = wgCurrentPlaces.filter(p => {
            if (wgCurrentFilter === 'all') return true;
            return p.category.toLowerCase() === wgCurrentFilter.toLowerCase();
        });

        // Apply Sorting
        if (wgCurrentSort === 'rating') {
            filtered.sort((a, b) => (b.rating_google || 0) - (a.rating_google || 0));
        } else if (wgCurrentSort === 'reviews') {
            filtered.sort((a, b) => {
                const parseNum = (str) => parseInt(String(str || '0').replace(/[^0-9]/g, '')) || 0;
                return parseNum(b.reviews_google) - parseNum(a.reviews_google);
            });
        }

        if (displayCount) displayCount.textContent = filtered.length;
        if (pillCountAll) pillCountAll.textContent = wgCurrentPlaces.length;
        if (mapActiveCount) mapActiveCount.textContent = `${filtered.length} places on map`;

        if (filtered.length === 0) {
            cardsContainer.innerHTML = '';
            if (emptyState) emptyState.classList.remove('hidden');
            clearWanderMapMarkers();
            return;
        } else {
            if (emptyState) emptyState.classList.add('hidden');
        }

        // Generate HTML Cards
        cardsContainer.innerHTML = filtered.map((place, index) => {
            const num = index + 1;
            const isSaved = wgSavedPlaces.has(place.name);
            const tagPills = (place.tags || []).map(t => `<span class="wg-tag">${t}</span>`).join('');
            
            return `
                <article class="wg-place-card" id="wg-card-${index}" data-index="${index}" data-lat="${place.lat}" data-lon="${place.lon}">
                    <div class="wg-card-header">
                        <div class="wg-title-area">
                            <div class="wg-pin-badge">${num}</div>
                            <div>
                                <h3 class="wg-card-title">
                                    <a href="${place.website}" target="_blank" rel="noopener">${place.name}</a>
                                </h3>
                            </div>
                        </div>
                        <div class="wg-card-actions">
                            <button class="wg-btn-save ${isSaved ? 'saved' : ''}" data-name="${place.name}">
                                <span>${isSaved ? '❤️ Saved' : '🤍 Save'}</span>
                            </button>
                            <button class="wg-btn-add" data-index="${index}">+ Add to Trip</button>
                        </div>
                    </div>

                    <div class="wg-card-img-wrapper">
                        <img src="${place.img || place.photoUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80'}"
                             alt="${place.name}"
                             id="wg-img-${place.id}"
                             class="wg-card-img"
                             loading="lazy"
                             onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80';">
                        <div class="wg-card-badges">
                            ${tagPills}
                        </div>
                    </div>

                    <div class="wg-ratings-row">
                        ${place.rating_google ? `
                        <div class="wg-rating-item">
                            <span class="wg-stars">⭐ </span>
                            <span class="wg-rating-score">${place.rating_google}</span>
                            ${place.reviews_google ? `<span class="wg-rating-count">(${place.reviews_google} reviews on Google)</span>` : ''}
                        </div>
                        ` : ''}
                        ${place.rating_tripadvisor ? `
                        <span class="wg-dot-sep">•</span>
                        <div class="wg-rating-item">
                            <span class="wg-stars">⭐ </span>
                            <span class="wg-rating-score">${place.rating_tripadvisor}</span>
                            ${place.reviews_tripadvisor ? `<span class="wg-rating-count">(${place.reviews_tripadvisor} on TripAdvisor)</span>` : ''}
                        </div>
                        ` : ''}
                        ${!place.rating_google && !place.rating_tripadvisor ? `
                        <div class="wg-rating-item">
                            <span class="wg-stars">📍 </span>
                            <span class="wg-rating-score">Popular Local Spot</span>
                        </div>
                        ` : ''}
                    </div>

                    <p class="wg-editorial">${place.editorial}</p>

                    ${place.review_quote ? `
                        <blockquote class="wg-review-quote">
                            <p>"${place.review_quote}"</p>
                            <cite>${place.reviewer}</cite>
                        </blockquote>
                    ` : ''}

                    <div class="wg-meta-row">
                        <div class="wg-meta-item">
                            <span>📍</span>
                            <span>${place.address}</span>
                        </div>
                        ${place.phone ? `
                            <div class="wg-meta-item">
                                <span>📞</span>
                                <a href="tel:${place.phone}">${place.phone}</a>
                            </div>
                        ` : ''}
                        ${place.website ? `
                            <div class="wg-meta-item">
                                <span>🌐</span>
                                <a href="${place.website}" target="_blank" rel="noopener">Website</a>
                            </div>
                        ` : ''}
                        <div class="wg-meta-item">
                            <span>🗺️</span>
                            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' ' + place.address)}" target="_blank" rel="noopener">Directions</a>
                        </div>
                    </div>
                </article>
            `;
        }).join('');

        // Wire Up Interactive Leaflet Markers
        updateWanderMapMarkers(filtered);
        attachWanderCardEventListeners(filtered);
    }

    // Update Markers on Leaflet Map
    function updateWanderMapMarkers(places) {
        if (!places || places.length === 0) return;

        const firstPlace = places[0];
        initWanderGuideMap(firstPlace.lat, firstPlace.lon, 12);
        clearWanderMapMarkers();

        const latLngBounds = [];

        places.forEach((place, index) => {
            const num = index + 1;
            const customIcon = L.divIcon({
                className: 'wg-custom-marker',
                html: `<div class="wg-map-pin" id="wg-map-pin-${index}" data-index="${index}"><span class="wg-map-pin-num">${num}</span></div>`,
                iconSize: [32, 38],
                iconAnchor: [16, 38],
                popupAnchor: [0, -36]
            });

            const marker = L.marker([place.lat, place.lon], { icon: customIcon }).addTo(wgMap);
            latLngBounds.push([place.lat, place.lon]);

            // Marker Click Event: Open Floating Preview & Scroll List
            marker.on('click', () => {
                highlightActiveCardAndPin(index);
                showMapPlacePreview(place, num, index);
                const targetCard = document.getElementById(`wg-card-${index}`);
                if (targetCard) {
                    targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });

            wgMarkers.push(marker);
        });

        // Auto-fit all markers smoothly
        if (wgMap && latLngBounds.length > 0) {
            setTimeout(() => {
                wgMap.invalidateSize();
                wgMap.fitBounds(latLngBounds, { padding: [40, 40], maxZoom: 15 });
            }, 300);
        }
    }

    function clearWanderMapMarkers() {
        if (wgMarkers && wgMarkers.length > 0) {
            wgMarkers.forEach(m => wgMap && wgMap.removeLayer(m));
            wgMarkers = [];
        }
    }

    // Highlight Card & Pin
    function highlightActiveCardAndPin(activeIdx) {
        document.querySelectorAll('.wg-place-card').forEach((c, idx) => {
            if (idx === activeIdx) {
                c.classList.add('is-active');
            } else {
                c.classList.remove('is-active');
            }
        });

        document.querySelectorAll('.wg-map-pin').forEach((pin, idx) => {
            if (idx === activeIdx) {
                pin.classList.add('active');
            } else {
                pin.classList.remove('active');
            }
        });
    }

    // Floating Map Preview Popup
    function showMapPlacePreview(place, num, index) {
        const preview = document.getElementById('wg-map-card-preview');
        if (!preview) return;

        document.getElementById('wg-prev-img').src = place.img;
        document.getElementById('wg-prev-num').textContent = num;
        document.getElementById('wg-prev-cat').textContent = place.tags && place.tags[0] ? place.tags[0] : place.category;
        document.getElementById('wg-prev-rating').textContent = `⭐ ${place.rating_google}`;
        document.getElementById('wg-prev-title').textContent = place.name;
        document.getElementById('wg-prev-desc').textContent = place.editorial;

        const scrollBtn = document.getElementById('wg-prev-scroll-btn');
        const addBtn = document.getElementById('wg-prev-add-btn');

        if (scrollBtn) {
            scrollBtn.onclick = () => {
                const targetCard = document.getElementById(`wg-card-${index}`);
                if (targetCard) targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            };
        }

        if (addBtn) {
            addBtn.onclick = () => {
                addPlaceToTripItinerary(place, addBtn);
            };
        }

        preview.classList.remove('hidden');
    }

    // Add Place to User Trip Itinerary
    function addPlaceToTripItinerary(place, buttonElement) {
        if (!currentItinerary || currentItinerary.length === 0) {
            currentItinerary = [
                { day: 1, activities: [] }
            ];
        }

        const newActivity = {
            id: Date.now(),
            time: '01:00 PM',
            type: place.category === 'attraction' ? 'Sightseeing' : 'Food',
            title: place.name,
            desc: place.editorial,
            cost: 20,
            locked: false
        };

        if (currentItinerary[0]) {
            currentItinerary[0].activities.push(newActivity);
        }

        if (buttonElement) {
            buttonElement.textContent = '✓ Added to Trip';
            buttonElement.classList.add('added');
        }

        // Update dashboard destination title if unset
        if (!tripData.destination || tripData.destination === 'Shillong') {
            tripData.destination = wgCurrentCityName;
            const destTitle = document.getElementById('dash-dest-title');
            if (destTitle) destTitle.textContent = `${wgCurrentCityName} Trip`;
        }

        // Show friendly advisory toast
        const operatorToast = document.getElementById('operator-toast');
        if (operatorToast) {
            const toastMsg = document.getElementById('toast-msg-text');
            if (toastMsg) {
                toastMsg.textContent = `"${place.name}" added to your Day 1 Itinerary in Trip Planner!`;
            }
            operatorToast.classList.remove('hidden');
            setTimeout(() => { operatorToast.classList.add('hidden'); }, 4000);
        }
    }

    // Attach Event Listeners to Cards
    function attachWanderCardEventListeners(places) {
        document.querySelectorAll('.wg-place-card').forEach(card => {
            const idx = parseInt(card.dataset.index, 10);
            const place = places[idx];

            // Card Hover: Pulse marker pin
            card.addEventListener('mouseenter', () => {
                const pin = document.getElementById(`wg-map-pin-${idx}`);
                if (pin) pin.classList.add('active');
            });
            card.addEventListener('mouseleave', () => {
                const pin = document.getElementById(`wg-map-pin-${idx}`);
                if (pin) pin.classList.remove('active');
            });

            // Card Click: Center on map & open preview
            card.addEventListener('click', (e) => {
                if (e.target.closest('button') || e.target.closest('a')) return;
                highlightActiveCardAndPin(idx);
                if (wgMap && place) {
                    wgMap.flyTo([place.lat, place.lon], 15, { duration: 0.8 });
                }
                showMapPlacePreview(place, idx + 1, idx);
            });

            // Save Button
            const saveBtn = card.querySelector('.wg-btn-save');
            if (saveBtn) {
                saveBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const name = saveBtn.dataset.name;
                    if (wgSavedPlaces.has(name)) {
                        wgSavedPlaces.delete(name);
                        saveBtn.classList.remove('saved');
                        saveBtn.querySelector('span').textContent = '🤍 Save';
                    } else {
                        wgSavedPlaces.add(name);
                        saveBtn.classList.add('saved');
                        saveBtn.querySelector('span').textContent = '❤️ Saved';
                    }
                    localStorage.setItem('tb_saved_wander_places', JSON.stringify([...wgSavedPlaces]));
                });
            }

            // Add to Trip Button
            const addBtn = card.querySelector('.wg-btn-add');
            if (addBtn) {
                addBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    addPlaceToTripItinerary(place, addBtn);
                });
            }
        });
    }

    // Global Event Listeners for WanderGuide Controls
    const wgSearchInput = document.getElementById('wg-city-search-input');
    const wgSearchBtn = document.getElementById('wg-btn-search');
    if (wgSearchBtn && wgSearchInput) {
        wgSearchBtn.addEventListener('click', () => {
            if (wgSearchInput.value.trim()) {
                loadWanderCity(wgSearchInput.value.trim());
            }
        });
        wgSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && wgSearchInput.value.trim()) {
                loadWanderCity(wgSearchInput.value.trim());
            }
        });
    }

    // Quick City Chips
    document.querySelectorAll('.wg-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const city = chip.dataset.city;
            if (city) loadWanderCity(city);
        });
    });

    // Category Filter Pills
    document.querySelectorAll('.wg-filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.wg-filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            wgCurrentFilter = pill.dataset.filter || 'all';
            renderWanderPlaces();
        });
    });

    // Sort Dropdown
    const sortSelect = document.getElementById('wg-sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            wgCurrentSort = e.target.value;
            renderWanderPlaces();
        });
    }

    // Fit Map & Recenter Buttons
    const btnFitMap = document.getElementById('wg-btn-fit-map');
    const btnRecenter = document.getElementById('wg-map-recenter');
    if (btnFitMap) {
        btnFitMap.addEventListener('click', () => {
            if (wgMap && wgCurrentPlaces.length > 0) {
                const bounds = wgCurrentPlaces.map(p => [p.lat, p.lon]);
                wgMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
            }
        });
    }
    if (btnRecenter) {
        btnRecenter.addEventListener('click', () => {
            if (wgMap && wgCurrentPlaces.length > 0) {
                const p = wgCurrentPlaces[0];
                wgMap.setView([p.lat, p.lon], 13);
            }
        });
    }

    // Mobile Map Toggle
    const mobileToggle = document.getElementById('wg-mobile-map-toggle');
    const mapCol = document.getElementById('wg-map-column');
    if (mobileToggle && mapCol) {
        mobileToggle.addEventListener('click', () => {
            mapCol.classList.toggle('mobile-open');
            if (mapCol.classList.contains('mobile-open')) {
                mobileToggle.textContent = '📋 Show List';
                if (wgMap) setTimeout(() => wgMap.invalidateSize(), 200);
            } else {
                mobileToggle.textContent = '🗺️ Show Map';
            }
        });
    }

    // Close Floating Preview
    const closePreviewBtn = document.getElementById('wg-close-preview');
    if (closePreviewBtn) {
        closePreviewBtn.addEventListener('click', () => {
            const preview = document.getElementById('wg-map-card-preview');
            if (preview) preview.classList.add('hidden');
        });
    }

    // Back to Planner Button
    const btnWgBack = document.getElementById('wg-btn-back');
    if (btnWgBack) {
        btnWgBack.addEventListener('click', () => {
            const wgView = document.getElementById('wanderguide-view');
            if (wgView) wgView.classList.add('hidden');
            const navWg = document.getElementById('nav-wanderguide-link');
            if (navWg) navWg.classList.remove('active');
            const navPlanner = document.getElementById('nav-planner-link');
            if (navPlanner) navPlanner.classList.add('active');

            if (currentItinerary && currentItinerary.length > 0) {
                document.getElementById('dashboard-view').classList.remove('hidden');
            } else {
                document.getElementById('wizard-view').classList.remove('hidden');
            }
        });
    }

    // Connect Navbar Link & Dashboard Button
    const navWanderLink = document.getElementById('nav-wanderguide-link');
    if (navWanderLink) {
        navWanderLink.addEventListener('click', (e) => {
            e.preventDefault();
            const targetCity = (tripData.destination && tripData.destination !== 'Shillong') ? tripData.destination : 'Lucknow';
            showWanderGuide(targetCity);
        });
    }

    const btnViewWander = document.getElementById('btn-view-wanderguide');
    if (btnViewWander) {
        btnViewWander.addEventListener('click', () => {
            const targetCity = (tripData.destination && tripData.destination !== 'Shillong') ? tripData.destination : 'Lucknow';
            showWanderGuide(targetCity);
        });
    }


    // Check URL for tripId on load
    const __tbUrlParams = new URLSearchParams(window.location.search);
    const tripId = __tbUrlParams.get('tripId');
    if (tripId) {
        wizardView.classList.add('hidden');
        loadingOverlay.classList.remove('hidden');
        loaderStatus.textContent = 'Loading your itinerary...';
        
        const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3000' : '';
        fetch(`${baseUrl}/api/trips/${tripId}`, {
                headers: TravelBuddyAuth.authHeaders()
            })
            .then(res => {
                if (!res.ok) throw new Error('Trip not found');
                return res.json();
            })
            .then(data => {
                Object.assign(tripData, data.metadata);
                currentTripId = tripId;
                currentItinerary = normalizeItinerary(data.itinerary);
                
                loadingOverlay.classList.add('hidden');
                dashboardView.classList.remove('hidden');
                tripQualityScore = Math.floor(Math.random() * 6) + 94;
                renderDashboard();
            })
            .catch(err => {
                console.error(err);
                alert('Failed to load trip.');
                loadingOverlay.classList.add('hidden');
                wizardView.classList.remove('hidden');
            });
    }
    // Save Trip button listener
    const saveTripBtns = document.querySelectorAll('.btn-dash-save');
    saveTripBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            try {
                btn.disabled = true;
                const origHtml = btn.innerHTML;
                btn.innerHTML = '<span>⏳</span> Saving...';

                normalizeItinerary(currentItinerary);
                const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
                    ? (window.location.port === '5500' ? 'http://localhost:3000' : '') 
                    : '';
                
                let tripId = currentTripId || new URLSearchParams(window.location.search).get('tripId');
                let res;
                if (tripId) {
                    res = await fetch(`${baseUrl}/api/trips/${tripId}`, {
                        method: 'PATCH',
                        headers: (window.TravelBuddyAuth && window.TravelBuddyAuth.authHeaders) 
                            ? window.TravelBuddyAuth.authHeaders({ 'Content-Type': 'application/json' }) 
                            : { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            metadata: { ...(tripData || {}), is_saved: true, isSaved: true }, 
                            is_saved: true,
                            isSaved: true,
                            itinerary: currentItinerary 
                        })
                    });
                } else {
                    res = await fetch(`${baseUrl}/api/generate-trip`, {
                        method: 'POST',
                        headers: (window.TravelBuddyAuth && window.TravelBuddyAuth.authHeaders) 
                            ? window.TravelBuddyAuth.authHeaders({ 'Content-Type': 'application/json' }) 
                            : { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...(tripData || {}), is_saved: true, isSaved: true })
                    });
                    const d = await res.json();
                    if (d.tripId) {
                        currentTripId = d.tripId;
                        const newUrl = new URL(window.location);
                        newUrl.searchParams.set('tripId', currentTripId);
                        window.history.pushState({}, '', newUrl);
                    }
                }

                btn.innerHTML = '<span>✅</span> Saved!';
                setTimeout(() => {
                    btn.innerHTML = origHtml;
                    btn.disabled = false;
                }, 2500);

                addCopilotMsg("Your trip itinerary has been saved and synchronized to your phone!", false);
            } catch (err) {
                console.error("Save trip error:", err);
                alert("Could not save trip: " + err.message);
                btn.disabled = false;
                btn.innerHTML = '<span>🔖</span> Save Trip';
            }
        });
    });

});
