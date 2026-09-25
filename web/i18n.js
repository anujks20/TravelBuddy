/**
 * TravelBuddy Internationalization (i18n) Engine
 * Supports Indian & Foreign language families with instant DOM translation and dynamic hooks.
 */

const I18N_LANGUAGES = {
    // Indian Languages
    hi: { name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳', region: 'indian' },
    mr: { name: 'Marathi', native: 'मराठी', flag: '🚩', region: 'indian' },
    gu: { name: 'Gujarati', native: 'ગુજરાતી', flag: '🦁', region: 'indian' },
    kn: { name: 'Kannada', native: 'ಕನ್ನಡ', flag: '🟡', region: 'indian' },
    ta: { name: 'Tamil', native: 'தமிழ்', flag: '🛕', region: 'indian' },
    te: { name: 'Telugu', native: 'తెలుగు', flag: '🌴', region: 'indian' },
    bn: { name: 'Bengali', native: 'বাংলা', flag: '🐅', region: 'indian' },

    // Foreign Languages
    en: { name: 'English', native: 'English', flag: '🇬🇧', region: 'foreign' },
    fr: { name: 'French', native: 'Français', flag: '🇫🇷', region: 'foreign' },
    de: { name: 'German', native: 'Deutsch', flag: '🇩🇪', region: 'foreign' },
    es: { name: 'Spanish', native: 'Español', flag: '🇪🇸', region: 'foreign' },
    it: { name: 'Italian', native: 'Italiano', flag: '🇮🇹', region: 'foreign' },
    ja: { name: 'Japanese', native: '日本語', flag: '🇯🇵', region: 'foreign' }
};

const I18N_TRANSLATIONS = {
    en: {
        // Nav & Common
        "nav_destinations": "Destinations",
        "nav_experiences": "Experiences",
        "nav_explorer": "City Explorer",
        "nav_route_optimizer": "Route & Budget Optimizer",
        "nav_planner": "Trip Planner",
        "nav_safety": "Safety Analysis",
        "nav_monitoring_full": "IoT Destination Monitor",
        "nav_monitoring_short": "IoT Monitor",
        "nav_wanderguide": "Where to Eat & Explore",
        "nav_contact": "Contact",
        "nav_find_dream": "Find my dream",
        "nav_back_home": "Back to Home",
        "tab_indian_langs": "🇮🇳 Indian Languages",
        "tab_foreign_langs": "🌍 Foreign Languages",

        // Hero Index
        "hero_title": "Design Your Perfect",
        "hero_title_em": "Escape",
        "hero_subtitle": "Experience the world like never before with curated itineraries and exclusive access to the most breathtaking destinations on the planet.",
        "hero_cta": "Start Planning",

        // Wizard Steps Header
        "wizard_title": "Design Your Itinerary",
        "step_1_title": "Where & When",
        "step_2_title": "Who & How",
        "step_3_title": "Interests & Preferences",
        "step_4_title": "Budget & Details",
        "step_5_title": "Review Your Trip",

        // Step 1
        "label_origin": "Starting Location (Origin)",
        "label_destination": "Destination",
        "placeholder_destination": "e.g. Tokyo, Japan or Mumbai, India",
        "label_travel_mode": "Travel Mode",
        "label_start_date": "Start Date",
        "label_end_date": "End Date",

        // Step 2
        "label_travelers": "Number of Travelers",
        "label_travel_pace": "Travel Pace",
        "pace_relaxed": "Relaxed",
        "pace_relaxed_desc": "Slower pace, more downtime",
        "pace_balanced": "Balanced",
        "pace_balanced_desc": "A good mix of exploring and rest",
        "pace_packed": "Packed",
        "pace_packed_desc": "See as much as possible",

        // Step 3
        "label_select_interests": "Select Interests",
        "interest_culture": "Culture & History",
        "interest_food": "Food & Dining",
        "interest_nature": "Nature & Outdoors",
        "interest_shopping": "Shopping",
        "interest_nightlife": "Nightlife",
        "interest_adventure": "Adventure",
        "interest_relaxation": "Relaxation",
        "label_dietary_pref": "Dietary Preferences",
        "placeholder_dietary_pref": "e.g. Vegetarian, Halal, Vegan (Optional)",

        // Step 4
        "label_total_budget": "Total Budget",
        "placeholder_budget": "e.g. 5000",
        "label_special_reqs": "Special Requirements / Must-Visit Places",
        "placeholder_special_reqs": "Any specific requirements, accessibility needs, or places you must see?",

        // Buttons
        "btn_back": "Back",
        "btn_next": "Next Step",
        "btn_generate": "Generate Itinerary",

        // Loader
        "loader_crafting": "AI is crafting your perfect escape...",
        "loader_analyzing": "Analyzing destination data...",

        // Dashboard
        "copilot_title": "Trip Copilot AI",
        "copilot_welcome": "Hello! I've drafted your itinerary. Want me to tweak anything? (e.g. 'make day 2 cheaper', 'more relaxed')",
        "copilot_placeholder": "Ask me to change something...",
        "copilot_send": "Send",
        "dash_your_trip": "Your Trip",
        "dash_btn_wanderguide": "🍴 Where to Eat & Explore",
        "dash_btn_explorer": "🏙️ Explore City",
        "dash_btn_safety": "🛡️ View Safety Analysis",
        "dash_btn_monitoring": "📡 IoT Destination Monitor",
        "dash_btn_export": "Export",
        "dash_btn_save": "Save Trip",
        "score_quality_title": "Trip Quality Score",
        "score_desc": "Excellent match for your preferences and budget.",
        "cost_breakdown_title": "Cost Breakdown (Est.)",
        "cost_total": "Total:",
        "interactive_map_title": "Interactive Map",

        // Safety View
        "safety_banner_title": "🛡️ TRAVELX Safety Intelligence",
        "safety_banner_sub": "AI-powered safety and timing analysis for your itinerary",
        "btn_back_to_itinerary": "← Back to Itinerary",
        "label_opt_pref": "Optimization Preference:",
        "opt_safety_first": "🛡️ Safety First",
        "opt_balanced": "⚖️ Balanced",
        "opt_experience_first": "🎒 Experience First",
        "btn_refresh_analysis": "↻ Refresh Analysis",
        "btn_optimize_trip": "✨ Optimize My Trip",
        "card_overall_safety": "Overall Safety Score",
        "card_weather_safety": "🌦️ Weather Safety",
        "card_crowd_density": "👥 Crowd Density Intelligence",
        "card_safety_alerts": "🚨 Safety Alerts",
        "card_optimization": "🔄 Safety-Aware Itinerary Optimization",
        "card_reasoning": "🧠 Why TRAVELX Recommended This",
        "card_safe_route": "🛡️ Safe Route Recommendation",
        "card_risk_radar": "🚨 Travel Risk Radar",
        "card_trip_readiness": "🎒 Trip Readiness",
        "card_safety_summary": "🛡️ Trip Safety Summary",
        "card_emergency_center": "🚨 Travel Safety Center",
        "emergency_police": "🚓 Police / Emergency",
        "emergency_hospital": "🚑 Nearby Hospital",
        "emergency_share": "📍 Share Location",
        "btn_share_wa": "Share via WhatsApp",

        // IoT Monitor View
        "mon_live_grid": "LIVE SENSOR GRID",
        "mon_future_scope": "FUTURE SCOPE PREVIEW",
        "mon_main_title": "📡 Smart Destination Monitoring & IoT Telemetry",
        "mon_main_sub": "Real-time destination carrying capacity, environmental hydrological monitoring, and edge-computing IoT sensor deployment.",
        "mon_label_city": "Monitored Destination:",
        "mon_grid_operational": "Grid Status: 100% Operational",
        "mon_infra_tag": "1. DESTINATION INFRASTRUCTURE",
        "mon_hotels_monitored": "Hotels Monitored",
        "mon_attractions_tracked": "Attractions Tracked",
        "mon_travel_operators": "Travel Operators",
        "mon_tourist_zones": "Tourist Zones",
        "mon_time_sim_title": "⏱️ Time-of-Day Telemetry Simulation:",
        "mon_time_sim_sub": "Simulate environmental and crowd fluctuations throughout the day",
        "btn_broadcast_warn": "📢 Broadcast Warning to Travel Operators",
        "btn_reroute_tourists": "🗺️ Suggest Alternate Attractions",

        // City Explorer
        "ce_default_title": "Select a City",
        "ce_default_desc": "Discover the city before you plan your trip.",
        "ce_placeholder": "Search any city (e.g. Mumbai, Tokyo, Paris)...",
        "ce_places_title": "📌 Important Places",
        "ce_filter_all": "All",
        "ce_filter_attractions": "Attractions",
        "ce_filter_culture": "Culture",
        "ce_filter_food": "Food",
        "ce_filter_nature": "Nature",
        "ce_add_to_trip": "Add to Trip",
        "ce_locals_recommend": "🗣️ What Locals Recommend",
        "ce_share_tip_title": "Share Your Local Tip",
        "btn_submit_rec": "Submit Recommendation",

        // Wanderguide
        "wg_back_planner": "← Back to Trip Planner",
        "wg_popular_guides": "Popular Guides:",
        "wg_hero_sub": "We've curated top-rated spots from culinary guides, food critics, and real diners across Google and TripAdvisor.",
        "wg_search_placeholder": "Search any destination (e.g. Greater Noida, Mumbai, Paris, Tokyo)...",
        "wg_btn_search": "Search City",
        "wg_filter_all": "🍽️ All Places",
        "wg_filter_restaurants": "🥘 Best Restaurants",
        "wg_filter_cafes": "🍰 Cafes & Bakeries",
        "wg_filter_finedining": "🍝 Italian & Fine Dining",
        "wg_filter_dhaba": "🍛 Local Food & Dhabas",
        "wg_filter_bars": "🍸 Bars & Lounges",
        "wg_filter_hotels": "🏨 Stays & Hotels",
        "wg_filter_sightseeing": "🏛️ Sightseeing",
        "wg_sort_label": "Sort by:",
        "wg_sort_curated": "Curated Ranking",
        "wg_sort_rating": "Highest Rated",
        "wg_sort_reviews": "Most Reviews"
    },

    hi: {
        // Nav & Common
        "nav_destinations": "गंतव्य स्थान",
        "nav_experiences": "अनुभव",
        "nav_explorer": "सिटी एक्सप्लोरर",
        "nav_route_optimizer": "मार्ग और बजट अनुकूलक",
        "nav_planner": "ट्रिप प्लानर",
        "nav_safety": "सुरक्षा विश्लेषण",
        "nav_monitoring_full": "IoT गंतव्य मॉनिटर",
        "nav_monitoring_short": "IoT मॉनिटर",
        "nav_wanderguide": "कहाँ खाएं और घूमें",
        "nav_contact": "संपर्क करें",
        "nav_find_dream": "सपनों का सफर खोजें",
        "nav_back_home": "होम पेज पर लौटें",
        "tab_indian_langs": "🇮🇳 भारतीय भाषाएं",
        "tab_foreign_langs": "🌍 विदेशी भाषाएं",

        // Hero Index
        "hero_title": "तैयार करें अपनी यादगार",
        "hero_title_em": "छुट्टियां",
        "hero_subtitle": "दुनिया की सबसे खूबसूरत जगहों के लिए विशेष यात्रा कार्यक्रम और अनुभव प्राप्त करें।",
        "hero_cta": "प्लानिंग शुरू करें",

        // Wizard Steps Header
        "wizard_title": "अपनी यात्रा का खाका तैयार करें",
        "step_1_title": "कहाँ और कब",
        "step_2_title": "कौन और कैसे",
        "step_3_title": "पसंद और प्राथमिकताएं",
        "step_4_title": "बजट और विवरण",
        "step_5_title": "समीक्षा करें",

        // Step 1
        "label_origin": "प्रारंभिक स्थान (मूल)",
        "label_destination": "गंतव्य (शहर / देश)",
        "placeholder_destination": "उदा. मुंबई, दिल्ली, टोक्यो, पेरिस",
        "label_travel_mode": "यात्रा मोड",
        "label_start_date": "शुरुआत की तारीख",
        "label_end_date": "समाप्ति की तारीख",

        // Step 2
        "label_travelers": "यात्रियों की संख्या",
        "label_travel_pace": "यात्रा की गति",
        "pace_relaxed": "आरामदायक",
        "pace_relaxed_desc": "धीमी गति, विश्राम के साथ",
        "pace_balanced": "संतुलित",
        "pace_balanced_desc": "घूमने और आराम का उत्तम संगम",
        "pace_packed": "तेज़ और व्यस्त",
        "pace_packed_desc": "अधिक से अधिक जगहें देखें",

        // Step 3
        "label_select_interests": "अपनी रुचियां चुनें",
        "interest_culture": "संस्कृति और इतिहास",
        "interest_food": "स्वादिष्ट भोजन",
        "interest_nature": "प्रकृति और खुले स्थान",
        "interest_shopping": "खरीदारी",
        "interest_nightlife": "नाइटलाइफ",
        "interest_adventure": "रोमांच और साहसिक",
        "interest_relaxation": "शांति और विश्राम",
        "label_dietary_pref": "खान-पान प्राथमिकता",
        "placeholder_dietary_pref": "उदा. शाकाहारी, जैन, वीगन (वैकल्पिक)",

        // Step 4
        "label_total_budget": "कुल बजट",
        "placeholder_budget": "उदा. 25000",
        "label_special_reqs": "विशेष आवश्यकताएं / पसंदीदा जगहें",
        "placeholder_special_reqs": "कोई विशेष आवश्यकता या कोई पसंदीदा स्थान?",

        // Buttons
        "btn_back": "पीछे",
        "btn_next": "अगला कदम",
        "btn_generate": "यात्रा कार्यक्रम बनाएं",

        // Loader
        "loader_crafting": "AI आपकी सही यात्रा तैयार कर रहा है...",
        "loader_analyzing": "गंतव्य डेटा का विश्लेषण किया जा रहा है...",

        // Dashboard
        "copilot_title": "ट्रिप कोपायलट AI",
        "copilot_welcome": "नमस्ते! मैंने आपका यात्रा कार्यक्रम तैयार कर दिया है। क्या आप कुछ बदलना चाहते हैं? (उदा. 'दिन 2 अधिक सस्ता करें')",
        "copilot_placeholder": "मुझसे कुछ भी बदलने को कहें...",
        "copilot_send": "भेजें",
        "dash_your_trip": "आपकी यात्रा",
        "dash_btn_wanderguide": "🍴 कहाँ खाएं और घूमें",
        "dash_btn_explorer": "🏙️ शहर खोजें",
        "dash_btn_safety": "🛡️ सुरक्षा विश्लेषण देखें",
        "dash_btn_monitoring": "📡 IoT गंतव्य मॉनिटर",
        "dash_btn_export": "एक्सपोर्ट करें",
        "dash_btn_save": "यात्रा सहेजें",
        "score_quality_title": "यात्रा गुणवत्ता स्कोर",
        "score_desc": "आपकी प्राथमिकताओं और बजट के लिए उत्कृष्ट मेल।",
        "cost_breakdown_title": "लागत विवरण (अनुमानित)",
        "cost_total": "कुल योग:",
        "interactive_map_title": "इंटरैक्टिव नक्शा",

        // Safety View
        "safety_banner_title": "🛡️ TRAVELX सुरक्षा विश्लेषण",
        "safety_banner_sub": "आपकी यात्रा के लिए AI-संचालित सुरक्षा और समय पूर्वानुमान",
        "btn_back_to_itinerary": "← यात्रा कार्यक्रम पर लौटें",
        "label_opt_pref": "अनुकूलन प्राथमिकता:",
        "opt_safety_first": "🛡️ सुरक्षा पहले",
        "opt_balanced": "⚖️ संतुलित",
        "opt_experience_first": "🎒 अनुभव पहले",
        "btn_refresh_analysis": "↻ विश्लेषण ताज़ा करें",
        "btn_optimize_trip": "✨ मेरी यात्रा अनुकूलित करें",
        "card_overall_safety": "समग्र सुरक्षा स्कोर",
        "card_weather_safety": "🌦️ मौसम सुरक्षा",
        "card_crowd_density": "👥 भीड़ घनत्व विश्लेषण",
        "card_safety_alerts": "🚨 सुरक्षा चेतावनी",
        "card_optimization": "🔄 सुरक्षा-आधारित यात्रा अनुकूलन",
        "card_reasoning": "🧠 TRAVELX ने यह सुझाव क्यों दिया",
        "card_safe_route": "🛡️ सुरक्षित मार्ग सिफारिश",
        "card_risk_radar": "🚨 यात्रा जोखिम रडार",
        "card_trip_readiness": "🎒 यात्रा तैयारी",
        "card_safety_summary": "🛡️ यात्रा सुरक्षा सारांश",
        "card_emergency_center": "🚨 आपातकालीन सुरक्षा केंद्र",
        "emergency_police": "🚓 पुलिस / आपातकाल",
        "emergency_hospital": "🚑 नजदीकी अस्पताल",
        "emergency_share": "📍 स्थान साझा करें",
        "btn_share_wa": "व्हाट्सएप द्वारा भेजें",

        // IoT Monitor View
        "mon_live_grid": "लाइव सेंसर ग्रिड",
        "mon_future_scope": "भविष्य की योजना पूर्वावलोकन",
        "mon_main_title": "📡 स्मार्ट गंतव्य मॉनिटरिंग और IoT टेलीमेट्री",
        "mon_main_sub": "वास्तविक समय गंतव्य क्षमता, जल स्तर निगरानी, और IoT सेंसर नेटवर्क।",
        "mon_label_city": "निगरानी गंतव्य:",
        "mon_grid_operational": "ग्रिड स्थिति: 100% कार्यरत",
        "mon_infra_tag": "1. गंतव्य बुनियादी ढांचा",
        "mon_hotels_monitored": "होटल मॉनिटर किए गए",
        "mon_attractions_tracked": "पर्यटन स्थल ट्रैक किए गए",
        "mon_travel_operators": "ट्रैवल ऑपरेटर्स",
        "mon_tourist_zones": "पर्यटक क्षेत्र",
        "mon_time_sim_title": "⏱️ समय-आधारित टेलीमेट्री सिमुलेशन:",
        "mon_time_sim_sub": "दिन भर में पर्यावरणीय और भीड़ के बदलाव का अनुकरण करें",
        "btn_broadcast_warn": "📢 सभी ऑपरेटरों को अलर्ट भेजें",
        "btn_reroute_tourists": "🗺️ वैकल्पिक पर्यटन स्थल सुझाएं",

        // City Explorer
        "ce_default_title": "एक शहर चुनें",
        "ce_default_desc": "यात्रा प्लान करने से पहले शहर को जानें।",
        "ce_placeholder": "किसी भी शहर को खोजें (उदा. मुंबई, टोक्यो, दिल्ली)...",
        "ce_places_title": "📌 प्रमुख आकर्षण",
        "ce_filter_all": "सभी",
        "ce_filter_attractions": "आकर्षण",
        "ce_filter_culture": "संस्कृति",
        "ce_filter_food": "खान-पान",
        "ce_filter_nature": "प्रकृति",
        "ce_add_to_trip": "ट्रिप में जोड़ें",
        "ce_locals_recommend": "🗣️ स्थानीय लोगों की सिफारिशें",
        "ce_share_tip_title": "अपनी स्थानीय सलाह साझा करें",
        "btn_submit_rec": "सलाह सबमिट करें",

        // Wanderguide
        "wg_back_planner": "← ट्रिप प्लानर पर वापस जाएं",
        "wg_popular_guides": "लोकप्रिय गाइड्स:",
        "wg_hero_sub": "प्रसिद्ध फूड समीक्षकों और भोजन प्रेमियों द्वारा चुनी गई सर्वोत्तम जगहें।",
        "wg_search_placeholder": "गंतव्य खोजें (उदा. ग्रेटर नोएडा, मुंबई, पेरिस)...",
        "wg_btn_search": "शहर खोजें",
        "wg_filter_all": "🍽️ सभी स्थान",
        "wg_filter_restaurants": "🥘 बेहतरीन रेस्टोरेंट",
        "wg_filter_cafes": "🍰 कैफ़े और बेकरी",
        "wg_filter_finedining": "🍝 इटैलियन और फाइन डाइनिंग",
        "wg_filter_dhaba": "🍛 स्थानीय भोजन और ढाबे",
        "wg_filter_bars": "🍸 बार और लाउंज",
        "wg_filter_hotels": "🏨 होटल और स्टे",
        "wg_filter_sightseeing": "🏛️ दर्शनीय स्थल",
        "wg_sort_label": "क्रमबद्ध करें:",
        "wg_sort_curated": "संपादकीय रैंकिंग",
        "wg_sort_rating": "सर्वोच्च रेटिंग",
        "wg_sort_reviews": "सर्वाधिक समीक्षाएं"
    },

    mr: {
        // Marathi
        "nav_destinations": "गंतव्ये",
        "nav_experiences": "अनुभव",
        "nav_explorer": "शहर अन्वेषक",
        "nav_planner": "ट्रिप प्लॅनर",
        "nav_safety": "सुरक्षा विश्लेषण",
        "nav_monitoring_full": "IoT गंतव्य मॉनिटर",
        "nav_monitoring_short": "IoT मॉनिटर",
        "nav_wanderguide": "कुठे खावे आणि फिरावे",
        "nav_contact": "संपर्क",
        "nav_find_dream": "माझे स्वप्न शोधा",
        "nav_back_home": "मुख्यपृष्ठावर परत या",
        "tab_indian_langs": "🇮🇳 भारतीय भाषा",
        "tab_foreign_langs": "🌍 परदेशी भाषा",

        // Hero Index
        "hero_title": "तयार करा आपली परिपूर्ण",
        "hero_title_em": "सुट्टी",
        "hero_subtitle": "जगातील सर्वात सुंदर ठिकाणांसाठी खास तयार केलेले प्रवास नियोजन आणि उत्कृष्ट अनुभव मिळवा.",
        "hero_cta": "प्लॅनिंग सुरू करा",

        // Wizard
        "wizard_title": "आपला प्रवास कार्यक्रम डिझाइन करा",
        "step_1_title": "कुठे आणि कधी",
        "step_2_title": "कोण आणि कसे",
        "step_3_title": "आवड आणि प्राधान्ये",
        "step_4_title": "बजेट आणि तपशील",
        "step_5_title": "प्रवासाचे पुनरावलोकन",

        "label_destination": "गंतव्य स्थान",
        "placeholder_destination": "उदा. पुणे, मुंबई, टोकियो, पॅरिस",
        "label_start_date": "सुरुवात तारीख",
        "label_end_date": "समाप्ती तारीख",
        "label_travelers": "प्रवाशांची संख्या",
        "label_travel_pace": "प्रवासाचा वेग",
        "pace_relaxed": "शांत आणि निवांत",
        "pace_relaxed_desc": "हळूवार वेग, जास्त विश्रांती",
        "pace_balanced": "संतुलित",
        "pace_balanced_desc": "फिरणे आणि विश्रांतीचा सुरेख मेळ",
        "pace_packed": "गतिमान",
        "pace_packed_desc": "जास्तीत जास्त ठिकाणे पाहणे",

        "label_select_interests": "आवडी निवडा",
        "interest_culture": "संस्कृती आणि इतिहास",
        "interest_food": "खाद्यसंस्कृती आणि जेवण",
        "interest_nature": "निसर्ग आणि पर्यटन",
        "interest_shopping": "खरेदी",
        "interest_nightlife": "नाईटलाईफ",
        "interest_adventure": "साहस आणि ट्रेकिंग",
        "interest_relaxation": "विश्रांती",
        "label_dietary_pref": "आहार प्राधान्ये",
        "placeholder_dietary_pref": "उदा. शाकाहारी, जैन (पर्यायी)",

        "label_total_budget": "एकूण बजेट",
        "placeholder_budget": "उदा. २५०००",
        "label_special_reqs": "खास आवश्यकता / पाहण्यासारखी ठिकाणे",
        "placeholder_special_reqs": "काही विशिष्ट गरजा किंवा पाहण्याची इच्छित ठिकाणे?",

        "btn_back": "मागे",
        "btn_next": "पुढील पाऊल",
        "btn_generate": "प्रवास योजना तयार करा",

        "loader_crafting": "AI आपले परिपूर्ण नियोजन तयार करत आहे...",
        "loader_analyzing": "गंतव्य डेटाचे विश्लेषण चालू आहे...",

        "copilot_title": "ट्रिप कोपायलट AI",
        "copilot_welcome": "नमस्कार! मी आपले नियोजन तयार केले आहे. काही बदल करायचे आहेत का?",
        "copilot_placeholder": "काही बदल सुचवा...",
        "copilot_send": "पाठवा",
        "dash_your_trip": "आपली सहल",
        "dash_btn_wanderguide": "🍴 कुठे खावे आणि फिरावे",
        "dash_btn_explorer": "🏙️ शहर एक्सप्लोर करा",
        "dash_btn_safety": "🛡️ सुरक्षा विश्लेषण",
        "dash_btn_monitoring": "📡 IoT गंतव्य मॉनिटर",
        "dash_btn_export": "एक्सपोर्ट",
        "dash_btn_save": "सहल सेव्ह करा",
        "score_quality_title": "ट्रिप गुणवत्ता स्कोअर",
        "score_desc": "आपल्या आवडीनुसार आणि बजेटसाठी परिपूर्ण जुळणी.",
        "cost_breakdown_title": "खर्च तपशील (अंदाजे)",
        "cost_total": "एकूण:",
        "interactive_map_title": "परस्परसंवादी नकाशा",

        "safety_banner_title": "🛡️ TRAVELX सुरक्षा विश्लेषण",
        "safety_banner_sub": "आपल्या सहलीसाठी AI-आधारित सुरक्षा आणि वेळ विश्लेषण",
        "btn_back_to_itinerary": "← सहल नियोजनावर परत जा",
        "btn_refresh_analysis": "↻ विश्लेषण रिफ्रेश करा",
        "btn_optimize_trip": "✨ सहल ऑप्टिमाइझ करा",

        "mon_live_grid": "थेट सेन्सर ग्रीड",
        "mon_future_scope": "भविष्यकालीन योजना पूर्वावलोकन",
        "mon_main_title": "📡 स्मार्ट गंतव्य मॉनिटरिंग आणि IoT टेलीमेट्री",
        "mon_main_sub": "रिअल-टाइम गंतव्य क्षमता, पर्यावरण आणि पाणी पातळी नियंत्रण.",
        "mon_label_city": "नियंत्रित गंतव्य:",
        "mon_grid_operational": "ग्रीड स्थिती: १००% कार्यरत",

        "ce_default_title": "शहर निवडा",
        "ce_default_desc": "नियोजन करण्यापूर्वी शहराची माहिती घ्या.",
        "ce_placeholder": "कोणतेही शहर शोधा...",
        "ce_places_title": "📌 महत्त्वाची ठिकाणे",
        "ce_filter_all": "सर्व",
        "ce_filter_attractions": "आकर्षणे",
        "ce_filter_culture": "संस्कृती",
        "ce_filter_food": "खाद्य",
        "ce_filter_nature": "निसर्ग",
        "ce_add_to_trip": "सहलीमध्ये जोडा",

        "wg_back_planner": "← ट्रिप प्लॅनरवर परत जा",
        "wg_popular_guides": "लोकप्रिय मार्गदर्शक:",
        "wg_hero_sub": "अन्न समीक्षक आणि खवय्यांनी निवडलेली सर्वोत्तम ठिकाणे.",
        "wg_search_placeholder": "गंतव्य शोधा (उदा. मुंबई, पुणे, पॅरिस)...",
        "wg_btn_search": "शहर शोधा",
        "wg_filter_all": "🍽️ सर्व ठिकाणे",
        "wg_filter_restaurants": "🥘 सर्वोत्तम रेस्टॉरंट्स",
        "wg_filter_cafes": "🍰 कॅफे आणि बेकरी",
        "wg_sort_label": "क्रमवारी लावा:"
    },

    gu: {
        // Gujarati
        "nav_destinations": "ગંતવ્યો",
        "nav_experiences": "અનુભવો",
        "nav_explorer": "સિટી એક્સપ્લોરર",
        "nav_planner": "ટ્રિપ પ્લાનર",
        "nav_safety": "સુરક્ષા વિશ્લેષણ",
        "nav_monitoring_full": "IoT ગંતવ્ય મોનિટર",
        "nav_monitoring_short": "IoT મોનિટર",
        "nav_wanderguide": "ક્યાં ખાવું અને ફરવું",
        "nav_contact": "સંપર્ક",
        "nav_find_dream": "મારું સ્વપ્ન શોધો",
        "nav_back_home": "મુખ્ય પૃષ્ઠ પર પાછા ફરો",
        "tab_indian_langs": "🇮🇳 ભારતીય ભાષાઓ",
        "tab_foreign_langs": "🌍 વિદેશી ભાષાઓ",

        "hero_title": "તૈયાર કરો તમારી શ્રેષ્ઠ",
        "hero_title_em": "યાત્રા",
        "hero_subtitle": "વિશ્વના અદભુત સ્થળો માટે વિશિષ્ટ મુસાફરી આયોજન અને યાદગાર અનુભવો મેળવો.",
        "hero_cta": "પ્લાનિંગ શરૂ કરો",

        "wizard_title": "તમારી મુસાફરીનું આયોજન કરો",
        "step_1_title": "ક્યાં અને ક્યારે",
        "step_2_title": "કોણ અને કેવી રીતે",
        "step_3_title": "રુચિ અને પસંદગીઓ",
        "step_4_title": "બજેટ અને વિગતો",
        "step_5_title": "સમીક્ષા કરો",

        "label_destination": "ગંતવ્ય સ્થળ",
        "placeholder_destination": "દા.ત. અમદાવાદ, મુંબઈ, ટોક્યો",
        "label_start_date": "શરૂઆતની તારીખ",
        "label_end_date": "સમાપ્તિની તારીખ",
        "label_travelers": "મુસાફરોની સંખ્યા",
        "label_travel_pace": "મુસાફરીની ગતિ",
        "pace_relaxed": "શાંતિપૂર્ણ",
        "pace_relaxed_desc": "ધીમી ગતિ, વધુ આરામ",
        "pace_balanced": "સંતુલિત",
        "pace_balanced_desc": "ફરવા અને આરામનું શ્રેષ્ઠ મિશ્રણ",
        "pace_packed": "ઝડપી",
        "pace_packed_desc": "વધુમાં વધુ સ્થળો જુઓ",

        "label_select_interests": "રુચિઓ પસંદ કરો",
        "interest_culture": "સંસ્કૃતિ અને ઇતિહાસ",
        "interest_food": "સ્વાદિષ્ટ ભોજન",
        "interest_nature": "કુદરતી સૌંદર્ય",
        "interest_shopping": "શોપિંગ",
        "interest_nightlife": "નાઇટલાઇફ",
        "interest_adventure": "સાહસિક પ્રવૃત્તિઓ",
        "interest_relaxation": "આરામ",
        "label_dietary_pref": "ખોરાકની પસંદગી",
        "placeholder_dietary_pref": "દા.ત. શાકાહારી, જૈન (વૈકલ્પિક)",

        "label_total_budget": "કુલ બજેટ",
        "placeholder_budget": "દા.ત. ૨૫૦૦૦",
        "label_special_reqs": "વિશેષ જરૂરિયાતો / જોવાલાયક સ્થળો",
        "placeholder_special_reqs": "કોઈ ખાસ જરૂરિયાત કે પસંદગીનું સ્થળ?",

        "btn_back": "પાછળ",
        "btn_next": "આગળનું પગલું",
        "btn_generate": "યાત્રા કાર્યક્રમ બનાવો",

        "loader_crafting": "AI તમારી સફર તૈયાર કરી રહ્યું છે...",
        "loader_analyzing": "ડેટાનું વિશ્લેષણ ચાલુ છે...",

        "copilot_title": "ટ્રિપ કોપાયલોટ AI",
        "copilot_welcome": "નમસ્તે! મેં તમારો પ્રવાસ તૈયાર કર્યો છે. કંઈ ફેરફાર કરવો છે?",
        "copilot_placeholder": "કંઈપણ ફેરફાર કરવા કહો...",
        "copilot_send": "મોકલો",
        "dash_your_trip": "તમારી યાત્રા",
        "dash_btn_wanderguide": "🍴 ક્યાં ખાવું અને ફરવું",
        "dash_btn_explorer": "🏙️ શહેર શોધો",
        "dash_btn_safety": "🛡️ સુરક્ષા વિશ્લેષણ",
        "dash_btn_monitoring": "📡 IoT મોનિટર",
        "dash_btn_export": "નિકાસ કરો",
        "dash_btn_save": "યાત્રા સાચવો",
        "score_quality_title": "ટ્રિપ ગુણવત્તા સ્કોર",
        "cost_breakdown_title": "ખર્ચ વિગતો (અંદાજિત)",
        "cost_total": "કુલ:",
        "interactive_map_title": "નકશો",

        "ce_default_title": "શહેર પસંદ કરો",
        "ce_default_desc": "મુસાફરી પ્લાન કરતાં પહેલાં શહેર જાણો.",
        "ce_placeholder": "શહેર શોધો...",
        "ce_places_title": "📌 મુખ્ય સ્થળો",
        "ce_filter_all": "બધા",
        "ce_filter_attractions": "આકર્ષણો",
        "ce_filter_food": "ભોજન",
        "ce_add_to_trip": "ટ્રિપમાં ઉમેરો",

        "wg_back_planner": "← ટ્રિપ પ્લાનર પર પાછા જાઓ",
        "wg_search_placeholder": "ગંતવ્ય શોધો...",
        "wg_btn_search": "શોધો",
        "wg_filter_all": "🍽️ તમામ સ્થળો"
    },

    kn: {
        // Kannada
        "nav_destinations": "ಗಮ್ಯಸ್ಥಾನಗಳು",
        "nav_experiences": "ಅನುಭವಗಳು",
        "nav_explorer": "ನಗರ ಅನ್ವೇಷಕ",
        "nav_planner": "ಟ್ರಿಪ್ ಪ್ಲಾನರ್",
        "nav_safety": "ಸುರಕ್ಷತಾ ವಿಶ್ಲೇಷಣೆ",
        "nav_monitoring_full": "IoT ಗಮ್ಯಸ್ಥಾನ ಮಾನಿಟರ್",
        "nav_monitoring_short": "IoT ಮಾನಿಟರ್",
        "nav_wanderguide": "ಎಲ್ಲಿ ತಿನ್ನಬೇಕು ಮತ್ತು ಅನ್ವೇಷಿಸಬೇಕು",
        "nav_contact": "ಸಂಪರ್ಕಿಸಿ",
        "nav_find_dream": "ನನ್ನ ಕನಸು ಹುಡುಕಿ",
        "nav_back_home": "ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ",
        "tab_indian_langs": "🇮🇳 ಭಾರತೀಯ ಭಾಷೆಗಳು",
        "tab_foreign_langs": "🌍 ವಿದೇಶಿ ಭಾಷೆಗಳು",

        "hero_title": "ನಿಮ್ಮ ಪರಿಪೂರ್ಣ ಪ್ರವಾಸ",
        "hero_title_em": "ವಿನ್ಯಾಸಗೊಳಿಸಿ",
        "hero_subtitle": "ಪ್ರಪಂಚದ ಅತ್ಯಂತ ಸುಂದರ ತಾಣಗಳಿಗಾಗಿ ವಿಶೇಷ ಪ್ರವಾಸ ಯೋಜನೆಯನ್ನು ಅನುಭವಿಸಿ.",
        "hero_cta": "ಯೋಜನೆ ಪ್ರಾರಂಭಿಸಿ",

        "wizard_title": "ನಿಮ್ಮ ಪ್ರವಾಸ ಕಾರ್ಯಕ್ರಮ ರೂಪಿಸಿ",
        "step_1_title": "ಎಲ್ಲಿ ಮತ್ತು ಯಾವಾಗ",
        "step_2_title": "ಯಾರು ಮತ್ತು ಹೇಗೆ",
        "step_3_title": "ಆಸಕ್ತಿಗಳು ಮತ್ತು ಆದ್ಯತೆಗಳು",
        "step_4_title": "ಬಜೆಟ್ ಮತ್ತು ವಿವರಗಳು",
        "step_5_title": "ಪರಿಶೀಲನೆ",

        "label_destination": "ಗಮ್ಯಸ್ಥಾನ",
        "placeholder_destination": "ಉದಾ. ಬೆಂಗಳೂರು, ಮೈಸೂರು, ಟೋಕಿಯೋ",
        "label_start_date": "ಪ್ರಾರಂಭ ದಿನಾಂಕ",
        "label_end_date": "ಅಂತಿಮ ದಿನಾಂಕ",
        "label_travelers": "ಪ್ರಯಾಣಿಕರ ಸಂಖ್ಯೆ",
        "label_travel_pace": "ಪ್ರಯಾಣದ ವೇಗ",
        "pace_relaxed": "ವಿಶ್ರಾಂತಿಯುತ",
        "pace_relaxed_desc": "ನಿಧಾನ ಗತಿ, ಹೆಚ್ಚು ವಿಶ್ರಾಂತಿ",
        "pace_balanced": "ಸಮತೋಲಿತ",
        "pace_balanced_desc": "ಸುತ್ತಾಟ ಮತ್ತು ವಿಶ್ರಾಂತಿಯ ಉತ್ತಮ ಮಿಶ್ರಣ",
        "pace_packed": "ವೇಗದ",
        "pace_packed_desc": "ಹೆಚ್ಚು ಸ್ಥಳಗಳನ್ನು ನೋಡಿ",

        "label_select_interests": "ಆಸಕ್ತಿಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ",
        "interest_culture": "ಸಂಸ್ಕೃತಿ ಮತ್ತು ಇತಿಹಾಸ",
        "interest_food": "ಆಹಾರ ಮತ್ತು ಊಟ",
        "interest_nature": "ಪ್ರಕೃತಿ ಮತ್ತು ಪರಿಸರ",
        "interest_shopping": "ಶಾಪಿಂಗ್",
        "interest_nightlife": "ನೈಟ್‌ಲೈಫ್",
        "interest_adventure": "ಸಾಹಸ",
        "interest_relaxation": "ವಿಶ್ರಾಂತಿ",
        "label_dietary_pref": "ಆಹಾರದ ಆದ್ಯತೆಗಳು",
        "placeholder_dietary_pref": "ಉದಾ. ಸಸ್ಯಾಹಾರಿ, ಜೈನ್ (ಐಚ್ಛಿಕ)",

        "label_total_budget": "ಒಟ್ಟು ಬಜೆಟ್",
        "placeholder_budget": "ಉದಾ. ೨೦೦೦೦",
        "label_special_reqs": "ವಿಶೇಷ ಅಗತ್ಯತೆಗಳು / ನೋಡಲೇಬೇಕಾದ ಸ್ಥಳಗಳು",
        "placeholder_special_reqs": "ಯಾವುದಾದರೂ ನಿರ್ದಿಷ್ಟ ಅಗತ್ಯಗಳು ಅಥವಾ ಸ್ಥಳಗಳಿವೆಯೇ?",

        "btn_back": "ಹಿಂದೆ",
        "btn_next": "ಮುಂದಿನ ಹಂತ",
        "btn_generate": "ಪ್ರವಾಸ ಕಾರ್ಯಕ್ರಮ ರಚಿಸಿ",

        "loader_crafting": "AI ನಿಮ್ಮ ಸುಂದರ ಪ್ರವಾಸವನ್ನು ರಚಿಸುತ್ತಿದೆ...",
        "loader_analyzing": "ಡೇಟಾವನ್ನು ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...",

        "copilot_title": "ಟ್ರಿಪ್ ಕೋಪೈಲಟ್ AI",
        "copilot_welcome": "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಪ್ರವಾಸವನ್ನು ಸಿದ್ಧಪಡಿಸಿದ್ದೇನೆ. ಏನಾದರೂ ಬದಲಾಯಿಸಬೇಕೇ?",
        "copilot_placeholder": "ಬದಲಾವಣೆಯನ್ನು ಕೇಳಿ...",
        "copilot_send": "ಕಳುಹಿಸಿ",
        "dash_your_trip": "ನಿಮ್ಮ ಪ್ರವಾಸ",
        "dash_btn_wanderguide": "🍴 ಎಲ್ಲಿ ತಿನ್ನಬೇಕು & ಅನ್ವೇಷಿಸಬೇಕು",
        "dash_btn_explorer": "🏙️ ನಗರ ಅನ್ವೇಷಿಸಿ",
        "dash_btn_safety": "🛡️ ಸುರಕ್ಷತಾ ವಿಶ್ಲೇಷಣೆ",
        "dash_btn_monitoring": "📡 IoT ಮಾನಿಟರ್",
        "dash_btn_export": "ರಫ್ತು ಮಾಡಿ",
        "dash_btn_save": "ಪ್ರವಾಸ ಉಳಿಸಿ",
        "score_quality_title": "ಪ್ರವಾಸ ಗುಣಮಟ್ಟ ಸ್ಕೋರ್",
        "cost_breakdown_title": "ವೆಚ್ಚ ವಿವರ (ಅಂದಾಜು)",
        "cost_total": "ಒಟ್ಟು:",
        "interactive_map_title": "ಸಂವಾದಾತ್ಮಕ ನಕ್ಷೆ",

        "ce_default_title": "ನಗರವನ್ನು ಆಯ್ಕೆಮಾಡಿ",
        "ce_default_desc": "ಯೋಜನೆ ಮಾಡುವ ಮೊದಲು ನಗರವನ್ನು ಅನ್ವೇಷಿಸಿ.",
        "ce_placeholder": "ನಗರ ಹುಡುಕಿ...",
        "ce_places_title": "📌 ಪ್ರಮುಖ ಸ್ಥಳಗಳು",
        "ce_filter_all": "ಎಲ್ಲವೂ",
        "ce_add_to_trip": "ಟ್ರಿಪ್‌ಗೆ ಸೇರಿಸಿ",

        "wg_back_planner": "← ಟ್ರಿಪ್ ಪ್ಲಾನರ್‌ಗೆ ಹಿಂತಿರುಗಿ",
        "wg_search_placeholder": "ಗಮ್ಯಸ್ಥಾನ ಹುಡುಕಿ...",
        "wg_btn_search": "ಹುಡುಕಿ",
        "wg_filter_all": "🍽️ ಎಲ್ಲಾ ಸ್ಥಳಗಳು"
    },

    ta: {
        // Tamil
        "nav_destinations": "இடங்கள்",
        "nav_experiences": "அனுபவங்கள்",
        "nav_explorer": "நகர உலா",
        "nav_planner": "பயண திட்டம்",
        "nav_safety": "பாதுகாப்பு பகுப்பாய்வு",
        "nav_monitoring_full": "IoT இலக்கு கண்காணிப்பு",
        "nav_monitoring_short": "IoT கண்காணிப்பு",
        "nav_wanderguide": "உணவு மற்றும் உலா வழிகாட்டி",
        "nav_contact": "தொடர்பு",
        "nav_find_dream": "கனவு பயணத்தை தேடுங்கள்",
        "nav_back_home": "முகப்புக்கு செல்க",
        "tab_indian_langs": "🇮🇳 இந்திய மொழிகள்",
        "tab_foreign_langs": "🌍 வெளிநாட்டு மொழிகள்",

        "hero_title": "உங்கள் சரியான விடுமுறையை",
        "hero_title_em": "வடிவமையுங்கள்",
        "hero_subtitle": "உலகின் மிக அழகான இடங்களுக்கான சிறப்பு பயணத் திட்டம் மற்றும் அனுபவங்களை பெறுங்கள்.",
        "hero_cta": "திட்டமிட தொடங்குங்கள்",

        "wizard_title": "உங்கள் பயண அட்டவணையை உருவாக்குங்கள்",
        "step_1_title": "எங்கு மற்றும் எப்போது",
        "step_2_title": "யார் மற்றும் எப்படி",
        "step_3_title": "ஆர்வங்கள் மற்றும் விருப்பங்கள்",
        "step_4_title": "பட்ஜெட் மற்றும் விவரங்கள்",
        "step_5_title": "சரிபார்க்கவும்",

        "label_destination": "சேருமிடம்",
        "placeholder_destination": "எ.கா. சென்னை, மதுரை, டோக்கியோ",
        "label_start_date": "தொடக்க தேதி",
        "label_end_date": "முடிவு தேதி",
        "label_travelers": "பயணிகள் எண்ணிக்கை",
        "label_travel_pace": "பயண வேகம்",
        "pace_relaxed": "நிதானமான",
        "pace_relaxed_desc": "மெதுவான வேகம், அதிக ஓய்வு",
        "pace_balanced": "சமநிலையான",
        "pace_balanced_desc": "சுற்றுலா மற்றும் ஓய்வின் சரியான கலவை",
        "pace_packed": "விரைவான",
        "pace_packed_desc": "அதிக இடங்களை பார்வையிட",

        "label_select_interests": "ஆர்வங்களை தேர்வுசெய்க",
        "interest_culture": "கலாச்சாரம் மற்றும் வரலாறு",
        "interest_food": "சுவையான உணவு",
        "interest_nature": "இயற்கை மற்றும் வெளிகள்",
        "interest_shopping": "ஷாப்பிங்",
        "interest_nightlife": "இரவு வாழ்க்கை",
        "interest_adventure": "சாகசம்",
        "interest_relaxation": "ஓய்வு",
        "label_dietary_pref": "உணவு விருப்பங்கள்",
        "placeholder_dietary_pref": "எ.கா. சைவ உணவு (விருப்பத்திற்குரியது)",

        "label_total_budget": "மொத்த பட்ஜெட்",
        "placeholder_budget": "எ.கா. 20000",
        "label_special_reqs": "சிறப்பு தேவைகள் / பார்க்க வேண்டிய இடங்கள்",
        "placeholder_special_reqs": "ஏதேனும் குறிப்பிட்ட தேவைகள் உள்ளதா?",

        "btn_back": "பின்செல்",
        "btn_next": "அடுத்த படி",
        "btn_generate": "பயண அட்டவணை உருவாக்கு",

        "loader_crafting": "AI உங்கள் பயணத்தை வடிவமைக்கிறது...",
        "loader_analyzing": "தரவு ஆய்வு செய்யப்படுகிறது...",

        "copilot_title": "பயண துணை AI",
        "copilot_welcome": "வணக்கம்! உங்கள் பயணத் திட்டத்தை உருவாக்கியுள்ளேன். ஏதேனும் மாற்ற வேண்டுமா?",
        "copilot_placeholder": "ஏதேனும் மாற்றம் கேட்கவும்...",
        "copilot_send": "அனுப்புக",
        "dash_your_trip": "உங்கள் பயணம்",
        "dash_btn_wanderguide": "🍴 உணவு மற்றும் உலா",
        "dash_btn_explorer": "🏙️ நகரம் அறிக",
        "dash_btn_safety": "🛡️ பாதுகாப்பு பகுப்பாய்வு",
        "dash_btn_monitoring": "📡 IoT கண்காணிப்பு",
        "dash_btn_export": "ஏற்றுமதி",
        "dash_btn_save": "பயணத்தை சேமிக்கவும்",
        "score_quality_title": "பயண தர மதிப்பீடு",
        "cost_breakdown_title": "செலவு விவரம் (மதிப்பீடு)",
        "cost_total": "மொத்தம்:",
        "interactive_map_title": "வரைபடம்",

        "ce_default_title": "நகரத்தை தேர்ந்தெடுக்கவும்",
        "ce_default_desc": "திட்டமிடுவதற்கு முன் நகரத்தை அறியுங்கள்.",
        "ce_placeholder": "நகரத்தை தேடுங்கள்...",
        "ce_places_title": "📌 முக்கிய இடங்கள்",
        "ce_filter_all": "அனைத்தும்",
        "ce_add_to_trip": "பயணத்தில் சேர்க்க",

        "wg_back_planner": "← பயண திட்டத்திற்கு திரும்புக",
        "wg_search_placeholder": "இடத்தை தேடுங்கள்...",
        "wg_btn_search": "தேடு",
        "wg_filter_all": "🍽️ அனைத்து இடங்கள்"
    },

    te: {
        // Telugu
        "nav_destinations": "గమ్యస్థానాలు",
        "nav_experiences": "అనుభవాలు",
        "nav_explorer": "నగర అన్వేషణ",
        "nav_planner": "ట్రిప్ ప్లానర్",
        "nav_safety": "భద్రతా విశ్లేషణ",
        "nav_monitoring_full": "IoT గమ్యస్థాన పర్యవేక్షణ",
        "nav_monitoring_short": "IoT పర్యవేక్షణ",
        "nav_wanderguide": "ఎక్కడ తినాలో మరియు చూడాలో",
        "nav_contact": "సంప్రదించండి",
        "nav_find_dream": "నా కలను కనుగొనండి",
        "nav_back_home": "హోమ్‌కు తిరిగి వెళ్ళండి",
        "tab_indian_langs": "🇮🇳 భారతీయ భాషలు",
        "tab_foreign_langs": "🌍 విదేశీ భాషలు",

        "hero_title": "మీ అద్భుతమైన ప్రయాణాన్ని",
        "hero_title_em": "రూపొందించుకోండి",
        "hero_subtitle": "ప్రపంచంలోని అత్యంత అందమైన ప్రదేశాల కోసం ప్రత్యేక ప్రయాణ ప్రణాళిక మరియు అనుభవాలను పొందండి.",
        "hero_cta": "ప్లానింగ్ ప్రారంభించండి",

        "wizard_title": "మీ ప్రయాణ ప్రణాళికను రూపొందించండి",
        "step_1_title": "ఎక్కడ మరియు ఎప్పుడు",
        "step_2_title": "ఎవరు మరియు ఎలా",
        "step_3_title": "ఆసక్తులు మరియు ప్రాధాన్యతలు",
        "step_4_title": "బడ్జెట్ మరియు వివరాలు",
        "step_5_title": "సమీక్షించండి",

        "label_destination": "గమ్యస్థానం",
        "placeholder_destination": "ఉదా. హైదరాబాద్, విశాఖపట్నం, టోక్యో",
        "label_start_date": "ప్రారంభ తేదీ",
        "label_end_date": "ముగింపు తేదీ",
        "label_travelers": "ప్రయాణికుల సంఖ్య",
        "label_travel_pace": "ప్రయాణ వేగం",
        "pace_relaxed": "ప్రశాంతమైన",
        "pace_relaxed_desc": "నెమ్మదిగా, ఎక్కువ విశ్రాంతితో",
        "pace_balanced": "సమతుల్యమైన",
        "pace_balanced_desc": "చూడటం మరియు విశ్రాంతి సరైన కలయిక",
        "pace_packed": "చురుకైన",
        "pace_packed_desc": "ఎక్కువ ప్రదేశాలను చూడండి",

        "label_select_interests": "ఆసక్తులను ఎంచుకోండి",
        "interest_culture": "సంస్కృతి మరియు చరిత్ర",
        "interest_food": "రుచికరమైన ఆహారం",
        "interest_nature": "ప్రకృతి",
        "interest_shopping": "షాపింగ్",
        "interest_nightlife": "నైట్‌లైఫ్",
        "interest_adventure": "సాహసం",
        "interest_relaxation": "విశ్రాంతి",
        "label_dietary_pref": "ఆహార ప్రాధాన్యతలు",
        "placeholder_dietary_pref": "ఉదా. శాఖాహారం (ఐచ్ఛికం)",

        "label_total_budget": "మొత్తం బడ్జెట్",
        "placeholder_budget": "ఉదా. 25000",
        "label_special_reqs": "ప్రత్యేక అవసరాలు / చూడవలసిన ప్రదేశాలు",
        "placeholder_special_reqs": "ఏవైనా ప్రత్యేక అవసరాలు ఉన్నాయా?",

        "btn_back": "వెనుకకు",
        "btn_next": "తదుపరి దశ",
        "btn_generate": "ప్రయాణ ప్రణాళిక తయారుచేయి",

        "loader_crafting": "AI మీ ప్రయాణాన్ని రూపొందిస్తోంది...",
        "loader_analyzing": "వివరాలను విశ్లేషిస్తోంది...",

        "copilot_title": "ట్రిప్ కోపైలట్ AI",
        "copilot_welcome": "నమస్కారం! మీ ప్రయాణ ప్రణాళిక సిద్ధమైంది. ఏదైనా మార్చాలా?",
        "copilot_placeholder": "ఏదైనా మార్పు అడగండి...",
        "copilot_send": "పంపండి",
        "dash_your_trip": "మీ ప్రయాణం",
        "dash_btn_wanderguide": "🍴 ఆహారం & అన్వేషణ",
        "dash_btn_explorer": "🏙️ నగరాన్ని చూడండి",
        "dash_btn_safety": "🛡️ భద్రతా విశ్లేషణ",
        "dash_btn_monitoring": "📡 IoT పర్యవేక్షణ",
        "dash_btn_export": "ఎగుమతి",
        "dash_btn_save": "ట్రిప్ భద్రపరచు",
        "score_quality_title": "ట్రిప్ నాణ్యత స్కోర్",
        "cost_breakdown_title": "ఖర్చుల వివరాలు (అంచనా)",
        "cost_total": "మొత్తం:",
        "interactive_map_title": "మ్యాప్",

        "ce_default_title": "నగరాన్ని ఎంచుకోండి",
        "ce_default_desc": "ప్లాన్ చేసే ముందు నగరం గురించి తెలుసుకోండి.",
        "ce_placeholder": "నగరాన్ని శోధించండి...",
        "ce_places_title": "📌 ముఖ్య ప్రదేశాలు",
        "ce_filter_all": "అన్నీ",
        "ce_add_to_trip": "ట్రిప్‌కు జోడించు",

        "wg_back_planner": "← ట్రిప్ ప్లానర్‌కు వెళ్ళండి",
        "wg_search_placeholder": "గమ్యస్థానాన్ని శోధించండి...",
        "wg_btn_search": "శోధించు",
        "wg_filter_all": "🍽️ అన్ని ప్రదేశాలు"
    },

    bn: {
        // Bengali
        "nav_destinations": "গন্তব্যস্থল",
        "nav_experiences": "অভিজ্ঞতা",
        "nav_explorer": "সিটি এক্সপ্লোরার",
        "nav_planner": "ট্রিপ প্ল্যানার",
        "nav_safety": "সুরক্ষা বিশ্লেষণ",
        "nav_monitoring_full": "IoT গন্তব্য মনিটর",
        "nav_monitoring_short": "IoT মনিটর",
        "nav_wanderguide": "কোথায় খাবেন ও ঘুরবেন",
        "nav_contact": "যোগাযোগ",
        "nav_find_dream": "স্বপ্নের ভ্রমণ খুঁজুন",
        "nav_back_home": "হোম পেজে ফিরুন",
        "tab_indian_langs": "🇮🇳 ভারতীয় ভাষাসমূহ",
        "tab_foreign_langs": "🌍 বিদেশী ভাষাসমূহ",

        "hero_title": "পরিকল্পনা করুন আপনার স্বপ্নের",
        "hero_title_em": "ছুটি",
        "hero_subtitle": "বিশ্বের সবচেয়ে মনোরম স্থানগুলির জন্য বিশেষ ভ্রমণ পরিকল্পনা এবং অবিস্মরণীয় অভিজ্ঞতা অর্জন করুন।",
        "hero_cta": "প্ল্যানিং শুরু করুন",

        "wizard_title": "আপনার ভ্রমণের রূপরেখা তৈরি করুন",
        "step_1_title": "কোথায় এবং কখন",
        "step_2_title": "কারা এবং কীভাবে",
        "step_3_title": "পছন্দ এবং অগ্রাধিকার",
        "step_4_title": "বাজেট এবং বিবরণ",
        "step_5_title": "পর্যালোচনা",

        "label_destination": "গন্তব্য",
        "placeholder_destination": "যেমন: কলকাতা, দার্জিলিং, টোকিও",
        "label_start_date": "শুরুর তারিখ",
        "label_end_date": "শেষের তারিখ",
        "label_travelers": "যাত্রীর সংখ্যা",
        "label_travel_pace": "ভ্রমণের গতি",
        "pace_relaxed": "স্বস্তিদায়ক",
        "pace_relaxed_desc": "ধীর গতি, বেশি বিশ্রাম",
        "pace_balanced": "ভারসাম্যপূর্ণ",
        "pace_balanced_desc": "ঘোরাঘুরি এবং বিশ্রামের উত্তম সমন্বয়",
        "pace_packed": "দ্রুত",
        "pace_packed_desc": "যত বেশি সম্ভব স্থান দেখুন",

        "label_select_interests": "পছন্দসমূহ নির্বাচন করুন",
        "interest_culture": "সংস্কৃতি ও ইতিহাস",
        "interest_food": "খাবার ও স্বাদ",
        "interest_nature": "প্রকৃতি ও উন্মুক্ত স্থান",
        "interest_shopping": "কেনাকাটা",
        "interest_nightlife": "নাইটলাইফ",
        "interest_adventure": "রোমাঞ্চকর",
        "interest_relaxation": "বিশ্রাম",
        "label_dietary_pref": "খাবারের পছন্দ",
        "placeholder_dietary_pref": "যেমন: নিরামিষ (ঐচ্ছিক)",

        "label_total_budget": "মোট বাজেট",
        "placeholder_budget": "যেমন: ২৫০০০",
        "label_special_reqs": "বিশেষ চাহিদা / দর্শনীয় স্থান",
        "placeholder_special_reqs": "কোনো বিশেষ চাহিদা বা পছন্দের জায়গা?",

        "btn_back": "পিছনে",
        "btn_next": "পরবর্তী পদক্ষেপ",
        "btn_generate": "ভ্রমণসূচি তৈরি করুন",

        "loader_crafting": "AI আপনার উপযুক্ত ভ্রমণসূচি তৈরি করছে...",
        "loader_analyzing": "তথ্য বিশ্লেষণ করা হচ্ছে...",

        "copilot_title": "ট্রিপ কোপাইলট AI",
        "copilot_welcome": "নমস্কার! আমি আপনার ভ্রমণসূচি তৈরি করেছি। কিছু পরিবর্তন করতে চান?",
        "copilot_placeholder": "কিছু পরিবর্তন করতে বলুন...",
        "copilot_send": "পাঠান",
        "dash_your_trip": "আপনার ভ্রমণ",
        "dash_btn_wanderguide": "🍴 কোথায় খাবেন ও ঘুরবেন",
        "dash_btn_explorer": "🏙️ শহর অন্বেষণ করুন",
        "dash_btn_safety": "🛡️ সুরক্ষা বিশ্লেষণ",
        "dash_btn_monitoring": "📡 IoT মনিটর",
        "dash_btn_export": "রপ্তানি করুন",
        "dash_btn_save": "ভ্রমণ সংরক্ষণ করুন",
        "score_quality_title": "ভ্রমণের গুণমান স্কোর",
        "cost_breakdown_title": "খরচের বিবরণ (আনুমানিক)",
        "cost_total": "মোট:",
        "interactive_map_title": "ইন্টারেক্টিভ মানচিত্র",

        "ce_default_title": "একটি শহর নির্বাচন করুন",
        "ce_default_desc": "পরিকল্পনা করার আগে শহরটি জানুন।",
        "ce_placeholder": "শহর অনুসন্ধান করুন...",
        "ce_places_title": "📌 গুরুত্বপূর্ণ স্থানসমূহ",
        "ce_filter_all": "সব",
        "ce_add_to_trip": "ট্রিপে যোগ করুন",

        "wg_back_planner": "← ট্রিপ প্ল্যানারে ফিরুন",
        "wg_search_placeholder": "গন্তব্য খুঁজুন...",
        "wg_btn_search": "অনুসন্ধান",
        "wg_filter_all": "🍽️ সকল স্থান"
    },

    fr: {
        // French
        "nav_destinations": "Destinations",
        "nav_experiences": "Expériences",
        "nav_explorer": "Explorateur de Ville",
        "nav_planner": "Planificateur de Voyage",
        "nav_safety": "Analyse de Sécurité",
        "nav_monitoring_full": "Moniteur IoT de Destination",
        "nav_monitoring_short": "Moniteur IoT",
        "nav_wanderguide": "Où Manger & Explorer",
        "nav_contact": "Contact",
        "nav_find_dream": "Trouver mon rêve",
        "nav_back_home": "Retour à l'Accueil",
        "tab_indian_langs": "🇮🇳 Langues Indiennes",
        "tab_foreign_langs": "🌍 Langues Étrangères",

        "hero_title": "Concevez Votre Échappée",
        "hero_title_em": "Parfaite",
        "hero_subtitle": "Découvrez le monde comme jamais auparavant avec des itinéraires sur mesure et un accès exclusif aux plus belles destinations.",
        "hero_cta": "Commencer à Planifier",

        "wizard_title": "Concevez Votre Itinéraire",
        "step_1_title": "Où & Quand",
        "step_2_title": "Qui & Comment",
        "step_3_title": "Intérêts & Préférences",
        "step_4_title": "Budget & Détails",
        "step_5_title": "Vérification",

        "label_destination": "Destination",
        "placeholder_destination": "ex. Paris, Tokyo, Mumbai",
        "label_start_date": "Date de Début",
        "label_end_date": "Date de Fin",
        "label_travelers": "Nombre de Voyageurs",
        "label_travel_pace": "Rythme de Voyage",
        "pace_relaxed": "Détendu",
        "pace_relaxed_desc": "Rythme calme, plus de repos",
        "pace_balanced": "Équilibré",
        "pace_balanced_desc": "Bon équilibre entre découverte et repos",
        "pace_packed": "Intense",
        "pace_packed_desc": "Voir le maximum de lieux",

        "label_select_interests": "Sélectionnez vos Intérêts",
        "interest_culture": "Culture & Histoire",
        "interest_food": "Gastronomie & Restauration",
        "interest_nature": "Nature & Plein Air",
        "interest_shopping": "Shopping",
        "interest_nightlife": "Vie Nocturne",
        "interest_adventure": "Aventure",
        "interest_relaxation": "Détente",
        "label_dietary_pref": "Préférences Alimentaires",
        "placeholder_dietary_pref": "ex. Végétarien, Halal (Optionnel)",

        "label_total_budget": "Budget Total",
        "placeholder_budget": "ex. 3000",
        "label_special_reqs": "Exigences Particulières / Lieux Incontournables",
        "placeholder_special_reqs": "Des besoins particuliers ou des lieux à ne pas manquer ?",

        "btn_back": "Retour",
        "btn_next": "Étape Suivante",
        "btn_generate": "Générer l'Itinéraire",

        "loader_crafting": "L'IA prépare votre escapade parfaite...",
        "loader_analyzing": "Analyse des données de destination...",

        "copilot_title": "Copilote de Voyage IA",
        "copilot_welcome": "Bonjour ! J'ai rédigé votre itinéraire. Souhaitez-vous modifier quelque chose ?",
        "copilot_placeholder": "Demandez-moi de modifier...",
        "copilot_send": "Envoyer",
        "dash_your_trip": "Votre Voyage",
        "dash_btn_wanderguide": "🍴 Où Manger & Explorer",
        "dash_btn_explorer": "🏙️ Explorer la Ville",
        "dash_btn_safety": "🛡️ Analyse de Sécurité",
        "dash_btn_monitoring": "📡 Moniteur IoT",
        "dash_btn_export": "Exporter",
        "dash_btn_save": "Enregistrer",
        "score_quality_title": "Score de Qualité",
        "score_desc": "Correspondance excellente avec vos critères et budget.",
        "cost_breakdown_title": "Estimation des Coûts",
        "cost_total": "Total :",
        "interactive_map_title": "Carte Interactive",

        "safety_banner_title": "🛡️ Intelligence de Sécurité TRAVELX",
        "safety_banner_sub": "Analyse de sécurité et prévisions horaires par IA",
        "btn_back_to_itinerary": "← Retour à l'Itinéraire",
        "btn_refresh_analysis": "↻ Actualiser l'Analyse",
        "btn_optimize_trip": "✨ Optimiser Mon Voyage",

        "mon_live_grid": "RÉSEAU DE CAPTEURS EN DIRECT",
        "mon_future_scope": "APERÇU DE DÉPLOIEMENT FUTUR",
        "mon_main_title": "📡 Surveillance Intelligente & Télémétrie IoT",
        "mon_main_sub": "Capacité d'accueil en temps réel et capteurs environnementaux.",
        "mon_label_city": "Destination Surveillée :",
        "mon_grid_operational": "État du Réseau : 100% Opérationnel",

        "ce_default_title": "Sélectionnez une Ville",
        "ce_default_desc": "Découvrez la ville avant de planifier.",
        "ce_placeholder": "Rechercher une ville (ex. Paris, Mumbai)...",
        "ce_places_title": "📌 Lieux Importants",
        "ce_filter_all": "Tous",
        "ce_filter_attractions": "Attractions",
        "ce_filter_culture": "Culture",
        "ce_filter_food": "Gastronomie",
        "ce_filter_nature": "Nature",
        "ce_add_to_trip": "Ajouter au Voyage",

        "wg_back_planner": "← Retour au Planificateur",
        "wg_popular_guides": "Guides Populaires :",
        "wg_hero_sub": "Les meilleurs restaurants et lieux recommandés par les critiques et gastronomes.",
        "wg_search_placeholder": "Rechercher une destination...",
        "wg_btn_search": "Rechercher",
        "wg_filter_all": "🍽️ Tous les Lieux",
        "wg_filter_restaurants": "🥘 Meilleurs Restaurants",
        "wg_filter_cafes": "🍰 Cafés & Boulangeries",
        "wg_sort_label": "Trier par :"
    },

    de: {
        // German
        "nav_destinations": "Reiseziele",
        "nav_experiences": "Erlebnisse",
        "nav_explorer": "Stadt-Entdecker",
        "nav_planner": "Reiseplaner",
        "nav_safety": "Sicherheitsanalyse",
        "nav_monitoring_full": "IoT-Zielüberwachung",
        "nav_monitoring_short": "IoT-Monitor",
        "nav_wanderguide": "Essen & Entdecken",
        "nav_contact": "Kontakt",
        "nav_find_dream": "Traumreise finden",
        "nav_back_home": "Zurück zur Startseite",
        "tab_indian_langs": "🇮🇳 Indische Sprachen",
        "tab_foreign_langs": "🌍 Fremdsprachen",

        "hero_title": "Planen Sie Ihre perfekte",
        "hero_title_em": "Auszeit",
        "hero_subtitle": "Erleben Sie die Welt wie nie zuvor mit maßgeschneiderten Reiserouten zu den atemberaubendsten Reisezielen.",
        "hero_cta": "Planung starten",

        "wizard_title": "Reiseroute gestalten",
        "step_1_title": "Wo & Wann",
        "step_2_title": "Wer & Wie",
        "step_3_title": "Interessen & Vorlieben",
        "step_4_title": "Budget & Details",
        "step_5_title": "Überprüfung",

        "label_destination": "Reiseziel",
        "placeholder_destination": "z.B. Berlin, Tokio, Mumbai",
        "label_start_date": "Startdatum",
        "label_end_date": "Enddatum",
        "label_travelers": "Anzahl der Reisenden",
        "label_travel_pace": "Reisetempo",
        "pace_relaxed": "Entspannt",
        "pace_relaxed_desc": "Ruhigeres Tempo, mehr Erholung",
        "pace_balanced": "Ausgewogen",
        "pace_balanced_desc": "Gute Mischung aus Entdecken und Ruhe",
        "pace_packed": "Erlebnisreich",
        "pace_packed_desc": "So viel wie möglich sehen",

        "label_select_interests": "Interessen auswählen",
        "interest_culture": "Kultur & Geschichte",
        "interest_food": "Kulinarik & Gastronomie",
        "interest_nature": "Natur & Outdoor",
        "interest_shopping": "Shopping",
        "interest_nightlife": "Nachtleben",
        "interest_adventure": "Abenteuer",
        "interest_relaxation": "Entspannung",
        "label_dietary_pref": "Ernährungspräferenzen",
        "placeholder_dietary_pref": "z.B. Vegetarisch, Vegan (Optional)",

        "label_total_budget": "Gesamtbudget",
        "placeholder_budget": "z.B. 3000",
        "label_special_reqs": "Besondere Wünsche / Must-Sees",
        "placeholder_special_reqs": "Gibt es besondere Anforderungen oder Orte, die Sie sehen möchten?",

        "btn_back": "Zurück",
        "btn_next": "Nächster Schritt",
        "btn_generate": "Reiseplan erstellen",

        "loader_crafting": "KI erstellt Ihre perfekte Reiseroute...",
        "loader_analyzing": "Reisedaten werden analysiert...",

        "copilot_title": "Reise-Copilot KI",
        "copilot_welcome": "Hallo! Ich habe Ihre Reiseroute erstellt. Möchten Sie etwas anpassen?",
        "copilot_placeholder": "Änderungswunsch eingeben...",
        "copilot_send": "Senden",
        "dash_your_trip": "Ihre Reise",
        "dash_btn_wanderguide": "🍴 Essen & Entdecken",
        "dash_btn_explorer": "🏙️ Stadt erkunden",
        "dash_btn_safety": "🛡️ Sicherheitsanalyse",
        "dash_btn_monitoring": "📡 IoT-Monitor",
        "dash_btn_export": "Exportieren",
        "dash_btn_save": "Reise speichern",
        "score_quality_title": "Reise-Qualitätswert",
        "score_desc": "Hervorragende Übereinstimmung mit Ihren Vorlieben und Ihrem Budget.",
        "cost_breakdown_title": "Geschätzte Kosten",
        "cost_total": "Gesamt:",
        "interactive_map_title": "Interaktive Karte",

        "safety_banner_title": "🛡️ TRAVELX Sicherheitsintelligenz",
        "safety_banner_sub": "KI-gestützte Sicherheits- und Zeitanalyse für Ihre Reise",
        "btn_back_to_itinerary": "← Zurück zum Reiseplan",
        "btn_refresh_analysis": "↻ Analyse aktualisieren",
        "btn_optimize_trip": "✨ Meine Reise optimieren",

        "mon_live_grid": "LIVE-SENSOR-NETZ",
        "mon_future_scope": "ZUKUNFTS-VORSCHAU",
        "mon_main_title": "📡 Intelligente Zielüberwachung & IoT-Telemetrie",
        "mon_main_sub": "Echtzeit-Kapazitäten und umweltbezogene Sensorik.",
        "mon_label_city": "Überwachtes Ziel:",
        "mon_grid_operational": "Netzstatus: 100% Betriebsbereit",

        "ce_default_title": "Stadt auswählen",
        "ce_default_desc": "Entdecken Sie die Stadt vor der Reiseplanung.",
        "ce_placeholder": "Stadt suchen (z.B. Berlin, Mumbai)...",
        "ce_places_title": "📌 Wichtige Orte",
        "ce_filter_all": "Alle",
        "ce_add_to_trip": "Zur Reise hinzufügen",

        "wg_back_planner": "← Zurück zum Reiseplaner",
        "wg_search_placeholder": "Reiseziel suchen...",
        "wg_btn_search": "Suchen",
        "wg_filter_all": "🍽️ Alle Orte"
    },

    es: {
        // Spanish
        "nav_destinations": "Destinos",
        "nav_experiences": "Experiencias",
        "nav_explorer": "Explorador de Ciudad",
        "nav_planner": "Planificador de Viajes",
        "nav_safety": "Análisis de Seguridad",
        "nav_monitoring_full": "Monitor IoT de Destino",
        "nav_monitoring_short": "Monitor IoT",
        "nav_wanderguide": "Dónde Comer y Explorar",
        "nav_contact": "Contacto",
        "nav_find_dream": "Encuentra mi sueño",
        "nav_back_home": "Volver al Inicio",
        "tab_indian_langs": "🇮🇳 Idiomas de la India",
        "tab_foreign_langs": "🌍 Idiomas Extranjeros",

        "hero_title": "Diseña Tu Escapada",
        "hero_title_em": "Perfecta",
        "hero_subtitle": "Experimenta el mundo como nunca antes con itinerarios personalizados y acceso exclusivo a los destinos más asombrosos del planeta.",
        "hero_cta": "Comenzar a Planificar",

        "wizard_title": "Diseña Tu Itinerario",
        "step_1_title": "Dónde y Cuándo",
        "step_2_title": "Quién y Cómo",
        "step_3_title": "Intereses y Preferencias",
        "step_4_title": "Presupuesto y Detalles",
        "step_5_title": "Revisión",

        "label_destination": "Destino",
        "placeholder_destination": "ej. Madrid, Tokio, Mumbai",
        "label_start_date": "Fecha de Inicio",
        "label_end_date": "Fecha de Fin",
        "label_travelers": "Número de Viajeros",
        "label_travel_pace": "Ritmo de Viaje",
        "pace_relaxed": "Relajado",
        "pace_relaxed_desc": "Ritmo suave, más tiempo de descanso",
        "pace_balanced": "Equilibrado",
        "pace_balanced_desc": "Buena combinación de paseo y descanso",
        "pace_packed": "Completo",
        "pace_packed_desc": "Ver la mayor cantidad de lugares posible",

        "label_select_interests": "Selecciona Intereses",
        "interest_culture": "Cultura e Historia",
        "interest_food": "Gastronomía y Comida",
        "interest_nature": "Naturaleza y Aire Libre",
        "interest_shopping": "Compras",
        "interest_nightlife": "Vida Nocturna",
        "interest_adventure": "Aventura",
        "interest_relaxation": "Relax",
        "label_dietary_pref": "Preferencias Dietéticas",
        "placeholder_dietary_pref": "ej. Vegetariano, Vegano (Opcional)",

        "label_total_budget": "Presupuesto Total",
        "placeholder_budget": "ej. 3000",
        "label_special_reqs": "Requisitos Especiales / Lugares Imprescindibles",
        "placeholder_special_reqs": "¿Algún requerimiento especial o lugar que desees visitar?",

        "btn_back": "Atrás",
        "btn_next": "Siguiente Paso",
        "btn_generate": "Generar Itinerario",

        "loader_crafting": "La IA está diseñando tu viaje perfecto...",
        "loader_analyzing": "Analizando datos del destino...",

        "copilot_title": "Copiloto de Viaje IA",
        "copilot_welcome": "¡Hola! He preparado tu itinerario. ¿Quieres cambiar algo?",
        "copilot_placeholder": "Pídeme algún cambio...",
        "copilot_send": "Enviar",
        "dash_your_trip": "Tu Viaje",
        "dash_btn_wanderguide": "🍴 Dónde Comer y Explorar",
        "dash_btn_explorer": "🏙️ Explorar Ciudad",
        "dash_btn_safety": "🛡️ Análisis de Seguridad",
        "dash_btn_monitoring": "📡 Monitor IoT",
        "dash_btn_export": "Exportar",
        "dash_btn_save": "Guardar Viaje",
        "score_quality_title": "Puntuación de Calidad",
        "score_desc": "Excelente coincidencia con tus preferencias y presupuesto.",
        "cost_breakdown_title": "Desglose de Costos (Est.)",
        "cost_total": "Total:",
        "interactive_map_title": "Mapa Interactivo",

        "ce_default_title": "Selecciona una Ciudad",
        "ce_default_desc": "Descubre la ciudad antes de planificar tu viaje.",
        "ce_placeholder": "Buscar ciudad...",
        "ce_places_title": "📌 Lugares Importantes",
        "ce_filter_all": "Todos",
        "ce_add_to_trip": "Añadir al Viaje",

        "wg_back_planner": "← Volver al Planificador",
        "wg_search_placeholder": "Buscar destino...",
        "wg_btn_search": "Buscar",
        "wg_filter_all": "🍽️ Todos los Lugares"
    },

    it: {
        // Italian
        "nav_destinations": "Destinazioni",
        "nav_experiences": "Esperienze",
        "nav_explorer": "Esploratore Città",
        "nav_planner": "Pianificatore di Viaggio",
        "nav_safety": "Analisi di Sicurezza",
        "nav_monitoring_full": "Monitoraggio IoT Destinazione",
        "nav_monitoring_short": "Monitor IoT",
        "nav_wanderguide": "Dove Mangiare ed Esplorare",
        "nav_contact": "Contatto",
        "nav_find_dream": "Trova il mio sogno",
        "nav_back_home": "Torna alla Home",
        "tab_indian_langs": "🇮🇳 Lingue Indiane",
        "tab_foreign_langs": "🌍 Lingue Straniere",

        "hero_title": "Progetta la Tua Fuga",
        "hero_title_em": "Perfetta",
        "hero_subtitle": "Vivi il mondo come mai prima con itinerari esclusivi verso le destinazioni più affascinanti.",
        "hero_cta": "Inizia a Pianificare",

        "wizard_title": "Crea il Tuo Itinerario",
        "step_1_title": "Dove & Quando",
        "step_2_title": "Chi & Come",
        "step_3_title": "Interessi & Preferenze",
        "step_4_title": "Budget & Dettagli",
        "step_5_title": "Riepilogo",

        "label_destination": "Destinazione",
        "placeholder_destination": "es. Roma, Tokyo, Mumbai",
        "label_start_date": "Data di Inizio",
        "label_end_date": "Data di Fine",
        "label_travelers": "Numero di Viaggiatori",
        "label_travel_pace": "Ritmo di Viaggio",
        "pace_relaxed": "Rilassato",
        "pace_relaxed_desc": "Ritmo tranquillo, più riposo",
        "pace_balanced": "Bilanciato",
        "pace_balanced_desc": "Ottimo equilibrio tra visite e relax",
        "pace_packed": "Intenso",
        "pace_packed_desc": "Vedere il più possibile",

        "btn_back": "Indietro",
        "btn_next": "Passo Successivo",
        "btn_generate": "Genera Itinerario",

        "loader_crafting": "L'IA sta preparando il tuo viaggio ideale...",
        "copilot_title": "Copilota di Viaggio IA",
        "dash_your_trip": "Il Tuo Viaggio",
        "ce_default_title": "Seleziona una Città",
        "wg_back_planner": "← Torna al Pianificatore",
        "wg_filter_all": "🍽️ Tutti i Luoghi"
    },

    ja: {
        // Japanese
        "nav_destinations": "目的地",
        "nav_experiences": "体験",
        "nav_explorer": "シティエクスプローラー",
        "nav_planner": "旅行プランナー",
        "nav_safety": "安全分析",
        "nav_monitoring_full": "IoT目的地モニター",
        "nav_monitoring_short": "IoTモニター",
        "nav_wanderguide": "グルメ＆観光ガイド",
        "nav_contact": "お問い合わせ",
        "nav_find_dream": "理想の旅を探す",
        "nav_back_home": "ホームに戻る",
        "tab_indian_langs": "🇮🇳 インドの言語",
        "tab_foreign_langs": "🌍 外国語",

        "hero_title": "最高の旅を",
        "hero_title_em": "デザインする",
        "hero_subtitle": "厳選された旅程と特別なアクセスで、世界で最も息をのむような美しい目的地を体験しましょう。",
        "hero_cta": "計画を始める",

        "wizard_title": "旅程をデザインする",
        "step_1_title": "場所と日程",
        "step_2_title": "人数とペース",
        "step_3_title": "興味と好み",
        "step_4_title": "予算と詳細",
        "step_5_title": "確認",

        "label_destination": "目的地",
        "placeholder_destination": "例：東京、京都、パリ、ムンバイ",
        "label_start_date": "出発日",
        "label_end_date": "帰国日",
        "label_travelers": "旅行人数",
        "label_travel_pace": "旅行ペース",
        "pace_relaxed": "ゆったり",
        "pace_relaxed_desc": "のんびり、休息多め",
        "pace_balanced": "バランス良く",
        "pace_balanced_desc": "観光と休息のベストバランス",
        "pace_packed": "充実アクティブ",
        "pace_packed_desc": "できるだけ多くの場所を巡る",

        "label_select_interests": "興味を選択",
        "interest_culture": "文化・歴史",
        "interest_food": "グルメ・食事",
        "interest_nature": "自然・アウトドア",
        "interest_shopping": "ショッピング",
        "interest_nightlife": "ナイトライフ",
        "interest_adventure": "アドベンチャー",
        "interest_relaxation": "リラクゼーション",

        "btn_back": "戻る",
        "btn_next": "次へ",
        "btn_generate": "旅程を作成する",

        "loader_crafting": "AIが最高の旅行プランを作成中...",
        "copilot_title": "旅行コパイロットAI",
        "dash_your_trip": "あなたの旅行",
        "ce_default_title": "都市を選択",
        "wg_back_planner": "← 旅行プランナーに戻る",
        "wg_filter_all": "🍽️ すべてのスポット"
    }
};

class I18nEngine {
    constructor() {
        const stored = localStorage.getItem('travelbuddy_lang');
        // Default strictly to English ('en') if not explicitly set
        this.currentLang = (stored && I18N_LANGUAGES[stored]) ? stored : 'en';
    }

    init() {
        this.renderLanguageSwitcher();
        this.applyTranslations(this.currentLang);
        this.attachGlobalListeners();
    }

    t(key, fallback = null) {
        if (!key) return '';
        const langData = I18N_TRANSLATIONS[this.currentLang];
        if (langData && langData[key] !== undefined) {
            return langData[key];
        }
        const enData = I18N_TRANSLATIONS['en'];
        if (enData && enData[key] !== undefined) {
            return enData[key];
        }
        return fallback;
    }

    setLanguage(langCode) {
        if (!I18N_LANGUAGES[langCode]) return;
        this.currentLang = langCode;
        localStorage.setItem('travelbuddy_lang', langCode);
        
        // Update switcher UI
        this.updateSwitcherUI();
        
        // Apply DOM translations
        this.applyTranslations(langCode);

        // Dispatch custom event for dynamic components
        window.dispatchEvent(new CustomEvent('travelbuddy:langchange', {
            detail: { lang: langCode, meta: I18N_LANGUAGES[langCode] }
        }));
    }

    applyTranslations(langCode) {
        document.documentElement.lang = langCode;

        // 1. data-i18n (textContent)
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);
            if (translation !== null && translation !== undefined) {
                el.textContent = translation;
            }
        });

        // 2. data-i18n-html (innerHTML)
        document.querySelectorAll('[data-i18n-html]').forEach(el => {
            const key = el.getAttribute('data-i18n-html');
            const translation = this.t(key);
            if (translation !== null && translation !== undefined) {
                el.innerHTML = translation;
            }
        });

        // 3. data-i18n-placeholder (placeholder)
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const translation = this.t(key);
            if (translation !== null && translation !== undefined) {
                el.placeholder = translation;
            }
        });

        // 4. data-i18n-title (title)
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const translation = this.t(key);
            if (translation !== null && translation !== undefined) {
                el.title = translation;
            }
        });
    }

    renderLanguageSwitcher() {
        // Find language container if already in DOM, or inject into .nav-right
        let container = document.getElementById('lang-selector-container');
        if (!container) {
            const navRight = document.querySelector('.nav-right');
            if (navRight) {
                container = document.createElement('div');
                container.id = 'lang-selector-container';
                container.className = 'lang-selector-container';
                navRight.insertBefore(container, navRight.firstChild);
            } else {
                return;
            }
        }

        const currentLangMeta = I18N_LANGUAGES[this.currentLang] || I18N_LANGUAGES['en'];
        const isCurrentIndian = currentLangMeta.region === 'indian';

        container.innerHTML = `
            <button class="lang-dropdown-btn" id="lang-menu-btn" aria-expanded="false" aria-label="Choose Language" title="Change Language / भाषा बदलें">
                <span class="lang-globe-icon">🌐</span>
                <span class="lang-current-label" id="current-lang-label">
                    <span class="lang-flag">${currentLangMeta.flag}</span>
                    <span class="lang-text">${currentLangMeta.native}</span>
                </span>
                <span class="lang-arrow">▾</span>
            </button>
            <div class="lang-dropdown-menu hidden" id="lang-dropdown-menu">
                <div class="lang-menu-header">
                    <span class="lang-menu-title">Select Language / भाषा चुनें</span>
                </div>
                <div class="lang-tabs-header">
                    <button class="lang-tab-btn ${!isCurrentIndian ? 'active' : ''}" data-tab="foreign" id="tab-btn-foreign">
                        🌍 Global / English
                    </button>
                    <button class="lang-tab-btn ${isCurrentIndian ? 'active' : ''}" data-tab="indian" id="tab-btn-indian">
                        🇮🇳 Indian Languages
                    </button>
                </div>
                
                <!-- Foreign Languages List -->
                <div class="lang-tab-content ${!isCurrentIndian ? 'active' : ''}" id="tab-content-foreign">
                    <div class="lang-grid">
                        ${this.generateLanguageOptions('foreign')}
                    </div>
                </div>

                <!-- Indian Languages List -->
                <div class="lang-tab-content ${isCurrentIndian ? 'active' : ''}" id="tab-content-indian">
                    <div class="lang-grid">
                        ${this.generateLanguageOptions('indian')}
                    </div>
                </div>
            </div>
        `;

        this.bindSwitcherEvents(container);
    }

    generateLanguageOptions(region) {
        return Object.entries(I18N_LANGUAGES)
            .filter(([_, meta]) => meta.region === region)
            .map(([code, meta]) => {
                const isActive = code === this.currentLang;
                return `
                    <button class="lang-option-btn ${isActive ? 'active' : ''}" data-lang="${code}">
                        <span class="lang-flag">${meta.flag}</span>
                        <div class="lang-name-col">
                            <span class="lang-native-name">${meta.native}</span>
                            <span class="lang-english-name">${meta.name}</span>
                        </div>
                        ${isActive ? '<span class="lang-check">✓</span>' : ''}
                    </button>
                `;
            }).join('');
    }

    bindSwitcherEvents(container) {
        const btn = container.querySelector('#lang-menu-btn');
        const menu = container.querySelector('#lang-dropdown-menu');
        const tabIndian = container.querySelector('#tab-btn-indian');
        const tabForeign = container.querySelector('#tab-btn-foreign');
        const contentIndian = container.querySelector('#tab-content-indian');
        const contentForeign = container.querySelector('#tab-content-foreign');

        if (!btn || !menu) return;

        // Toggle menu
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = btn.getAttribute('aria-expanded') === 'true';
            btn.setAttribute('aria-expanded', !isExpanded);
            menu.classList.toggle('hidden');
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                btn.setAttribute('aria-expanded', 'false');
                menu.classList.add('hidden');
            }
        });

        // Switch Tabs
        tabIndian?.addEventListener('click', (e) => {
            e.stopPropagation();
            tabIndian.classList.add('active');
            tabForeign?.classList.remove('active');
            contentIndian?.classList.add('active');
            contentForeign?.classList.remove('active');
        });

        tabForeign?.addEventListener('click', (e) => {
            e.stopPropagation();
            tabForeign.classList.add('active');
            tabIndian?.classList.remove('active');
            contentForeign?.classList.add('active');
            contentIndian?.classList.remove('active');
        });

        // Select language option
        menu.addEventListener('click', (e) => {
            const optionBtn = e.target.closest('.lang-option-btn');
            if (optionBtn) {
                const lang = optionBtn.getAttribute('data-lang');
                this.setLanguage(lang);
                btn.setAttribute('aria-expanded', 'false');
                menu.classList.add('hidden');
            }
        });
    }

    updateSwitcherUI() {
        const currentLangMeta = I18N_LANGUAGES[this.currentLang] || I18N_LANGUAGES['en'];
        const labelEl = document.getElementById('current-lang-label');
        if (labelEl) {
            labelEl.innerHTML = `
                <span class="lang-flag">${currentLangMeta.flag}</span>
                <span class="lang-text">${currentLangMeta.native}</span>
            `;
        }

        // Update tabs according to current selected language region
        const isCurrentIndian = currentLangMeta.region === 'indian';
        const tabIndian = document.getElementById('tab-btn-indian');
        const tabForeign = document.getElementById('tab-btn-foreign');
        const contentIndian = document.getElementById('tab-content-indian');
        const contentForeign = document.getElementById('tab-content-foreign');

        if (tabIndian && tabForeign && contentIndian && contentForeign) {
            tabIndian.classList.toggle('active', isCurrentIndian);
            tabForeign.classList.toggle('active', !isCurrentIndian);
            contentIndian.classList.toggle('active', isCurrentIndian);
            contentForeign.classList.toggle('active', !isCurrentIndian);
        }

        // Update active classes on option buttons
        document.querySelectorAll('.lang-option-btn').forEach(btn => {
            const code = btn.getAttribute('data-lang');
            const isActive = code === this.currentLang;
            btn.classList.toggle('active', isActive);
            
            // Toggle checkmark
            let check = btn.querySelector('.lang-check');
            if (isActive && !check) {
                const span = document.createElement('span');
                span.className = 'lang-check';
                span.textContent = '✓';
                btn.appendChild(span);
            } else if (!isActive && check) {
                check.remove();
            }
        });
    }

    attachGlobalListeners() {
        // Expose global methods
        window.t = (key, fallback) => this.t(key, fallback);
        window.setLanguage = (langCode) => this.setLanguage(langCode);
        window.getCurrentLanguage = () => this.currentLang;
    }
}

// Global instance initialization
window.travelBuddyI18n = new I18nEngine();

document.addEventListener('DOMContentLoaded', () => {
    window.travelBuddyI18n.init();
});
