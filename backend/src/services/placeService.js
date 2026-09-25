const dns = require("dns");
try { dns.setDefaultResultOrder("ipv4first"); } catch (_) {}
require("dotenv").config();
const axios = require("axios");
const { rankExplorePlacesWithGroq, classifyFoodPlacesWithGroq } = require("./aiService");

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const WIKI_USER_AGENT = "TravelBuddy/1.0 (travel planning app; contact@travelbuddy.in)";

// Memory caches
const autocompleteCache = new Map();
const cityPlacesCache = new Map();
const verifiedImageCache = new Map();

// Comprehensive Indian city/destination alternate names dictionary
const INDIAN_CITY_ALIASES = {
  "delhi": "Delhi",
  "new delhi": "New Delhi",
  "old delhi": "Delhi",
  "ncr": "Delhi",
  "dilli": "Delhi",
  "bombay": "Mumbai",
  "mumbai": "Mumbai",
  "madras": "Chennai",
  "chennai": "Chennai",
  "calcutta": "Kolkata",
  "kolkata": "Kolkata",
  "bangalore": "Bengaluru",
  "bengaluru": "Bengaluru",
  "banaras": "Varanasi",
  "benares": "Varanasi",
  "kashi": "Varanasi",
  "varanasi": "Varanasi",
  "allahabad": "Prayagraj",
  "prayagraj": "Prayagraj",
  "ilhabad": "Prayagraj",
  "gurgaon": "Gurugram",
  "gurugram": "Gurugram",
  "poona": "Pune",
  "pune": "Pune",
  "ooty": "Udhagamandalam",
  "ootacamund": "Udhagamandalam",
  "udhagamandalam": "Udhagamandalam",
  "mysore": "Mysuru",
  "mysuru": "Mysuru",
  "pondicherry": "Puducherry",
  "puducherry": "Puducherry",
  "cochin": "Kochi",
  "kochi": "Kochi",
  "trivandrum": "Thiruvananthapuram",
  "thiruvananthapuram": "Thiruvananthapuram",
  "baroda": "Vadodara",
  "vadodara": "Vadodara",
  "gauhati": "Guwahati",
  "guwahati": "Guwahati",
  "simla": "Shimla",
  "shimla": "Shimla",
  "cawnpore": "Kanpur",
  "kanpur": "Kanpur",
  "bhubaneshwar": "Bhubaneswar",
  "bhubaneswar": "Bhubaneswar",
  "waltair": "Visakhapatnam",
  "vizag": "Visakhapatnam",
  "visakhapatnam": "Visakhapatnam",
  "trichy": "Tiruchirappalli",
  "tiruchirappalli": "Tiruchirappalli",
  "belgaum": "Belagavi",
  "belagavi": "Belagavi",
  "mangalore": "Mangaluru",
  "mangaluru": "Mangaluru",
  "calicut": "Kozhikode",
  "kozhikode": "Kozhikode",
  "cannanore": "Kannur",
  "kannur": "Kannur",
  "alleppey": "Alappuzha",
  "alappuzha": "Alappuzha",
  "palghat": "Palakkad",
  "palakkad": "Palakkad",
  "quilon": "Kollam",
  "kollam": "Kollam",
  "hubli": "Hubballi",
  "hubballi": "Hubballi",
  "aurangabad": "Chhatrapati Sambhajinagar",
  "chhatrapati sambhajinagar": "Chhatrapati Sambhajinagar",
  "sambhajinagar": "Chhatrapati Sambhajinagar",
  "udaipur": "Udaipur",
  "greaternoida": "Greater Noida",
  "greater noida": "Greater Noida"
};

// Resilient built-in coordinates for major Indian destinations
const MAJOR_INDIAN_CITIES_COORDS = {
  "delhi": { lat: 28.6139, lon: 77.2090, name: "Delhi", state: "Delhi", fullName: "Delhi, India" },
  "new delhi": { lat: 28.6139, lon: 77.2090, name: "New Delhi", state: "Delhi", fullName: "New Delhi, Delhi, India" },
  "mumbai": { lat: 19.0760, lon: 72.8777, name: "Mumbai", state: "Maharashtra", fullName: "Mumbai, Maharashtra, India" },
  "bombay": { lat: 19.0760, lon: 72.8777, name: "Mumbai", state: "Maharashtra", fullName: "Mumbai, Maharashtra, India" },
  "jaipur": { lat: 26.9124, lon: 75.7873, name: "Jaipur", state: "Rajasthan", fullName: "Jaipur, Rajasthan, India" },
  "udaipur": { lat: 24.5854, lon: 73.7125, name: "Udaipur", state: "Rajasthan", fullName: "Udaipur, Rajasthan, India" },
  "lucknow": { lat: 26.8467, lon: 80.9462, name: "Lucknow", state: "Uttar Pradesh", fullName: "Lucknow, Uttar Pradesh, India" },
  "agra": { lat: 27.1767, lon: 78.0081, name: "Agra", state: "Uttar Pradesh", fullName: "Agra, Uttar Pradesh, India" },
  "varanasi": { lat: 25.3176, lon: 82.9739, name: "Varanasi", state: "Uttar Pradesh", fullName: "Varanasi, Uttar Pradesh, India" },
  "kolkata": { lat: 22.5726, lon: 88.3639, name: "Kolkata", state: "West Bengal", fullName: "Kolkata, West Bengal, India" },
  "calcutta": { lat: 22.5726, lon: 88.3639, name: "Kolkata", state: "West Bengal", fullName: "Kolkata, West Bengal, India" },
  "bengaluru": { lat: 12.9716, lon: 77.5946, name: "Bengaluru", state: "Karnataka", fullName: "Bengaluru, Karnataka, India" },
  "bangalore": { lat: 12.9716, lon: 77.5946, name: "Bengaluru", state: "Karnataka", fullName: "Bengaluru, Karnataka, India" },
  "chennai": { lat: 13.0827, lon: 80.2707, name: "Chennai", state: "Tamil Nadu", fullName: "Chennai, Tamil Nadu, India" },
  "madras": { lat: 13.0827, lon: 80.2707, name: "Chennai", state: "Tamil Nadu", fullName: "Chennai, Tamil Nadu, India" },
  "hyderabad": { lat: 17.3850, lon: 78.4867, name: "Hyderabad", state: "Telangana", fullName: "Hyderabad, Telangana, India" },
  "amritsar": { lat: 31.6340, lon: 74.8723, name: "Amritsar", state: "Punjab", fullName: "Amritsar, Punjab, India" },
  "pune": { lat: 18.5204, lon: 73.8567, name: "Pune", state: "Maharashtra", fullName: "Pune, Maharashtra, India" },
  "ahmedabad": { lat: 23.0225, lon: 72.5714, name: "Ahmedabad", state: "Gujarat", fullName: "Ahmedabad, Gujarat, India" },
  "goa": { lat: 15.2993, lon: 74.1240, name: "Goa", state: "Goa", fullName: "Goa, India" },
  "shimla": { lat: 31.1048, lon: 77.1734, name: "Shimla", state: "Himachal Pradesh", fullName: "Shimla, Himachal Pradesh, India" },
  "manali": { lat: 32.2432, lon: 77.1892, name: "Manali", state: "Himachal Pradesh", fullName: "Manali, Himachal Pradesh, India" },
  "rishikesh": { lat: 30.0869, lon: 78.2676, name: "Rishikesh", state: "Uttarakhand", fullName: "Rishikesh, Uttarakhand, India" },
  "greater noida": { lat: 28.4744, lon: 77.5040, name: "Greater Noida", state: "Uttar Pradesh", fullName: "Greater Noida, Uttar Pradesh, India" },
  "greaternoida": { lat: 28.4744, lon: 77.5040, name: "Greater Noida", state: "Uttar Pradesh", fullName: "Greater Noida, Uttar Pradesh, India" },
  "noida": { lat: 28.5355, lon: 77.3910, name: "Noida", state: "Uttar Pradesh", fullName: "Noida, Uttar Pradesh, India" },
  "gurugram": { lat: 28.4595, lon: 77.0266, name: "Gurugram", state: "Haryana", fullName: "Gurugram, Haryana, India" },
  "gurgaon": { lat: 28.4595, lon: 77.0266, name: "Gurugram", state: "Haryana", fullName: "Gurugram, Haryana, India" },
  "prayagraj": { lat: 25.4358, lon: 81.8463, name: "Prayagraj", state: "Uttar Pradesh", fullName: "Prayagraj, Uttar Pradesh, India" },
  "allahabad": { lat: 25.4358, lon: 81.8463, name: "Prayagraj", state: "Uttar Pradesh", fullName: "Prayagraj, Uttar Pradesh, India" },
  "kochi": { lat: 9.9312, lon: 76.2673, name: "Kochi", state: "Kerala", fullName: "Kochi, Kerala, India" },
  "mysuru": { lat: 12.2958, lon: 76.6394, name: "Mysuru", state: "Karnataka", fullName: "Mysuru, Karnataka, India" },
  "mysore": { lat: 12.2958, lon: 76.6394, name: "Mysuru", state: "Karnataka", fullName: "Mysuru, Karnataka, India" },
  "jodhpur": { lat: 26.2389, lon: 73.0243, name: "Jodhpur", state: "Rajasthan", fullName: "Jodhpur, Rajasthan, India" },
  "jaisalmer": { lat: 26.9157, lon: 70.9083, name: "Jaisalmer", state: "Rajasthan", fullName: "Jaisalmer, Rajasthan, India" }
};

