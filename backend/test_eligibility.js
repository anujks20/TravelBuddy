const testItems = [
  { name: "Aircraft", cleanName: "Aircraft", catStr: "tourism.attraction.artwork.statue" },
  { name: "Airplane", cleanName: "Airplane", catStr: "tourism.sights.memorial" },
  { name: "Kundan First Engine of BLW", cleanName: "Kundan First Engine of BLW", catStr: "tourism.sights" },
  { name: "Kiran Center", cleanName: "Kiran Center", catStr: "entertainment.museum" },
  { name: "Ghanta Ghar", cleanName: "Ghanta Ghar", catStr: "tourism.sights.memorial.monument" },
  { name: "yamuna palce", cleanName: "yamuna palce", catStr: "tourism.sights.castle" },
  { name: "Flag Post", cleanName: "Flag Post", catStr: "tourism.attraction" },
  { name: "Panchsheel Chauraha", cleanName: "Panchsheel Chauraha", catStr: "building.historic" },
  { name: "Knowledge Park 3 Roundabout", cleanName: "Knowledge Park 3 Roundabout", catStr: "tourism.sights" },
  { name: "Mahatma Gandhi", cleanName: "Mahatma Gandhi", catStr: "tourism.attraction.artwork.statue" },
  { name: "Red Fort", cleanName: "Red Fort", catStr: "tourism.attraction.castle" },
  { name: "India Gate", cleanName: "India Gate", catStr: "tourism.sights.memorial.monument" },
  { name: "Allahabad Fort", cleanName: "Allahabad Fort", catStr: "tourism.sights.castle" },
  { name: "Ramnagar Fort", cleanName: "Ramnagar Fort", catStr: "tourism.sights.castle" },
  { name: "Kashi Vishwanath Temple", cleanName: "Kashi Vishwanath Temple", catStr: "building.place_of_worship" }
];

const testFoodItems = [
  { name: "SHRI Guest House", rawTags: { tourism: "guest_house" }, cleanName: "shri guest house" },
  { name: "desinger cake shop", rawTags: {}, cleanName: "desinger cake shop" },
  { name: "BUDGET BAR", rawTags: { amenity: "bar" }, cleanName: "budget bar" },
  { name: "Burger King", rawTags: { brand: "Burger King" }, cleanName: "burger king" },
  { name: "Kake Da Hotel", rawTags: { cuisine: "indian;north_indian" }, cleanName: "kake da hotel" },
  { name: "KFC", rawTags: { brand: "KFC", website: "https://kfc.co.in" }, cleanName: "kfc" }
];

console.log("Testing prototype rules...");