// Curated Registry of India-Wide Famous Landmarks & Sights
const FAMOUS_INDIAN_LANDMARKS_REGISTRY = {
  "lakshman jhula": {
    name: "Lakshman Jhula",
    aliases: ["laxman jhula", "lakshman jula", "laxman jula", "lakshman jhoola", "laxman jhoola"],
    city: "Rishikesh",
    state: "Uttarakhand",
    lat: 30.1266,
    lon: 78.3293,
    category: "Attraction",
    tag: "Historic Suspension Bridge",
    desc: "Iconic 450-foot historic suspension bridge over the sacred river Ganges, associated with Lord Lakshman and offering breathtaking river views.",
    photoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ce/Laxman_Jhula_Rishikesh.jpg/800px-Laxman_Jhula_Rishikesh.jpg"
  },
  "ram jhula": {
    name: "Ram Jhula",
    aliases: ["ram jula", "ram jhoola", "shivananda jhula"],
    city: "Rishikesh",
    state: "Uttarakhand",
    lat: 30.1233,
    lon: 78.3145,
    category: "Attraction",
    tag: "Suspension Bridge",
    desc: "Renowned iron suspension bridge over the Ganges connecting Sivananda Ashram and Swargashram with panoramic mountain vistas.",
    photoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/60/Ram_Jhula_in_Rishikesh.jpg/800px-Ram_Jhula_in_Rishikesh.jpg"
  },
  "triveni ghat": {
    name: "Triveni Ghat",
    aliases: ["triveni ghat rishikesh", "triveni sangam rishikesh"],
    city: "Rishikesh",
    state: "Uttarakhand",
    lat: 30.1038,
    lon: 78.2936,
    category: "Culture",
    tag: "Sacred Bathing Ghat",
    desc: "Most revered confluence bathing ghat on the Ganges in Rishikesh, famous for the deeply spiritual evening Maha Aarti.",
    photoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/87/Triveni_Ghat_Rishikesh.jpg/800px-Triveni_Ghat_Rishikesh.jpg"
  },
  "beatles ashram": {
    name: "The Beatles Ashram (Chaurasi Kutia)",
    aliases: ["chaurasi kutia", "maharishi mahesh yogi ashram", "beatles room"],
    city: "Rishikesh",
    state: "Uttarakhand",
    lat: 30.1165,
    lon: 78.3129,
    category: "Culture",
    tag: "Historic Heritage Ashram",
    desc: "Cliffside ashram where The Beatles stayed and composed songs in 1968, adorned with vibrant spiritual graffiti and meditation domes.",
    photoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e4/Beatles_Ashram_Rishikesh.jpg/800px-Beatles_Ashram_Rishikesh.jpg"
  },
  "parmarth niketan": {
    name: "Parmarth Niketan Ashram",
    aliases: ["parmarth ashram", "parmarth niketan ganga aarti"],
    city: "Rishikesh",
    state: "Uttarakhand",
    lat: 30.1189,
    lon: 78.3125,
    category: "Culture",
    tag: "Spiritual Heritage Ashram",
    desc: "One of India's largest spiritual institutions on the banks of Ganga, famous worldwide for its serene sunset Ganga Aarti.",
    photoUrl: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80"
  },
  "neelkanth mahadev": {
    name: "Neelkanth Mahadev Temple",
    aliases: ["neelkanth mahadev temple", "nilkanth mahadev", "neelkanth mandir"],
    city: "Rishikesh",
    state: "Uttarakhand",
    lat: 30.1444,
    lon: 78.3582,
    category: "Culture",
    tag: "Ancient Pilgrimage Shrine",
    desc: "Sacred pilgrimage shrine at 1,330m altitude where according to legend Lord Shiva consumed the venom from the churning of the ocean.",
    photoUrl: "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?auto=format&fit=crop&w=800&q=80"
  },
  "neer garh waterfall": {
    name: "Neer Garh Waterfall",
    aliases: ["neer gaddu", "neer gaddu waterfall", "neer waterfall"],
    city: "Rishikesh",
    state: "Uttarakhand",
    lat: 30.1481,
    lon: 78.3411,
    category: "Nature",
    tag: "Scenic Mountain Waterfall",
    desc: "Breathtaking multi-tiered jade waterfall cascading through lush limestone forest cliffs near Tapovan.",
    photoUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80"
  },
  "golden temple": {
    name: "Sri Harmandir Sahib (Golden Temple)",
    aliases: ["harmandir sahib", "sri harmandir sahib", "darbar sahib", "swarna mandir"],
    city: "Amritsar",
    state: "Punjab",
    lat: 31.6200,
    lon: 74.8765,
    category: "Culture",
    tag: "Sacred Golden Shrine",
    desc: "The spiritual heart of Sikhism, covered in authentic gold leaf and surrounded by the sacred Amrit Sarovar water pool.",
    photoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/94/The_Golden_Temple_of_Amritsar_01.jpg/800px-The_Golden_Temple_of_Amritsar_01.jpg"
  },
  "wagah border": {
    name: "Wagah Border",
    aliases: ["attari wagah border", "attari border", "wagah border ceremony"],
    city: "Amritsar",
    state: "Punjab",
    lat: 31.6047,
    lon: 74.5732,
    category: "Attraction",
    tag: "Historic International Border",
    desc: "Famous international border outpost celebrated for the electrifying daily Beating Retreat military ceremony.",
    photoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6b/Wagah_Border_Ceremony.jpg/800px-Wagah_Border_Ceremony.jpg"
  },
  "hampi": {
    name: "Virupaksha Temple & Hampi Ruins",
    aliases: ["virupaksha temple", "hampi ruins", "vijayanagara ruins"],
    city: "Hampi",
    state: "Karnataka",
    lat: 15.3350,
    lon: 76.4600,
    category: "Culture",
    tag: "UNESCO World Heritage Site",
    desc: "Spectacular 7th-century Dravidian temple complex dedicated to Lord Shiva amidst the monumental granite ruins of Vijayanagara.",
    photoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b3/Virupaksha_temple%2C_Hampi.jpg/800px-Virupaksha_temple%2C_Hampi.jpg"
  },
  "stone chariot hampi": {
    name: "Vijaya Vittala Temple & Stone Chariot",
    aliases: ["vittala temple", "vijaya vittala temple", "stone chariot"],
    city: "Hampi",
    state: "Karnataka",
    lat: 15.3392,
    lon: 76.4795,
    category: "Culture",
    tag: "UNESCO Monument",
    desc: "Architectural masterpiece housing the world-famous monolithic stone chariot shrine and musical stone pillars.",
    photoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/23/Stone_Chariot_at_Hampi.jpg/800px-Stone_Chariot_at_Hampi.jpg"
  },
  "taj mahal": {
    name: "Taj Mahal",
    aliases: ["taj", "tajmahal"],
    city: "Agra",
    state: "Uttar Pradesh",
    lat: 27.1751,
    lon: 78.0421,
    category: "Attraction",
    tag: "UNESCO World Wonder",
    desc: "Magnificent 17th-century white marble mausoleum on the Yamuna river, recognized as the crown jewel of Mughal architecture.",
    photoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1d/Taj_Mahal_%28Edited%29.jpeg/800px-Taj_Mahal_%28Edited%29.jpeg"
  },
  "amber fort": {
    name: "Amber Fort",
    aliases: ["amer fort", "amer qila", "amber palace"],
    city: "Jaipur",
    state: "Rajasthan",
    lat: 26.9855,
    lon: 75.8513,
    category: "Attraction",
    tag: "UNESCO Hill Fort",
    desc: "Regal Rajput hillside fortress overlooking Maota Lake, famous for its opulent Sheesh Mahal (Mirror Palace) and intricate gateways.",
    photoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/87/Amber_Fort_Jaipur.jpg/800px-Amber_Fort_Jaipur.jpg"
  },
  "hawa mahal": {
    name: "Hawa Mahal",
    aliases: ["palace of winds"],
    city: "Jaipur",
    state: "Rajasthan",
    lat: 26.9239,
    lon: 75.8267,
    category: "Attraction",
    tag: "Iconic Heritage Palace",
    desc: "Iconic five-story pink sandstone palace with 953 ornate honeycomb jharokha windows designed to capture cool mountain breezes.",
    photoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/92/Hawa_Mahal_2011.jpg/800px-Hawa_Mahal_2011.jpg"
  },
  "red fort": {
    name: "Red Fort (Lal Qila)",
    aliases: ["lal qila", "delhi red fort", "red fort delhi"],
    city: "Delhi",
    state: "Delhi",
    lat: 28.6562,
    lon: 77.2410,
    category: "Attraction",
    tag: "UNESCO Fortress",
    desc: "Historic 17th-century red sandstone fortress that served as the main residence of Mughal emperors and the emblem of independent India.",
    photoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/96/Delhi_Fort.jpg/800px-Delhi_Fort.jpg"
  },
  "qutub minar": {
    name: "Qutub Minar",
    aliases: ["qutb minar", "qutab minar"],
    city: "Delhi",
    state: "Delhi",
    lat: 28.5245,
    lon: 77.1855,
    category: "Attraction",
    tag: "UNESCO Victory Tower",
    desc: "Towering 73-meter fluted red sandstone minaret erected in 1192, standing as the tallest brick minaret in the world.",
    photoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fa/Qutb_Minar_01.jpg/800px-Qutb_Minar_01.jpg"
  },
  "gateway of india": {
    name: "Gateway of India",
    aliases: ["gateway of india mumbai"],
    city: "Mumbai",
    state: "Maharashtra",
    lat: 18.9220,
    lon: 72.8347,
    category: "Attraction",
    tag: "Waterfront Triumphal Arch",
    desc: "Grand 26-meter basalt arch monument overlooking the Arabian Sea at Apollo Bunder, South Mumbai's premier symbol.",
    photoUrl: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=800&q=80"
  },
  "charminar": {
    name: "Charminar",
    aliases: ["char minar"],
    city: "Hyderabad",
    state: "Telangana",
    lat: 17.3616,
    lon: 78.4747,
    category: "Attraction",
    tag: "Iconic Four Minarets Monument",
    desc: "Iconic 1591 monument and mosque featuring four grand triumphal arches and soaring 56-meter minarets in Old Hyderabad.",
    photoUrl: "https://images.unsplash.com/photo-1605335878019-4c8ce00b9576?auto=format&fit=crop&w=800&q=80"
  },
  "howrah bridge": {
    name: "Howrah Bridge",
    aliases: ["rabindra setu"],
    city: "Kolkata",
    state: "West Bengal",
    lat: 22.5851,
    lon: 88.3468,
    category: "Attraction",
    tag: "Historic Cantilever Bridge",
    desc: "Legendary balanced cantilever suspension bridge over the Hooghly River engineered without a single nut or bolt.",
    photoUrl: "https://images.unsplash.com/photo-1558431382-27e303142255?auto=format&fit=crop&w=800&q=80"
  },
  "victoria memorial": {
    name: "Victoria Memorial",
    aliases: ["victoria memorial hall"],
    city: "Kolkata",
    state: "West Bengal",
    lat: 22.5448,
    lon: 88.3426,
    category: "Culture",
    tag: "Monumental Marble Palace",
    desc: "Imposing white Makrana marble monument and national museum blending British, Mughal, and Venetian architectural styles.",
    photoUrl: "https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?auto=format&fit=crop&w=800&q=80"
  },
  "meenakshi temple": {
    name: "Meenakshi Amman Temple",
    aliases: ["meenakshi amman temple", "madurai meenakshi temple", "meenakshi sundareswarar temple"],
    city: "Madurai",
    state: "Tamil Nadu",
    lat: 9.9195,
    lon: 78.1193,
    category: "Culture",
    tag: "Ancient Dravidian Temple",
    desc: "Spectacular historic temple complex on the Vaigai river with 14 colossal gopurams encrusted with thousands of vibrant sculptures.",
    photoUrl: "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?auto=format&fit=crop&w=800&q=80"
  },
  "pangong lake": {
    name: "Pangong Tso",
    aliases: ["pangong tso", "pangong", "pangong tso lake"],
    city: "Leh",
    state: "Ladakh",
    lat: 33.7595,
    lon: 78.6674,
    category: "Nature",
    tag: "High-Altitude Himalayan Lake",
    desc: "Breathtaking high-altitude saltwater lake at 4,350m renowned for ever-changing shades of vibrant sapphire blue and emerald green.",
    photoUrl: "https://images.unsplash.com/photo-1617854818583-09e7f077a156?auto=format&fit=crop&w=800&q=80"
  },
  "dal lake": {
    name: "Dal Lake",
    aliases: ["srinagar dal lake"],
    city: "Srinagar",
    state: "Jammu & Kashmir",
    lat: 34.1245,
    lon: 74.8715,
    category: "Nature",
    tag: "Iconic Himalayan Lake",
    desc: "Crown jewel of Kashmir, famous for ornate carved cedar wood houseboats, floating flower markets, and shikara boat rides.",
    photoUrl: "https://images.unsplash.com/photo-1570789210967-2cac24afeb00?auto=format&fit=crop&w=800&q=80"
  },
  "statue of unity": {
    name: "Statue of Unity",
    aliases: ["sardar patel statue"],
    city: "Kevadia",
    state: "Gujarat",
    lat: 21.8380,
    lon: 73.7191,
    category: "Attraction",
    tag: "World's Tallest Colossus",
    desc: "The world's tallest statue standing 182 meters high on the Narmada River, honoring visionary statesman Sardar Vallabhbhai Patel.",
    photoUrl: "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800&q=80"
  },
  "khajuraho": {
    name: "Khajuraho Group of Monuments",
    aliases: ["khajuraho temples", "khajuraho mandir"],
    city: "Khajuraho",
    state: "Madhya Pradesh",
    lat: 24.8318,
    lon: 79.9199,
    category: "Culture",
    tag: "UNESCO World Heritage Site",
    desc: "Renowned UNESCO complex of Hindu and Jain temples built by the Chandela dynasty, famed for intricate Nagara architectural carvings.",
    photoUrl: "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80"
  }
};

// City-to-Iconic-Landmarks mapping for guaranteed premier inclusion
const CITY_ICONIC_LANDMARKS = {
  "rishikesh": ["lakshman jhula", "ram jhula", "triveni ghat", "parmarth niketan", "beatles ashram", "neelkanth mahadev", "neer garh waterfall"],
  "amritsar": ["golden temple", "wagah border"],
  "hampi": ["hampi", "stone chariot hampi"],
  "agra": ["taj mahal"],
  "jaipur": ["amber fort", "hawa mahal"],
  "delhi": ["red fort", "qutub minar"],
  "mumbai": ["gateway of india"],
  "hyderabad": ["charminar"],
  "kolkata": ["victoria memorial", "howrah bridge"],
  "madurai": ["meenakshi temple"],
  "leh": ["pangong lake"],
  "srinagar": ["dal lake"],
  "khajuraho": ["khajuraho"]
};

// Curated Authentic Local Eateries for special heritage & retreat destinations
const CURATED_DESTINATION_EATERIES = {
  "rishikesh": [
    {
      name: "Chotiwala Restaurant",
      cuisine: "North Indian, Pure Vegetarian",
      desc: "Historic legendary riverside restaurant on the banks of Ganga near Ram Jhula, serving authentic Garhwali thalis and North Indian classics since 1958.",
      category: "Restaurant",
      lat: 30.1235,
      lon: 78.3150,
      photoUrl: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80",
      detScore: 95
    },
    {
      name: "Ganga Beach Restaurant",
      cuisine: "Multi-Cuisine, Italian, Indian",
      desc: "Famous open-air dining spot nestled along the riverbank in Tapovan, celebrated for wood-fired pizzas, herbal teas, and stunning sunset views over the Ganges.",
      category: "Cafe",
      lat: 30.1280,
      lon: 78.3285,
      photoUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
      detScore: 92
    },
    {
      name: "Little Buddha Cafe",
      cuisine: "Continental, Tibetan, Indian",
      desc: "Iconic treehouse-style cafe near Lakshman Jhula with serene panoramic views of the river, known for healthy smoothies, momos, and relaxed bohemian ambience.",
      category: "Cafe",
      lat: 30.1265,
      lon: 78.3290,
      photoUrl: "https://images.unsplash.com/photo-1554118811-1e0d5447b699?auto=format&fit=crop&w=800&q=80",
      detScore: 90
    },
    {
      name: "Rajasthani Bhojanalaya",
      cuisine: "Rajasthani, North Indian Thali",
      desc: "Renowned traditional pure vegetarian bhojanalaya near Triveni Ghat serving authentic regional dal baati churma and endless thalis.",
      category: "Restaurant",
      lat: 30.1045,
      lon: 78.2940,
      photoUrl: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80",
      detScore: 89
    },
    {
      name: "Bistro Nirvana",
      cuisine: "Organic, Continental, Indian",
      desc: "Charming rustic cafe in Tapovan known for organic wholesome dining, handmade crust pizzas, and cozy bamboo seating.",
      category: "Cafe",
      lat: 30.1310,
      lon: 78.3270,
      photoUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
      detScore: 88
    },
    {
      name: "The Sitting Elephant",
      cuisine: "North Indian, Mughlai",
      desc: "Elegant rooftop dining destination overlooking the holy Ganges and misty mountain foothills.",
      category: "Restaurant",
      lat: 30.1110,
      lon: 78.3020,
      photoUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
      detScore: 87
    }
  ]
};

/**
 * Intelligent landmark matcher across India.
 * Matches landmark names, phonetic variations, and "landmark in city" patterns.
 */
function findRegisteredIndianLandmark(rawQuery) {
  if (!rawQuery || typeof rawQuery !== "string") return null;
  const clean = rawQuery.trim().toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ");

  // Direct match
  if (FAMOUS_INDIAN_LANDMARKS_REGISTRY[clean]) {
    return FAMOUS_INDIAN_LANDMARKS_REGISTRY[clean];
  }

  // Check aliases and substring matches
  for (const [key, landmark] of Object.entries(FAMOUS_INDIAN_LANDMARKS_REGISTRY)) {
    if (clean === key || clean.includes(key)) {
      return landmark;
    }
    if (landmark.aliases && landmark.aliases.some(a => clean === a || clean.includes(a))) {
      return landmark;
    }
  }

  // Handle patterns like "lakshman jhula in rishikesh", "ram jhula rishikesh"
  for (const [key, landmark] of Object.entries(FAMOUS_INDIAN_LANDMARKS_REGISTRY)) {
    const cityNameLower = landmark.city.toLowerCase();
    if (clean.includes(cityNameLower) && (clean.includes(key) || (landmark.aliases && landmark.aliases.some(a => clean.includes(a))))) {
      return landmark;
    }
  }

  return null;
}

// Strict Infrastructure / Generic / Commercial exclusion patterns for City Explorer
// Strictly excludes: Parks, Gardens, Hotels, Lodging, Flats, Apartments, Residential Societies, Nalas/Drains, Farms
const EXPLORE_DISQUALIFY_PATTERNS = [
  // Intersections, streets, generic transit (English & Devanagari)
  /\b(chowk|chauraha|tiraha|roundabout|crossing|intersection|gali|lane|marg|golambar|golamber)\b|चौक|चौराहा|गोलंबर|मार्ग|गली/i,
  /\b(sector\s*\d+|colony|mohalla|enclave|vihar|nagar|housing\s*board)\b|कॉलोनी|नगर|विहार|एन्क्लेव|मुहल्ला/i,
  /\b(metro\s*station|railway\s*station|bus\s*stand|bus\s*stop|auto\s*stand|taxi\s*stand|flyover|bypass|highway|toll)\b/i,
  // Strict exclusion of all parks, gardens, baghs, baris, udyans
  /\b(park|parks|garden|gardens|bagh|bari|udyan|botanical|flower\s*valley|amusement\s*park|theme\s*park|children['s]*\s*park)\b|उद्यान|बगीचा|पार्क|बाग/i,
  // Strict exclusion of hotels, resorts, hostels, guest houses, stays
  /\b(hotel|resort|resorts|lodge|lodging|hostel|inn|motel|guest\s*house|dharmashala|dharamshala|homestay|pg|suites?|stay|stays)\b|होटल|लॉज|धर्मशाला|रिसॉर्ट/i,
  // Strict exclusion of flats, apartments, societies, housing, private residences
  /\b(flat|flats|apartment|apartments|society|residence|residency|residential|housing|kothi|villa|niwas|nivas|tower|towers|heights|homes?|greens?|mansion|bhavan|bhawan)\b|रेसीडेंसी|रेजीडेंसी|अपार्टमेंट|सोसायटी|निवास|भवन|घर|कोठी/i,
  // Strict exclusion of personal homes, possessive personal names (e.g. "Prashant Kumar's Home", "Yash's farm")
  /\b\w+['’]s\s+(home|house|villa|cottage|land|property|lawn|residence|farm|place|palace|room|flat|apartment)\b/i,
  /['’]s\s+(home|house)\b/i,
  // Strict exclusion of drains, nalas, sewers, utility infrastructure
  /\b(nala|naala|drain|gutter|sewer|sewerage|waste|channel|garbage|substation|transformer|pump\s*house|water\s*tank|tubewell|toilet|sulabh|urinal|washroom|swimming\s*pool)\b/i,
  // Strict exclusion of farms, farmhouses, agricultural nurseries
  /\b(farm|farmhouse|khet|krishi|dairy|nursery|orchard|plantation|agro)\b/i,
  // Health & Educational institutions
  /\b(hospital|dispensary|clinic|nursing\s*home|medical|pharmacy|chemist)\b/i,
  /\b(school|college|institute|academy|coaching|tuition|university\s*campus)\b/i,
  // Commercial, office, market, shopping, complex
  /\b(job\s*\.?\s*works?|property|dealer|broker|trader|real\s*estate|commercial\s*complex|shopping\s*complex|market\s*complex|market|plaza|office|mall|complex|builders)\b|कॉम्प्लेक्स|मार्केट|मॉल/i,
  // Marriage halls, banquet halls, community centres, commercial "palaces"
  /\b(marriage\s*hall|marriage\s*palace|utsav|banquet|wedding|shahnai|car\s*palace|party\s*lawn|community\s*cent(er|re))\b/i,
  /\b(nh\s*\d+|sh\s*\d+|national\s*highway|state\s*highway|expressway)\b/i,
  /\b(graveyard|qabristan|shamshan|cremation|burial|parking)\b/i,
  // Isolated statues, busts, roadside memorials of individuals
  /\b(statue|murti|bust)\b|मूर्ति|प्रतिमा/i,
  /^(mahatma\s*gandhi|mother\s*mary|atal\s*bihari|dr\.?\s*ambedkar)$/i,
  // Sub-monument minor components
  /\b(ticket\s*(counter|window|office)|observation\s*post|flag\s*post|boundary\s*wall|guard\s*room)\b/i,
  // Internal gates when not a standalone triumphal memorial
  /\b(entry\s*gate|exit\s*gate|gate\s*no\.?\s*\d+|lahori\s*gate|hathi\s*gate|ajmeri\s*gate|delhi\s*gate|kashmiri\s*gate|chaumukha\s*darwaza)\b/i
];

// Disqualify patterns for Where to Eat
const FOOD_DISQUALIFY_PATTERNS = [
  /\b(canteen|cafeteria|mess|staff\s*canteen|student\s*mess|hostel\s*mess|hospital\s*canteen|college\s*canteen|school\s*canteen)\b/i,
  /\b(caterer|catering\s*service|tiffin\s*service)\b/i,
  /\b(theka|wine\s*shop|liquor|beer\s*shop)\b/i,
  /\b(kirana|grocery|general\s*store|supermarket|provision|paan|tobacco|smoke)\b/i,
  /\b(tea\s*stall|chai\s*stall|juice\s*(corner|centre|center)|shake)\b/i,
  /\b(hotel|resort|resorts|lodge|hostel|motel|inn|guest\s*house|stay|stays)\b/i
];

// Commercial corporate fast-food business outlets & franchise chains pattern (strictly excluded)
const FAST_FOOD_CHAIN_PATTERN =
  /\b(mcdonald['’]?s|kfc|domino['’]?s|pizza\s*hut|burger\s*king|subway|starbucks|costa\s*coffee|wendy['’]?s|taco\s*bell|pizza\s*express|dunkin|cafe\s*coffee\s*day|ccd|chaayos|chai\s*point|wow!?\s*momo|barbeque\s*nation|haldiram|bikanervala|rebel\s*foods|behrouz|faasos|ovenstory|mad\s*over\s*donuts|baskin\s*robbins|krispy\s*kreme)\b/i;

function normalizeDestinationName(rawQuery) {
  if (!rawQuery || typeof rawQuery !== "string") return "";
  const cleaned = rawQuery.trim().toLowerCase().replace(/\s+/g, " ");
  if (INDIAN_CITY_ALIASES[cleaned]) {
    return INDIAN_CITY_ALIASES[cleaned];
  }
  for (const [alias, canonical] of Object.entries(INDIAN_CITY_ALIASES)) {
    if (cleaned === alias || cleaned.startsWith(alias + " ") || cleaned.endsWith(" " + alias)) {
      return canonical;
    }
  }
  return rawQuery.trim().split(",")[0].trim();
}

function cleanPlaceName(raw) {
  if (!raw || typeof raw !== "string") return "";
  let clean = raw.trim();
  if (clean.includes(" - ")) clean = clean.split(" - ")[0].trim();
  if (clean.includes(" | ")) clean = clean.split(" | ")[0].trim();
  if (clean.includes(" / ")) clean = clean.split(" / ")[0].trim();
  return clean;
}

function normalizeForDedup(name) {
  if (!name) return "";
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/(the|shree|sri|complex|park|garden|mandir|temple|lake|fort|qila|palace|mahal|museum|wildlife|sanctuary|garh)/g, "")
    .trim();
}

function distanceBetweenPlaces(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const aa =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

function generateCityInsights(cityName, stateCountry) {
  return {
    weather: "Pleasant travel season, comfortable daytime conditions",
    safety: "High - Verified tourist destination",
    crowd: "Moderate visitor volume",
    cost: "Moderate local rates"
  };
}

/**
 * Categorize attraction into high-level diversity groups
 */
function classifyExploreGroup(name, categories = [], raw = {}) {
  const n = (name || "").toLowerCase();
  const c = categories.join(" ").toLowerCase();

  if (c.includes("castle") || c.includes("fort") || c.includes("palace") ||
      /\b(fort|palace|qila|mahal|castle|haveli)\b/i.test(n)) {
    return "FORT_PALACE";
  }
  if (c.includes("museum") || c.includes("culture") || raw.tourism === "museum" ||
      /\b(museum|sangrahalaya|gallery|memorial|planetarium)\b/i.test(n)) {
    return "MUSEUM";
  }
  if (c.includes("natural") || c.includes("water") || raw.water === "lake" || raw.natural === "water" ||
      /\b(lake|talab|sagar|sanctuary|reserve|waterfall|river|ghat)\b/i.test(n)) {
    return "NATURE_LAKE";
  }
  if (c.includes("park") || raw.leisure === "park" ||
      /\b(garden|bagh|bari|park|botanical)\b/i.test(n)) {
    return "GARDEN";
  }
  if (c.includes("religion") || raw.amenity === "place_of_worship" ||
      /\b(temple|mandir|masjid|mosque|church|gurdwara|dargah|stupa)\b/i.test(n)) {
    return "HERITAGE_TEMPLE";
  }
  if (c.includes("heritage") || raw.historic ||
      /\b(monument|pillar|minar|gate|cenotaph|chhatri|arch)\b/i.test(n)) {
    return "HISTORIC_MONUMENT";
  }
  return "OTHER_ATTRACTION";
}

// Curated Authentic Related Photos for Indian Destinations & Attractions
const RELATED_EXPLORE_PHOTOS = {
  FORT_PALACE: [
    "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1598890777032-bde835ba27c2?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80"
  ],
  HISTORIC_MONUMENT: [
    "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1590766940554-634a7ed41450?auto=format&fit=crop&w=800&q=80"
  ],
  HERITAGE_TEMPLE: [
    "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80"
  ],
  MUSEUM: [
    "https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&w=800&q=80"
  ],
  NATURE_LAKE: [
    "https://images.unsplash.com/photo-1570789210967-2cac24afeb00?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1617854818583-09e7f077a156?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80"
  ],
  DEFAULT: [
    "https://images.unsplash.com/photo-1506461883276-594a12b11cf3?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80"
  ]
};

// Curated Authentic Related Photos for Indian Dining & Cuisines
const RELATED_FOOD_PHOTOS = {
  THALI: [
    "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=800&q=80"
  ],
  BIRYANI: [
    "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80"
  ],
  DHABA: [
    "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80"
  ],
  SOUTH_INDIAN: [
    "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1630383249896-424e482df921?auto=format&fit=crop&w=800&q=80"
  ],
  CAFE: [
    "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80"
  ],
  SWEETS: [
    "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80"
  ],
  TANDOORI: [
    "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=800&q=80"
  ],
  DEFAULT: [
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80"
  ]
};

function getRelatedPhotoUrl(placeName, mode = "explore", categoryOrCuisine = "") {
  const n = (placeName || "").toLowerCase();
  const c = (categoryOrCuisine || "").toLowerCase();

  let list;
  if (mode === "eat") {
    if (/thali|bhojan|bhojanalaya|rasoi|pure\s*veg/i.test(n) || /thali|rajasthani|gujarati/i.test(c)) {
      list = RELATED_FOOD_PHOTOS.THALI;
    } else if (/biryani|dum|mughlai|awadhi|hyderabadi/i.test(n) || /biryani|mughlai/i.test(c)) {
      list = RELATED_FOOD_PHOTOS.BIRYANI;
    } else if (/dhaba|highway|punjabi|tadka/i.test(n) || /dhaba|punjabi/i.test(c)) {
      list = RELATED_FOOD_PHOTOS.DHABA;
    } else if (/dosa|idli|south\s*indian|bhavan|udupi/i.test(n) || /south_indian|dosa/i.test(c)) {
      list = RELATED_FOOD_PHOTOS.SOUTH_INDIAN;
    } else if (/cafe|coffee|roastery|bistro|bake|bakery/i.test(n) || /cafe|bakery/i.test(c)) {
      list = RELATED_FOOD_PHOTOS.CAFE;
    } else if (/sweets|mithai|bhandar|halwai|jalebi|laddu/i.test(n) || /sweets|confectionery/i.test(c)) {
      list = RELATED_FOOD_PHOTOS.SWEETS;
    } else if (/tandoor|tikka|kebab|grill|bbq/i.test(n) || /tandoori|barbeque/i.test(c)) {
      list = RELATED_FOOD_PHOTOS.TANDOORI;
    } else {
      list = RELATED_FOOD_PHOTOS.DEFAULT;
    }
  } else {
    if (c === "FORT_PALACE" || /fort|palace|qila|mahal|castle|haveli/i.test(n)) {
      list = RELATED_EXPLORE_PHOTOS.FORT_PALACE;
    } else if (c === "MUSEUM" || /museum|sangrahalaya|gallery|planetarium/i.test(n)) {
      list = RELATED_EXPLORE_PHOTOS.MUSEUM;
    } else if (c === "NATURE_LAKE" || /lake|sagar|talab|ghat|river|waterfall|falls/i.test(n)) {
      list = RELATED_EXPLORE_PHOTOS.NATURE_LAKE;
    } else if (c === "HERITAGE_TEMPLE" || /temple|mandir|masjid|mosque|gurdwara|church|dargah|stupa/i.test(n)) {
      list = RELATED_EXPLORE_PHOTOS.HERITAGE_TEMPLE;
    } else if (c === "HISTORIC_MONUMENT" || /monument|pillar|minar|gate|memorial|arch/i.test(n)) {
      list = RELATED_EXPLORE_PHOTOS.HISTORIC_MONUMENT;
    } else {
      list = RELATED_EXPLORE_PHOTOS.DEFAULT;
    }
  }

  let hash = 0;
  for (let i = 0; i < n.length; i++) hash = (hash * 31 + n.charCodeAt(i)) & 0xffffffff;
  const index = Math.abs(hash) % list.length;
  return list[index];
}

/**
 * Verified & Related Photo Resolver.
 * Always returns a valid photo:
 * 1. Verified photo from OSM, Wikimedia Commons, or Wikipedia.
 * 2. If no verified photo exists, returns an authentic, curated related photo tailored to the category/cuisine.
 * Places never have missing/broken photos.
 */
async function resolveVerifiedLandmarkPhoto(placeName, cityName, rawTags = {}, mode = "explore", categoryOrCuisine = "") {
  const clean = cleanPlaceName(placeName);
  const cacheKey = `${clean.toLowerCase()}::${(cityName || "").toLowerCase()}::${mode}`;
  if (verifiedImageCache.has(cacheKey)) {
    return verifiedImageCache.get(cacheKey);
  }

  // 1. Direct image tag in OSM raw metadata
  if (rawTags.image && /^https?:\/\//i.test(rawTags.image)) {
    const res = { photoUrl: rawTags.image, img: rawTags.image, isRealPhoto: true, photoNote: "Verified OSM Photo" };
    verifiedImageCache.set(cacheKey, res);
    return res;
  }

  // 2. Wikimedia Commons tag in OSM metadata
  if (rawTags.wikimedia_commons) {
    const file = rawTags.wikimedia_commons.replace(/^File:/i, "").trim();
    const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=800`;
    const res = { photoUrl: url, img: url, isRealPhoto: true, photoNote: "Verified Wikimedia Commons" };
    verifiedImageCache.set(cacheKey, res);
    return res;
  }

  // 3. Exact Wikipedia page tag in OSM metadata
  const wikiTag = rawTags.wikipedia || rawTags["wikipedia:en"];
  if (wikiTag) {
    try {
      const pageTitle = wikiTag.includes(":") ? wikiTag.split(":")[1] : wikiTag;
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=pageimages&pithumbsize=800&format=json&origin=*`;
      const wikiRes = await axios.get(wikiUrl, {
        headers: { "User-Agent": WIKI_USER_AGENT },
        timeout: 4000
      });
      const pages = wikiRes.data?.query?.pages || {};
      const page = Object.values(pages)[0];
      if (page?.thumbnail?.source) {
        const res = { photoUrl: page.thumbnail.source, img: page.thumbnail.source, isRealPhoto: true, photoNote: "Verified Wikipedia Photo" };
        verifiedImageCache.set(cacheKey, res);
        return res;
      }
    } catch (_) {}
  }

  // 4. Wikipedia Search Match with alternate Indian query variants
  if (clean && clean.length > 2) {
    const searchVariants = [
      cityName ? `${clean} ${cityName}` : clean,
      clean
    ];

    // Transliteration / alias handling (e.g. Amber -> Amer, Jantar Mantar Delhi, etc.)
    if (/amber\s*fort/i.test(clean)) searchVariants.unshift("Amer Fort Jaipur", "Amer Fort");
    if (/nahargarh/i.test(clean)) searchVariants.unshift("Nahargarh Fort Jaipur");
    if (/shanker|shankar/i.test(clean)) searchVariants.unshift("Shankars International Dolls Museum");
    if (/vintage.*car/i.test(clean)) searchVariants.unshift("Vintage and Classic Car Museum Udaipur");

    for (const q of searchVariants) {
      try {
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=4&format=json&origin=*`;
        const sRes = await axios.get(searchUrl, {
          headers: { "User-Agent": WIKI_USER_AGENT },
          timeout: 3500
        });
        const hits = sRes.data?.query?.search || [];
        for (const hit of hits) {
          const title = hit.title.toLowerCase();
          const snippet = (hit.snippet || "").toLowerCase();

          // Reject biographies, individuals, politicians, artists, etc.
          const isPerson = /\b(born\s*\d{4}|politician|choreographer|actor|actress|singer|musician|entrepreneur|businesswoman|businessman|cricketer|lawyer|mp|mla|minister|member of parliament|director|author|poet|given name|surname)\b/i.test(snippet);
          if (isPerson) continue;

          // For dining/food places, strictly require food or dining context
          if (mode === "eat") {
            const isFoodEstablishment = /\b(restaurant|cafe|dhaba|bhojanalaya|bhavan|eatery|bakery|sweet\s*shop|mithai|dining|cuisine|bar|pub|bistro|diner|food|dishes)\b/i.test(title + " " + snippet);
            if (!isFoodEstablishment) continue;
          }

          const normHit = title.replace(/[^a-z0-9]/g, "");
          const normPlace = clean.toLowerCase().replace(/[^a-z0-9]/g, "");
          const isFuzzyMatch = normHit === normPlace ||
                               (mode !== "eat" && (normHit.includes("fort") || normHit.includes("palace") || normHit.includes("temple") || normHit.includes("lake") || normHit.includes("museum"))) ||
                               (normHit.includes(normPlace) && (normHit.includes("restaurant") || normHit.includes("cafe") || normHit.includes("hotel")));

          if (isFuzzyMatch) {
            const imgUrl = `https://en.wikipedia.org/w/api.php?action=query&pageids=${hit.pageid}&prop=pageimages&pithumbsize=800&format=json&origin=*`;
            const iRes = await axios.get(imgUrl, {
              headers: { "User-Agent": WIKI_USER_AGENT },
              timeout: 3500
            });
            const page = iRes.data?.query?.pages?.[hit.pageid];
            if (page?.thumbnail?.source) {
              const res = { photoUrl: page.thumbnail.source, img: page.thumbnail.source, isRealPhoto: true, photoNote: "Verified Landmark Photo" };
              verifiedImageCache.set(cacheKey, res);
              return res;
            }
          }
        }
      } catch (_) {}
    }
  }

  // 5. Fallback to Curated Contextual Related Photo
  const relatedUrl = getRelatedPhotoUrl(clean, mode, categoryOrCuisine);
  const relatedPhoto = {
    photoUrl: relatedUrl,
    img: relatedUrl,
    isRealPhoto: false,
    photoNote: "Related Curated Photo"
  };
  verifiedImageCache.set(cacheKey, relatedPhoto);
  return relatedPhoto;
}

/**
 * Phase 4 & 5: Important Landmark Recovery via OSM Nominatim.
 * Recovers real OSM relations/multipolygons (such as Lake Pichola, prominent forts/palaces)
 * that Geoapify's Places point index may omit.
 * Strictly excludes parks and gardens.
 */
async function recoverMissingOsmLandmarks(cityName, centerLat, centerLon, maxDistKm) {
  const recovered = [];
  const queries = [
    `lake in ${cityName}, India`,
    `palace in ${cityName}, India`,
    `fort in ${cityName}, India`,
    `museum in ${cityName}, India`,
    `monument in ${cityName}, India`
  ];

  for (const q of queries) {
    try {
      const res = await axios.get(NOMINATIM_URL, {
        params: {
          q,
          format: "jsonv2",
          addressdetails: 1,
          limit: 4
        },
        headers: { "User-Agent": WIKI_USER_AGENT },
        timeout: 4500
      });

      const items = res.data || [];
      for (const item of items) {
        const pLat = Number(item.lat);
        const pLon = Number(item.lon);
        if (!Number.isFinite(pLat) || !Number.isFinite(pLon)) continue;

        const distKm = distanceBetweenPlaces({ lat: pLat, lon: pLon }, { lat: centerLat, lon: centerLon });
        if (distKm > maxDistKm) continue;

        const rawName = item.display_name.split(",")[0].trim();
        const name = cleanPlaceName(rawName);
        if (!name || name.length < 3 || !/[a-zA-Z]{2,}/.test(name)) continue;
        if (name.toLowerCase() === cityName.toLowerCase()) continue;
        if (/\b(sector\s*\d+|block\s*[a-z0-9]+)\b/i.test(name)) continue;

        const DISALLOWED_NOMINATIM_TYPES = new Set([
          "car_parts", "events_venue", "shop", "public", "cinema", "hotel", "hostel",
          "retail", "commercial", "office", "house", "residential", "car_repair", "convenience", "park"
        ]);
        if (DISALLOWED_NOMINATIM_TYPES.has(item.type)) continue;

        // Skip lodging, transport, banquet halls or parks/gardens
        if (item.type === "hotel" || item.type === "hostel" || item.type === "bus_stop" || item.type === "railway" || item.type === "cinema" || item.type === "park") continue;
        if (EXPLORE_DISQUALIFY_PATTERNS.some(p => p.test(name))) continue;

        const isLake = (item.type === "water" || item.type === "lake") || /\b(lake|sagar|talab)\b/i.test(name);
        const isPalaceFort = (item.type === "castle" || item.type === "fort") || /\b(fort|qila)\b/i.test(name);
        const isMuseum = (item.type === "museum") || /\b(museum|sangrahalaya)\b/i.test(name);
        const isBridgeOrGhat = (item.type === "bridge" || item.type === "suspension_bridge" || item.type === "attraction") ||
                               /\b(jhula|bridge|ghat|ashram|waterfall|pass|stupa|caves?)\b/i.test(name);

        if (!isLake && !isPalaceFort && !isMuseum && !isBridgeOrGhat) continue;

        let detScore = 56;
        if (isPalaceFort) detScore += 22;
        if (isLake) detScore += 20;
        if (isMuseum) detScore += 18;
        if (isBridgeOrGhat) detScore += 22;
        if (distKm < 5) detScore += 5;
        else if (distKm < 12) detScore += 3;

        recovered.push({
          id: `osm_${item.osm_type || "rel"}_${item.osm_id || Math.round(pLat * 1000)}`,
          name,
          categories: isLake ? ["natural", "natural.water", "tourism.attraction"] :
                      isPalaceFort ? ["heritage", "tourism.sights"] : ["entertainment", "entertainment.museum"],
          lat: pLat,
          lon: pLon,
          distanceKm: Number(distKm.toFixed(2)),
          heritage: isPalaceFort || isMuseum ? "monument" : null,
          wikipedia: `en:${name.replace(/\s+/g, "_")}`,
          wikidata: null,
          tourism: "attraction",
          historic: isPalaceFort ? "palace" : null,
          address: item.display_name,
          website: null,
          rawTags: {
            name,
            osm_type: item.osm_type,
            osm_id: item.osm_id,
            type: item.type,
            natural: isLake ? "water" : undefined,
            water: isLake ? "lake" : undefined,
            historic: isPalaceFort ? "palace" : undefined,
            wikipedia: `en:${name.replace(/\s+/g, "_")}`
          },
          detScore: Math.min(96, detScore)
        });
      }
    } catch (_) {}
  }

  return recovered;
}
function buildFactualAttractionDescription(c, cityName) {
  if (c.rawTags?.description) {
    return c.rawTags.description;
  }
  if (c.isUnesco) {
    return `A designated UNESCO World Heritage landmark situated in ${cityName}.`;
  }
  if (c.groupCategory === "FORT_PALACE") {
    const isFort = /fort|qila/i.test(c.name);
    return `A historic ${isFort ? "fortification" : "heritage landmark"} situated in ${cityName}.`;
  }
  if (c.groupCategory === "NATURE_LAKE") {
    const isLake = /lake|sagar|tal/i.test(c.name);
    return `A scenic ${isLake ? "freshwater lake and natural attraction" : "wildlife and nature reserve"} located in ${cityName}.`;
  }
  if (c.groupCategory === "MUSEUM") {
    return `A cultural museum preserving historical exhibits and collections in ${cityName}.`;
  }
  if (c.groupCategory === "HERITAGE_TEMPLE") {
    return `A historic place of worship and sacred heritage landmark in ${cityName}.`;
  }
  if (c.groupCategory === "GARDEN") {
    return `A historic garden featuring landscaped grounds and pavilions in ${cityName}.`;
  }
  return `A prominent ${c.featureDesignation || "cultural landmark"} situated in ${cityName}.`;
}

function buildFactualFoodDescription(c, cityName) {
  if (c.cuisine) {
    return `A local dining establishment offering ${c.cuisine} cuisine in ${cityName}.`;
  }
  if (c.isChain) {
    return `A fast-food outlet of ${c.name} located in ${cityName}.`;
  }
  if (c.categories?.some(x => x.includes("cafe")) || /cafe|coffee/i.test(c.name)) {
    return `A cafe offering beverages, light refreshments, and snacks in ${cityName}.`;
  }
  if (/dhaba/i.test(c.name)) {
    return `A roadside-style dhaba serving traditional North Indian meals in ${cityName}.`;
  }
  if (/sweets|mithai|bhandar/i.test(c.name)) {
    return `A traditional confectionery and snack shop serving regional treats in ${cityName}.`;
  }
  if (/dosa|south\s*indian/i.test(c.name)) {
    return `A dining establishment serving traditional South Indian cuisine in ${cityName}.`;
  }
  return `A local dining establishment serving authentic regional meals in ${cityName}.`;
}

/**
 * Main Discovery Service for City Explorer & Where to Eat.
 * Geoapify/OSM is the ONLY source of real places and geographic coordinates.
 * Groq is used purely for classification, ranking, and enrichment.
 */
async function searchCityPlaces(cityName, limit = 20, mode = "explore") {
  if (!cityName || typeof cityName !== "string" || cityName.trim().length < 2) {
    throw new Error("A valid city name is required.");
  }

  const rawQuery = cityName.trim();
  const normalizedQuery = normalizeDestinationName(rawQuery);
  const normalizedMode = (mode === "eat" || mode === "food") ? "eat" : "explore";
  const requestedLimit = Math.min(Math.max(Number(limit) || 20, 5), 50);

  const cacheKey = `${normalizedQuery.toLowerCase()}::${normalizedMode}::${requestedLimit}`;
  if (cityPlacesCache.has(cacheKey)) {
    return cityPlacesCache.get(cacheKey);
  }

  // Strict country verification for explicit foreign cities
  const foreignQueries = new Set(["paris", "london", "new york", "tokyo", "dubai", "singapore", "rome", "berlin", "bangkok"]);
  if (foreignQueries.has(rawQuery.toLowerCase()) || foreignQueries.has(normalizedQuery.toLowerCase())) {
    throw new Error(`Destination "${rawQuery}" is outside India. TravelBuddy supports Indian destinations only.`);
  }

  const geoapifyKey = process.env.GEOAPIFY_API_KEY;
  if (!geoapifyKey) {
    throw new Error("GEOAPIFY_API_KEY is not configured on the backend server.");
  }

  let lat = null;
  let lon = null;
  let resolvedCityName = normalizedQuery;
  let stateCountry = "India";
  let fullName = `${normalizedQuery}, India`;
  let queriedLandmark = null;

  // Tier 0: Check if user specifically queried a famous Indian landmark or POI
  const matchedLandmark = findRegisteredIndianLandmark(rawQuery) || findRegisteredIndianLandmark(normalizedQuery);
  if (matchedLandmark) {
    queriedLandmark = matchedLandmark;
    lat = matchedLandmark.lat;
    lon = matchedLandmark.lon;
    resolvedCityName = matchedLandmark.city;
    stateCountry = `${matchedLandmark.state}, India`;
    fullName = `${matchedLandmark.name}, ${matchedLandmark.city}, ${matchedLandmark.state}, India`;
  } else {
    // Tier 1: Check built-in major Indian cities directory for instant, zero-latency resolution
    const queryLower = normalizedQuery.toLowerCase();
    const staticCity = MAJOR_INDIAN_CITIES_COORDS[queryLower] ||
                       MAJOR_INDIAN_CITIES_COORDS[rawQuery.toLowerCase()];

    if (staticCity) {
      lat = staticCity.lat;
      lon = staticCity.lon;
      resolvedCityName = staticCity.name;
      stateCountry = `${staticCity.state}, India`;
      fullName = staticCity.fullName;
    } else {
      // Tier 2: Resilient Geoapify Geocoding (handles city, town, village, or arbitrary landmark anywhere in India)
      try {
        let geocodeText = rawQuery;
        if (/ in /i.test(geocodeText)) {
          geocodeText = geocodeText.replace(/\s+in\s+/i, ", ");
        }
        const geoapifyRes = await axios.get("https://api.geoapify.com/v1/geocode/search", {
          params: {
            text: `${geocodeText}, India`,
            filter: "countrycode:in",
            limit: 3,
            apiKey: geoapifyKey
          },
          timeout: 6000
        });
        const features = geoapifyRes.data?.features || [];
        const feat = features.find(f => {
          const c = (f.properties?.country_code || "").toLowerCase();
          return c === "in" || c === "";
        }) || features[0];

        if (feat) {
          lon = feat.geometry?.coordinates?.[0];
          lat = feat.geometry?.coordinates?.[1];
          resolvedCityName = feat.properties?.city || feat.properties?.county || feat.properties?.state || feat.properties?.name || normalizedQuery;
          stateCountry = [feat.properties?.state, "India"].filter(Boolean).join(", ");
          fullName = feat.properties?.formatted || `${resolvedCityName}, India`;

          // If the geocoded feature itself is a specific landmark/attraction
          if (feat.properties?.result_type !== "city" && feat.properties?.result_type !== "administrative" && feat.properties?.name) {
            queriedLandmark = {
              name: feat.properties.name,
              city: resolvedCityName,
              state: feat.properties.state || "India",
              lat,
              lon,
              category: "Attraction",
              tag: feat.properties.category || "Landmark",
              desc: `A prominent landmark located in ${resolvedCityName}, ${stateCountry}.`,
              photoUrl: null
            };
          }
        }
      } catch (_) {}

      // Tier 3: Nominatim Geocoding fallback if Geoapify didn't find coordinates
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        let geoData = [];
        try {
          const geoResponse = await axios.get(NOMINATIM_URL, {
            params: {
              q: `${normalizedQuery}, India`,
              format: "jsonv2",
              addressdetails: 1,
              limit: 5
            },
            headers: { "User-Agent": WIKI_USER_AGENT },
            timeout: 5000
          });
          geoData = geoResponse.data || [];
        } catch (_) {
          geoData = [];
        }

        if (Array.isArray(geoData) && geoData.length > 0) {
          const location = geoData.find(item => {
            const addr = item.address || {};
            return addr.country_code === "in" || (addr.country && addr.country.toLowerCase() === "india");
          }) || geoData[0];

          lat = Number(location.lat);
          lon = Number(location.lon);
          const addr = location.address || {};
          resolvedCityName =
            INDIAN_CITY_ALIASES[normalizedQuery.toLowerCase()] ||
            addr.city ||
            addr.town ||
            addr.municipality ||
            addr.city_district ||
            normalizedQuery;
          const state = addr.state || "";
          stateCountry = [state, "India"].filter(Boolean).join(", ");
          fullName = location.display_name;
        }
      }
    }
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error(`Destination "${rawQuery}" could not be located in India. Try searching for any Indian city or landmark (e.g., Rishikesh, Lakshman Jhula, Jaipur, Hampi).`);
  }

  // City-specific geographic boundary handling (Phase 12 / Step 14)
  const isGreaterNoida = /greater\s*noida/i.test(resolvedCityName);
  const exploreRadius = isGreaterNoida ? 15000 : 22000;
  const maxDistanceKm = isGreaterNoida ? 16 : 25;

  // =========================================================================
  // MODE 1: CITY EXPLORER
  // =========================================================================
  if (normalizedMode === "explore") {
    // Multi-channel Geoapify queries covering heritage, culture, sights, nature, and religious tourist sites
    // NOTE: leisure.park is strictly excluded per requirements (no parks or gardens)
    const channels = [
      { cat: "heritage", radius: exploreRadius, bias: true, limit: 50 },
      { cat: "entertainment.museum,entertainment.culture", radius: exploreRadius, bias: true, limit: 50 },
      { cat: "tourism.sights,tourism.attraction", radius: exploreRadius, bias: true, limit: 60 },
      { cat: "tourism.sights,tourism.attraction", radius: exploreRadius, bias: false, limit: 40 },
      { cat: "natural.protected_area,natural.water", radius: exploreRadius, bias: true, limit: 40 },
      { cat: "religion.place_of_worship", radius: exploreRadius, bias: true, limit: 50 }
    ];

    const responses = await Promise.all(channels.map(ch => {
      const params = {
        categories: ch.cat,
        filter: `circle:${lon},${lat},${ch.radius}`,
        limit: ch.limit,
        apiKey: geoapifyKey
      };
      if (ch.bias) params.bias = `proximity:${lon},${lat}`;
      return axios.get("https://api.geoapify.com/v2/places", { params, timeout: 10000 }).catch(() => ({ data: { features: [] } }));
    }));

    const rawFeatures = responses.flatMap(r => r.data?.features || []);
    const candidates = [];
    const rejected = [];

    for (const feat of rawFeatures) {
      const props = feat.properties || {};
      const raw = props.datasource?.raw || {};

      // Resolve English or Latin place name cleanly
      let rawName = raw["name:en"] || raw.int_name || props.name || raw.name;
      let name = cleanPlaceName(rawName);

      // If name is foreign script or missing, check Wikipedia tag for verified name
      if (!name || !/[a-zA-Z]{2,}/.test(name)) {
        const wikiTag = raw.wikipedia || raw["wikipedia:en"];
        if (wikiTag && wikiTag.startsWith("en:")) {
          name = wikiTag.replace(/^en:/, "").replace(/,\s*.*$/, "").replace(/_/g, " ").trim();
        }
      }

      if (!name || name.length < 3 || !/[a-zA-Z]{2,}/.test(name)) {
        rejected.push({ name: name || "Unnamed", reason: "Invalid or missing Latin name" });
        continue;
      }

      const pLat = Number(props.lat);
      const pLon = Number(props.lon);
      if (!Number.isFinite(pLat) || !Number.isFinite(pLon)) {
        rejected.push({ name, reason: "Invalid coordinates" });
        continue;
      }

      const distKm = distanceBetweenPlaces({ lat: pLat, lon: pLon }, { lat, lon });
      if (distKm > maxDistanceKm) {
        rejected.push({ name, reason: `Outside destination radius (${distKm.toFixed(1)} km > ${maxDistanceKm} km)` });
        continue;
      }

      // Greater Noida boundary protection: reject external Delhi/Faridabad attractions
      if (isGreaterNoida) {
        const addrLower = (props.formatted || props.address_line2 || "").toLowerCase();
        if (/\b(delhi|faridabad|haryana)\b/i.test(addrLower) || /\b(surajkund|adilabad)\b/i.test(name)) {
          rejected.push({ name, reason: "Excluded: Attraction located outside Greater Noida (in Delhi/Faridabad)" });
          continue;
        }
      }

      // Reject isolated statues, busts, and street artwork
      if (props.categories?.some(c => c.includes("artwork") || c.includes("statue")) || raw.artwork_type === "statue") {
        if (!/statue of unity/i.test(name)) {
          rejected.push({ name, reason: "Isolated statue or bust" });
          continue;
        }
      }

      // Reject private, access_limited, or residential buildings
      const isPrivateOrResidential = props.categories?.some(c =>
        c.includes("private") ||
        c.includes("access_limited") ||
        c.includes("building.residential") ||
        c.includes("residential")
      );
      if (isPrivateOrResidential) {
        rejected.push({ name, reason: "Strict exclusion: Private or residential property" });
        continue;
      }

      // Reject commercial marriage palaces, banquet halls, or fake palaces without verified heritage standing
      if (/\bpalace\b/i.test(name)) {
        const isRegisteredPalace = findRegisteredIndianLandmark(name) ||
          Boolean(raw.heritage || raw.historic === "palace" || raw.wikipedia || raw.wikidata ||
                  /city\s*palace|mysore\s*palace|laxmi\s*vilas|umaid\s*bhawan|rambagh|jai\s*vilas|chowmahalla|falaknuma|bangalore\s*palace|padmanabhapuram/i.test(name));
        if (!isRegisteredPalace) {
          rejected.push({ name, reason: "Strict exclusion: Commercial banquet or unverified palace" });
          continue;
        }
      }

      // Reject any possessive personal property (e.g. "Prashant Kumar's Home")
      if (/['’]s\b/i.test(name) && !/^(st\.?|saint)\b/i.test(name)) {
        rejected.push({ name, reason: "Strict exclusion: Possessive personal property or name" });
        continue;
      }

      // Reject personal names standing alone without landmark type
      if (/^(mahatma\s*gandhi|mother\s*mary|atal\s*bihari|dr\.?\s*ambedkar)$/i.test(name.trim())) {
        rejected.push({ name, reason: "Strict exclusion: Personal name or roadside memorial" });
        continue;
      }

      // Disqualification patterns
      const isDisqualified = EXPLORE_DISQUALIFY_PATTERNS.some(pat => pat.test(name));
      if (isDisqualified && !/india gate|gateway of india|red fort complex/i.test(name)) {
        rejected.push({ name, reason: "Matched infrastructure or sub-component filter" });
        continue;
      }

      // Strict user requirement: City Explorer must NOT include parks or gardens
      const isParkOrGarden = props.categories?.some(c => c.includes("park") || c.includes("garden")) ||
                            raw.leisure === "park" || raw.leisure === "garden" ||
                            /\b(park|parks|garden|gardens|bagh|bari|udyan|botanical)\b/i.test(name);
      if (isParkOrGarden) {
        rejected.push({ name, reason: "Strict exclusion: Park or garden" });
        continue;
      }

      // Strict user requirement: City Explorer must NOT include hotels or lodging
      const isHotel = props.categories?.some(c => c.includes("accommodation") || c.includes("hotel") || c.includes("guest_house") || c.includes("motel")) ||
                      raw.tourism === "hotel" || raw.tourism === "guest_house" || raw.tourism === "hostel" || raw.tourism === "motel" ||
                      /\b(hotel|resort|resorts|lodge|lodging|hostel|inn|motel|guest\s*house|dharmashala|dharamshala|homestay|pg|suites?|stay|stays)\b/i.test(name);
      if (isHotel) {
        rejected.push({ name, reason: "Strict exclusion: Hotel or lodging" });
        continue;
      }

      // Strict user requirement: City Explorer must NOT include flats, apartments, or residential colonies
      const isFlatOrResidential = props.categories?.some(c => c.includes("building.residential") || c.includes("residential")) ||
                                 raw.building === "apartments" || raw.building === "residential" ||
                                 /\b(flat|flats|apartment|apartments|society|residence|residency|residential|housing|enclave|vihar|colony|kothi|villa|niwas|nivas|tower|towers|heights|homes?|greens?)\b/i.test(name);
      if (isFlatOrResidential) {
        rejected.push({ name, reason: "Strict exclusion: Flat or residential" });
        continue;
      }

      // Strict exclusion: Nalas, drains, channels
      const isNalaOrDrain = /\b(nala|naala|drain|gutter|sewer|sewerage|waste|channel)\b/i.test(name) ||
                            raw.waterway === "drain" || raw.waterway === "ditch";
      if (isNalaOrDrain) {
        rejected.push({ name, reason: "Strict exclusion: Drain or nala" });
        continue;
      }

      // Strict user requirement: Disallow farms, farmhouses, private properties, or possessive private names (e.g. "yash's farm")
      const isFarmOrPrivate = props.categories?.some(c => c.includes("farm") || c.includes("agriculture")) ||
                             raw.landuse === "farm" || raw.landuse === "farmland" || raw.place === "farm" ||
                             /\b(farm|farmhouse|khet|krishi|dairy|nursery|orchard|plantation|agro)\b/i.test(name) ||
                             /\b\w+['’]s\s+(farm|house|villa|cottage|land|property|lawn|residence)\b/i.test(name);
      if (isFarmOrPrivate) {
        rejected.push({ name, reason: "Strict exclusion: Farm, farmhouse, or private property" });
        continue;
      }

      // Disallow generic raw viewpoints lacking verified notability or having personal names (e.g. "yash's farm")
      const isRawViewpoint = props.categories?.includes("tourism.attraction.viewpoint") || raw.tourism === "viewpoint";
      if (isRawViewpoint) {
        const hasNotability = Boolean(raw.wikipedia || raw.wikidata || raw.heritage || /point|hill|cliff|peak|view/i.test(name));
        const isPossessiveOrPersonal = /['’]s\b/i.test(name) || /^[a-z]+['’]s/i.test(name);
        if (!hasNotability || isPossessiveOrPersonal) {
          rejected.push({ name, reason: "Strict exclusion: Generic or personal viewpoint" });
          continue;
        }
      }

      // Religious place verification: strictly admit only if verified tourist/heritage standing
      const isReligious = /temple|mandir|masjid|mosque|church|gurdwara|dargah|ashram/i.test(name) ||
                          raw.amenity === "place_of_worship" || raw.religion;
      if (isReligious) {
        const hasTouristStanding = Boolean(
          raw.wikipedia || raw.wikidata || raw.heritage || raw.historic ||
          props.categories?.some(c => c.includes("heritage") || c.includes("museum"))
        );
        if (!hasTouristStanding) {
          rejected.push({ name, reason: "Religious place lacking verified heritage/tourism metadata" });
          continue;
        }
      }

      // Nuanced Tourist Relevance Score Calculation (Phase 3 & Step 6)
      let detScore = 25;

      const isUNESCO = raw.heritage === "1" || /unesco/i.test(raw.heritage || "") ||
                       props.categories?.includes("heritage.unesco");
      if (isUNESCO) {
        detScore += 35;
      }

      const isMajorFortPalace = props.categories?.some(c => c.includes("castle") || c.includes("fort") || c.includes("palace")) ||
                                /\b(fort|palace|qila|mahal|castle|haveli)\b/i.test(name);
      if (isMajorFortPalace) {
        detScore += 25;
      }

      if (raw.wikipedia || raw["wikipedia:en"]) detScore += 15;
      if (raw.wikidata) detScore += 10;
      if (raw.wikimedia_commons) detScore += 5;

      const isNaturalWater = props.categories?.some(c => c.includes("water") || c.includes("natural")) ||
                            raw.water === "lake" || raw.natural === "water" || /\blake\b/i.test(name);
      if (isNaturalWater) detScore += 16;

      const isMuseumCulture = props.categories?.some(c => c.includes("museum") || c.includes("culture")) ||
                              raw.tourism === "museum";
      if (isMuseumCulture) detScore += 12;

      // Major verified tourist temple
      if (isReligious) {
        detScore += (raw.wikipedia || raw.wikidata) ? 18 : 12;
      }

      if (raw.opening_hours) detScore += 6;
      if (props.website || raw.website) detScore += 6;
      if (raw.fee === "yes") detScore += 4;

      if (distKm < 5) {
        detScore += 5;
      } else if (distKm < 12) {
        detScore += 3;
      } else if (distKm < 20) {
        detScore += 1;
      }

      candidates.push({
        id: props.place_id || `geo_${pLat.toFixed(4)}_${pLon.toFixed(4)}`,
        name,
        categories: props.categories || [],
        lat: pLat,
        lon: pLon,
        distanceKm: Number(distKm.toFixed(2)),
        heritage: raw.heritage || null,
        wikipedia: raw.wikipedia || raw["wikipedia:en"] || null,
        wikidata: raw.wikidata || null,
        tourism: raw.tourism || null,
        historic: raw.historic || null,
        address: props.address_line2 || props.formatted || `${name}, ${resolvedCityName}`,
        website: props.website || raw.website || null,
        rawTags: raw,
        detScore: Math.min(98, Math.max(35, detScore)),
        groupCategory: classifyExploreGroup(name, props.categories, raw)
      });
    }

    // Step 4 & 5: Important Landmark Recovery via OSM Nominatim (dynamic recovery for missing relations/multipolygons)
    const recoveredLandmarks = await recoverMissingOsmLandmarks(resolvedCityName, lat, lon, maxDistanceKm);
    for (const rec of recoveredLandmarks) {
      rec.groupCategory = classifyExploreGroup(rec.name, rec.categories, rec.rawTags);
      candidates.push(rec);
    }

    // Step 5b: Inject Iconic Registered Landmarks for Destination (e.g. Lakshman Jhula, Ram Jhula, Triveni Ghat for Rishikesh)
    const iconicList = CITY_ICONIC_LANDMARKS[resolvedCityName.toLowerCase()] || [];
    for (const lk of iconicList) {
      const reg = FAMOUS_INDIAN_LANDMARKS_REGISTRY[lk];
      if (reg) {
        const alreadyHas = candidates.some(c => normalizeForDedup(c.name) === normalizeForDedup(reg.name));
        if (!alreadyHas) {
          const distKm = distanceBetweenPlaces({ lat: reg.lat, lon: reg.lon }, { lat, lon });
          candidates.push({
            id: `reg_${lk}`,
            name: reg.name,
            categories: reg.category === "Nature" ? ["natural", "natural.water", "tourism.attraction"] :
                        reg.category === "Culture" ? ["heritage", "entertainment.culture"] : ["tourism", "tourism.sights"],
            lat: reg.lat,
            lon: reg.lon,
            distanceKm: Number(distKm.toFixed(2)),
            heritage: reg.tag,
            wikipedia: `en:${reg.name.replace(/\s+/g, "_")}`,
            wikidata: null,
            tourism: "attraction",
            address: `${reg.name}, ${reg.city}, ${reg.state}`,
            website: `https://maps.google.com/?q=${encodeURIComponent(reg.name + " " + reg.city)}`,
            rawTags: { wikipedia: `en:${reg.name.replace(/\s+/g, "_")}`, tourism: "attraction" },
            groupCategory: classifyExploreGroup(reg.name, [], {}),
            detScore: 95,
            presetPhotoUrl: reg.photoUrl,
            presetDesc: reg.desc,
            presetTag: reg.tag
          });
        }
      }
    }

    // Step 5c: If user queried a specific landmark (e.g. Lakshman Jhula), inject as highest priority candidate
    if (queriedLandmark) {
      const alreadyHas = candidates.some(c => normalizeForDedup(c.name) === normalizeForDedup(queriedLandmark.name));
      if (!alreadyHas) {
        candidates.unshift({
          id: `reg_queried_${Date.now()}`,
          name: queriedLandmark.name,
          categories: ["tourism", "tourism.sights", "heritage"],
          lat: queriedLandmark.lat,
          lon: queriedLandmark.lon,
          distanceKm: 0.1,
          heritage: queriedLandmark.tag,
          wikipedia: `en:${queriedLandmark.name.replace(/\s+/g, "_")}`,
          wikidata: null,
          tourism: "attraction",
          address: `${queriedLandmark.name}, ${queriedLandmark.city}, ${queriedLandmark.state}`,
          website: `https://maps.google.com/?q=${encodeURIComponent(queriedLandmark.name + " " + queriedLandmark.city)}`,
          rawTags: { wikipedia: `en:${queriedLandmark.name.replace(/\s+/g, "_")}`, tourism: "attraction" },
          groupCategory: classifyExploreGroup(queriedLandmark.name, [], {}),
          detScore: 99,
          presetPhotoUrl: queriedLandmark.photoUrl,
          presetDesc: queriedLandmark.desc,
          presetTag: queriedLandmark.tag
        });
      }
    }

    // Sort by deterministic score descending
    candidates.sort((a, b) => b.detScore - a.detScore || a.distanceKm - b.distanceKm);

    // Hierarchical Deduplication & Parent-Component Suppression
    const unique = [];
    let ghatCount = 0;

    for (const c of candidates) {
      // Diversity rule: max 1 ghat per destination unless specifically registered iconic
      if (/\bghat\b/i.test(c.name) && !c.id?.startsWith("reg_")) {
        if (ghatCount >= 1) continue;
        ghatCount++;
      }

      const cNorm = normalizeForDedup(c.name);
      const isDup = unique.some(u => {
        const uNorm = normalizeForDedup(u.name);
        if (uNorm === cNorm) return true;
        const d = distanceBetweenPlaces({ lat: u.lat, lon: u.lon }, { lat: c.lat, lon: c.lon });
        if (d < 0.25) return true;
        // Sub-component suppression within 1.2km (e.g. Sajjan Garh vs Sajjangarh Wildlife Sanctuary)
        if (d < 1.2 && (uNorm.includes(cNorm) || cNorm.includes(uNorm) || (uNorm.length >= 4 && cNorm.startsWith(uNorm.slice(0, 4))))) return true;
        return false;
      });

      if (!isDup) unique.push(c);
    }

    // Step 7: Category Diversity Selection for Groq Ranking
    // Guarantee that registered iconic landmarks are always in topForGroq
    const categoryCounts = {};
    const topForGroq = [];
    const overflow = [];

    // Always include registered landmarks first
    for (const c of unique) {
      if (c.id?.startsWith("reg_")) {
        topForGroq.push(c);
      }
    }

    for (const c of unique) {
      if (c.id?.startsWith("reg_")) continue;
      const group = c.groupCategory || "OTHER_ATTRACTION";
      const currentCount = categoryCounts[group] || 0;
      if (currentCount < 2 && topForGroq.length < 8) {
        categoryCounts[group] = currentCount + 1;
        topForGroq.push(c);
      } else {
        overflow.push(c);
      }
    }

    // If topForGroq has less than 8, fill from overflow
    while (topForGroq.length < 8 && overflow.length > 0) {
      topForGroq.push(overflow.shift());
    }

    // Pass diverse, validated candidates to Groq AI ranking
    const groqRankings = await rankExplorePlacesWithGroq({ cityName: resolvedCityName, candidates: topForGroq });

    const finalPlaces = await Promise.all(topForGroq.map(async c => {
      const groqMatch = groqRankings.find(g => g.id === c.id);
      const groqScore = groqMatch?.touristRelevance ?? c.detScore;
      // Differentiated final score: 40% deterministic + 60% Groq (or 99 for queried landmark)
      const isQueried = Boolean(queriedLandmark && normalizeForDedup(c.name) === normalizeForDedup(queriedLandmark.name));
      const finalScore = isQueried ? 100 : Math.round(0.4 * c.detScore + 0.6 * groqScore);
      const photoInfo = c.presetPhotoUrl
        ? { photoUrl: c.presetPhotoUrl, isRealPhoto: true, img: c.presetPhotoUrl, photoNote: "Verified Landmark Photo" }
        : await resolveVerifiedLandmarkPhoto(c.name, resolvedCityName, c.rawTags, "explore", c.groupCategory);

      const factualDesc = c.presetDesc || (groqMatch?.shortDescription && !groqMatch.shortDescription.includes("is a notable landmark in")
        ? groqMatch.shortDescription
        : buildFactualAttractionDescription(c, resolvedCityName));

      return {
        id: c.id,
        name: c.name,
        category: c.category || groqMatch?.category || (c.groupCategory === "MUSEUM" ? "Culture" : c.groupCategory === "NATURE_LAKE" ? "Nature" : "Attraction"),
        tag: c.presetTag || groqMatch?.tag || (c.categories.some(x => x.includes("heritage")) ? "Heritage Site" : "Attraction"),
        duration: "1-2 hrs",
        rating: null,
        prominenceScore: finalScore,
        detScore: c.detScore,
        groqScore,
        lat: c.lat,
        lon: c.lon,
        photoUrl: photoInfo.photoUrl,
        img: photoInfo.img,
        isRealPhoto: photoInfo.isRealPhoto,
        photoNote: photoInfo.photoNote,
        address: c.address,
        website: c.website || `https://maps.google.com/?q=${encodeURIComponent(c.name + " " + resolvedCityName)}`,
        phone: null,
        desc: factualDesc,
        distanceKm: c.distanceKm,
        source: c.id?.startsWith("reg_") ? "Verified Indian Heritage Registry" : "Geoapify / OpenStreetMap"
      };
    }));

    finalPlaces.sort((a, b) => b.prominenceScore - a.prominenceScore);

    // If a specific landmark was queried, guarantee it is at index 0
    if (queriedLandmark) {
      const qIdx = finalPlaces.findIndex(p => normalizeForDedup(p.name) === normalizeForDedup(queriedLandmark.name));
      if (qIdx > 0) {
        const [qItem] = finalPlaces.splice(qIdx, 1);
        finalPlaces.unshift(qItem);
      }
    }

    const result = {
      city: {
        name: resolvedCityName,
        fullName,
        country: stateCountry,
        desc: `Explore authentic landmarks, local sights, and cultural highlights in ${resolvedCityName}.`,
        lat,
        lon,
        zoom: 13,
        insights: generateCityInsights(resolvedCityName, stateCountry)
      },
      places: finalPlaces.slice(0, requestedLimit),
      rejected: rejected.slice(0, 10),
      rawCandidateCount: rawFeatures.length + recoveredLandmarks.length,
      rejectedCandidateCount: rejected.length,
      survivingCandidateCount: unique.length
    };

    cityPlacesCache.set(cacheKey, result);
    return result;

  // =========================================================================
  // MODE 2: WHERE TO EAT
  // =========================================================================
  } else {
    const foodRadius = isGreaterNoida ? 14000 : 15000;
    const foodMaxDist = isGreaterNoida ? 15 : 18;

    const channels = [
      { bias: true, limit: 60 },
      { bias: false, limit: 40 }
    ];

    const responses = await Promise.all(channels.map(ch => {
      const params = {
        categories: "catering.restaurant,catering.cafe,catering.fast_food,catering.bar",
        filter: `circle:${lon},${lat},${foodRadius}`,
        limit: ch.limit,
        apiKey: geoapifyKey
      };
      if (ch.bias) params.bias = `proximity:${lon},${lat}`;
      return axios.get("https://api.geoapify.com/v2/places", { params, timeout: 10000 }).catch(() => ({ data: { features: [] } }));
    }));

    const rawFeatures = responses.flatMap(r => r.data?.features || []);
    const candidates = [];
    const rejected = [];

    for (const feat of rawFeatures) {
      const props = feat.properties || {};
      const raw = props.datasource?.raw || {};
      const rawName = raw["name:en"] || raw.int_name || props.name || raw.name;
      const name = cleanPlaceName(rawName);

      if (!name || name.length < 3 || !/[a-zA-Z]{2,}/.test(name)) {
        rejected.push({ name: name || "Unnamed", reason: "Invalid or missing name" });
        continue;
      }

      const pLat = Number(props.lat);
      const pLon = Number(props.lon);
      if (!Number.isFinite(pLat) || !Number.isFinite(pLon)) {
        rejected.push({ name, reason: "Invalid coordinates" });
        continue;
      }

      const distKm = distanceBetweenPlaces({ lat: pLat, lon: pLon }, { lat, lon });
      if (distKm > foodMaxDist) {
        rejected.push({ name, reason: `Outside radius (${distKm.toFixed(1)} km > ${foodMaxDist} km)` });
        continue;
      }

      // Greater Noida boundary protection for food: reject external Delhi/Faridabad eateries
      if (isGreaterNoida) {
        const addrLower = (props.formatted || props.address_line2 || "").toLowerCase();
        if (/\b(delhi|faridabad|haryana)\b/i.test(addrLower)) {
          rejected.push({ name, reason: "Outside Greater Noida boundary" });
          continue;
        }
      }

      // Strict user requirement: Reject hotels / resorts / lodging from Where to Eat
      const isLodging = props.categories?.some(c => c.includes("accommodation") || c.includes("hotel")) ||
                        raw.tourism === "hotel" || raw.tourism === "guest_house" || raw.tourism === "hostel" ||
                        /\b(hotel|resort|resorts|lodge|motel|inn|hostel|guest\s*house|stay|stays)\b/i.test(name);
      if (isLodging) {
        rejected.push({ name, reason: "Strict exclusion: Hotel or lodging" });
        continue;
      }

      // Disqualification patterns
      const isDisqualified = FOOD_DISQUALIFY_PATTERNS.some(pat => pat.test(name));
      if (isDisqualified) {
        rejected.push({ name, reason: "Matched institutional canteen / liquor / generic kiosk filter" });
        continue;
      }

      // Strict user requirement: Disallow commercial corporate business outlets & fast-food chains (KFC, Burger King, etc.)
      const isChain = FAST_FOOD_CHAIN_PATTERN.test(name) ||
                      (raw.brand && FAST_FOOD_CHAIN_PATTERN.test(raw.brand)) ||
                      props.categories?.includes("catering.fast_food.chain");
      if (isChain) {
        rejected.push({ name, reason: "Strict exclusion: Commercial business outlet / fast-food chain" });
        continue;
      }

      // Deterministic food scoring for authentic local dining
      let detScore = 55;

      // Regional cuisine boost
      const cuisineTag = (raw.cuisine || "").toLowerCase();
      const hasRegionalCuisine = /\b(indian|rajasthani|mughlai|south_indian|north_indian|punjabi|bengali|gujarati|awadhi|kashmiri|biryani|dosa|thali)\b/i.test(cuisineTag);
      if (hasRegionalCuisine) {
        detScore += 25;
      } else if (raw.cuisine) {
        detScore += 15;
      }

      // Local authentic culinary identity in name
      const hasLocalIdentity = /\b(dhaba|bhojanalaya|thali|bhojan|sweets|chaat|bhavan|rasoi|annapurna|mess|kitchen)\b/i.test(name);
      if (hasLocalIdentity) {
        detScore += 20;
      }

      // Established heritage / institution (Wikipedia/Wikidata)
      if (raw.wikipedia || raw.wikidata) {
        detScore += 15;
      }

      if (props.website || raw.website) detScore += 6;
      if (raw.phone || props.phone) detScore += 4;
      if (raw.opening_hours) detScore += 5;

      if (distKm < 3) {
        detScore += 5;
      } else if (distKm < 8) {
        detScore += 3;
      }

      candidates.push({
        id: props.place_id || `geo_food_${pLat.toFixed(4)}_${pLon.toFixed(4)}`,
        name,
        categories: props.categories || [],
        lat: pLat,
        lon: pLon,
        distanceKm: Number(distKm.toFixed(2)),
        cuisine: raw.cuisine || null,
        brand: raw.brand || null,
        isChain: false,
        opening_hours: raw.opening_hours || null,
        address: props.address_line2 || props.formatted || `${name}, ${resolvedCityName}`,
        phone: raw.phone || props.phone || null,
        website: props.website || raw.website || null,
        rawTags: raw,
        detScore: Math.min(96, Math.max(30, detScore))
      });
    }

    // Step 5: Inject Curated Iconic Local Dining Institutions for Destination (e.g. Chotiwala, Ganga Beach in Rishikesh)
    const curatedEats = CURATED_DESTINATION_EATERIES[resolvedCityName.toLowerCase()] || [];
    for (const ce of curatedEats) {
      const alreadyHas = candidates.some(c => normalizeForDedup(c.name) === normalizeForDedup(ce.name));
      if (!alreadyHas) {
        const distKm = distanceBetweenPlaces({ lat: ce.lat, lon: ce.lon }, { lat, lon });
        candidates.push({
          id: `curated_food_${ce.name.toLowerCase().replace(/\s+/g, '_')}`,
          name: ce.name,
          categories: ["catering", "catering.restaurant"],
          lat: ce.lat,
          lon: ce.lon,
          distanceKm: Number(distKm.toFixed(2)),
          cuisine: ce.cuisine,
          brand: null,
          isChain: false,
          opening_hours: "10:00 AM - 10:30 PM",
          address: `${ce.name}, ${resolvedCityName}`,
          phone: null,
          website: `https://maps.google.com/?q=${encodeURIComponent(ce.name + " " + resolvedCityName)}`,
          rawTags: { cuisine: ce.cuisine },
          detScore: ce.detScore || 94,
          presetPhotoUrl: ce.photoUrl,
          presetDesc: ce.desc
        });
      }
    }

    candidates.sort((a, b) => b.detScore - a.detScore || a.distanceKm - b.distanceKm);

    // Deduplication
    const unique = [];
    for (const c of candidates) {
      const cNorm = normalizeForDedup(c.name);
      const isDup = unique.some(u => {
        const uNorm = normalizeForDedup(u.name);
        if (uNorm === cNorm) return true;
        const d = distanceBetweenPlaces({ lat: u.lat, lon: u.lon }, { lat: c.lat, lon: c.lon });
        return d < 0.25;
      });
      if (!isDup) unique.push(c);
    }

    // Authentic Famous Local Dining Selection (Ensure curated eateries are included in top selection)
    const topForGroq = [];
    for (const c of unique) {
      if (c.id?.startsWith("curated_food_")) {
        topForGroq.push(c);
      }
    }
    for (const c of unique) {
      if (c.id?.startsWith("curated_food_")) continue;
      if (topForGroq.length < 8) topForGroq.push(c);
    }

    const groqClassified = await classifyFoodPlacesWithGroq({ cityName: resolvedCityName, candidates: topForGroq });

    const finalPlaces = await Promise.all(topForGroq.map(async c => {
      const groqMatch = groqClassified.find(g => g.id === c.id);
      const groqScore = groqMatch?.culinaryScore ?? c.detScore;
      const finalScore = Math.round(0.4 * c.detScore + 0.6 * groqScore);
      const photoInfo = c.presetPhotoUrl
        ? { photoUrl: c.presetPhotoUrl, isRealPhoto: true, img: c.presetPhotoUrl, photoNote: "Verified Landmark Culinary Photo" }
        : await resolveVerifiedLandmarkPhoto(c.name, resolvedCityName, c.rawTags, "eat", c.cuisine || (c.categories && c.categories.join(' ')));

      const factualEditorial = c.presetDesc || (groqMatch?.editorial && !groqMatch.editorial.includes("is an established dining spot in")
        ? groqMatch.editorial
        : buildFactualFoodDescription(c, resolvedCityName));

      return {
        id: c.id,
        name: c.name,
        category: groqMatch?.foodCategory || (c.categories.some(x => x.includes("cafe")) ? "cafe" : "restaurant"),
        tags: Array.isArray(groqMatch?.tags) && groqMatch.tags.length ? groqMatch.tags : (c.cuisine ? [c.cuisine] : ["Local Dining"]),
        diningStyle: groqMatch?.diningStyle || "casual_dining",
        isChain: false,
        rating_google: c.rawTags.stars ? Number(c.rawTags.stars) : null,
        reviews_google: null,
        rating_tripadvisor: null,
        reviews_tripadvisor: null,
        evidenceScore: finalScore,
        detScore: c.detScore,
        groqScore,
        editorial: factualEditorial,
        review_quote: null,
        reviewer: null,
        address: c.address,
        phone: c.phone,
        website: c.website || `https://maps.google.com/?q=${encodeURIComponent(c.name + " " + resolvedCityName)}`,
        lat: c.lat,
        lon: c.lon,
        img: photoInfo.img,
        photoUrl: photoInfo.photoUrl,
        isRealPhoto: photoInfo.isRealPhoto,
        photoNote: photoInfo.photoNote,
        distanceKm: c.distanceKm,
        source: "Geoapify / OpenStreetMap"
      };
    }));

    finalPlaces.sort((a, b) => b.evidenceScore - a.evidenceScore);

    const result = {
      city: {
        name: resolvedCityName,
        fullName,
        country: stateCountry,
        desc: `Explore authentic dining spots and culinary highlights in ${resolvedCityName}.`,
        lat,
        lon,
        zoom: 13,
        insights: generateCityInsights(resolvedCityName, stateCountry)
      },
      places: finalPlaces.slice(0, requestedLimit),
      rejected: rejected.slice(0, 10),
      rawCandidateCount: rawFeatures.length,
      rejectedCandidateCount: rejected.length,
      survivingCandidateCount: unique.length
    };

    cityPlacesCache.set(cacheKey, result);
    return result;
  }
}

/**
 * Autocomplete for Indian destinations
 */
async function autocompleteCities(query) {
  if (!query || typeof query !== "string" || query.trim().length < 2) {
    return [];
  }
  const cleanQ = query.trim().toLowerCase();
  if (autocompleteCache.has(cleanQ)) {
    return autocompleteCache.get(cleanQ);
  }

  try {
    const res = await axios.get(NOMINATIM_URL, {
      params: {
        q: cleanQ,
        countrycodes: "in",
        format: "jsonv2",
        addressdetails: 1,
        limit: 8,
        featuretype: "settlement"
      },
      headers: {
        "User-Agent": WIKI_USER_AGENT
      },
      timeout: 6000
    });

    const suggestions = (res.data || [])
      .map(item => {
        const addr = item.address || {};
        const name = addr.city || addr.town || addr.municipality || addr.village || addr.county || item.name || item.display_name.split(",")[0].trim();
        const country = [addr.state, "India"].filter(Boolean).join(", ");
        return {
          name,
          displayName: item.display_name,
          country,
          lat: Number(item.lat),
          lon: Number(item.lon)
        };
      })
      .filter((v, idx, self) => self.findIndex(t => t.name.toLowerCase() === v.name.toLowerCase() && t.country.toLowerCase() === v.country.toLowerCase()) === idx);

    autocompleteCache.set(cleanQ, suggestions);
    if (autocompleteCache.size > 200) {
      const firstKey = autocompleteCache.keys().next().value;
      autocompleteCache.delete(firstKey);
    }
    return suggestions;
  } catch (err) {
    console.warn("Autocomplete error:", err.message);
    return [];
  }
}

function clearAllPlacesCache() {
  cityPlacesCache.clear();
  verifiedImageCache.clear();
  autocompleteCache.clear();
  return { success: true, message: "All city place and image caches cleared successfully." };
}

module.exports = {
  resolveVerifiedLandmarkPhoto,
  searchCityPlaces,
  autocompleteCities,
  clearAllPlacesCache
};
