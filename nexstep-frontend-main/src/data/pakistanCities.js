/**
 * City coordinates for the university map.
 * Universities store a city name, not a latitude. Pins use this list,
 * and an unknown city falls back to its province centre.
 */

export const PAKISTAN_CITIES = [
  ['Islamabad', 'Islamabad', 33.6844, 73.0479],
  ['Rawalpindi', 'Punjab', 33.5651, 73.0169],
  ['Lahore', 'Punjab', 31.5204, 74.3587],
  ['Faisalabad', 'Punjab', 31.4504, 73.1350],
  ['Multan', 'Punjab', 30.1575, 71.5249],
  ['Gujranwala', 'Punjab', 32.1877, 74.1945],
  ['Sialkot', 'Punjab', 32.4945, 74.5229],
  ['Gujrat', 'Punjab', 32.5742, 74.0754],
  ['Sahiwal', 'Punjab', 30.6682, 73.1114],
  ['Bahawalpur', 'Punjab', 29.3956, 71.6836],
  ['Rahim Yar Khan', 'Punjab', 28.4212, 70.2989],
  ['Sargodha', 'Punjab', 32.0836, 72.6711],
  ['Jhelum', 'Punjab', 32.9425, 73.7257],
  ['Attock', 'Punjab', 33.7660, 72.3609],
  ['Wah Cantt', 'Punjab', 33.7714, 72.7511],
  ['Taxila', 'Punjab', 33.7463, 72.8397],
  ['Chakwal', 'Punjab', 32.9328, 72.8531],
  ['Dera Ghazi Khan', 'Punjab', 30.0459, 70.6403],
  ['Okara', 'Punjab', 30.8138, 73.4534],
  ['Kasur', 'Punjab', 31.1156, 74.4466],
  ['Sheikhupura', 'Punjab', 31.7167, 73.9850],
  ['Murree', 'Punjab', 33.9070, 73.3943],
  ['Vehari', 'Punjab', 30.0452, 72.3489],
  ['Khanewal', 'Punjab', 30.2864, 71.9320],
  ['Jhang', 'Punjab', 31.2681, 72.3187],
  ['Mianwali', 'Punjab', 32.5839, 71.5370],
  ['Karachi', 'Sindh', 24.8607, 67.0011],
  ['Hyderabad', 'Sindh', 25.3960, 68.3578],
  ['Sukkur', 'Sindh', 27.7052, 68.8574],
  ['Larkana', 'Sindh', 27.5590, 68.2120],
  ['Nawabshah', 'Sindh', 26.2442, 68.4100],
  ['Jamshoro', 'Sindh', 25.4280, 68.2809],
  ['Mirpurkhas', 'Sindh', 25.5269, 69.0111],
  ['Khairpur', 'Sindh', 27.5295, 68.7592],
  ['Peshawar', 'KPK', 34.0151, 71.5249],
  ['Abbottabad', 'KPK', 34.1688, 73.2215],
  ['Mardan', 'KPK', 34.1989, 72.0231],
  ['Swat', 'KPK', 35.2227, 72.4258],
  ['Mingora', 'KPK', 34.7795, 72.3601],
  ['Topi', 'KPK', 34.0706, 72.6214],
  ['Swabi', 'KPK', 34.1202, 72.4702],
  ['Kohat', 'KPK', 33.5889, 71.4429],
  ['Dera Ismail Khan', 'KPK', 31.8315, 70.9017],
  ['Mansehra', 'KPK', 34.3302, 73.1968],
  ['Haripur', 'KPK', 33.9946, 72.9106],
  ['Nowshera', 'KPK', 34.0153, 71.9747],
  ['Bannu', 'KPK', 32.9861, 70.6041],
  ['Quetta', 'Balochistan', 30.1798, 66.9750],
  ['Gwadar', 'Balochistan', 25.1264, 62.3225],
  ['Khuzdar', 'Balochistan', 27.8116, 66.6104],
  ['Turbat', 'Balochistan', 26.0023, 63.0504],
  ['Muzaffarabad', 'AJK', 34.3700, 73.4711],
  ['Mirpur', 'AJK', 33.1484, 73.7519],
  ['Gilgit', 'Gilgit-Baltistan', 35.9208, 74.3080],
  ['Skardu', 'Gilgit-Baltistan', 35.2971, 75.6333],
  ['Hunza', 'Gilgit-Baltistan', 36.3167, 74.6500],
];

const PROVINCE_CENTERS = {
  punjab: [31.1704, 72.7097],
  sindh: [25.8943, 68.5247],
  kpk: [34.9526, 72.3311],
  khyberpakhtunkhwa: [34.9526, 72.3311],
  kp: [34.9526, 72.3311],
  balochistan: [28.4907, 65.0958],
  baluchistan: [28.4907, 65.0958],
  islamabad: [33.6844, 73.0479],
  ict: [33.6844, 73.0479],
  federal: [33.6844, 73.0479],
  gilgitbaltistan: [35.8026, 74.9832],
  gb: [35.8026, 74.9832],
  ajk: [33.9259, 73.7810],
  azadkashmir: [33.9259, 73.7810],
  azadjammuandkashmir: [33.9259, 73.7810],
};

export const normPlace = (value) => String(value || '').toLowerCase().replace(/[^a-z]/g, '');

export function locateCity(city, province) {
  const key = normPlace(city);
  const rows = PAKISTAN_CITIES.map(([name, prov, lat, lng]) => ({ name, prov, lat, lng, key: normPlace(name) }));
  const exact = rows.find((row) => row.key === key);
  const fuzzy = exact || rows.find((row) => key && (key.includes(row.key) || row.key.includes(key)));
  if (fuzzy) return { lat: fuzzy.lat, lng: fuzzy.lng, label: fuzzy.name };
  const provinceKey = normPlace(province);
  const center = PROVINCE_CENTERS[provinceKey];
  if (center) return { lat: center[0], lng: center[1], label: city || province || 'Pakistan' };
  return { lat: 30.3753, lng: 69.3451, label: city || 'Pakistan' };
}

export function haversineKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function groupUniversitiesByCity(universities) {
  const groups = new Map();
  for (const university of universities) {
    const city = university.city || 'Pakistan';
    if (!groups.has(city)) {
      const point = locateCity(city, university.province);
      groups.set(city, {
        city,
        province: university.province || '',
        lat: point.lat,
        lng: point.lng,
        universities: [],
      });
    }
    groups.get(city).universities.push(university);
  }
  return [...groups.values()];
}

/** The student's city comes first, then the nearest other cities. */
export function sortCitiesNear(groups, studentCity) {
  if (!studentCity) return groups;
  const origin = locateCity(studentCity);
  const studentKey = normPlace(studentCity);
  return [...groups].sort((a, b) => {
    const aHome = normPlace(a.city) === studentKey ? 0 : 1;
    const bHome = normPlace(b.city) === studentKey ? 0 : 1;
    if (aHome !== bHome) return aHome - bHome;
    return haversineKm(origin, a) - haversineKm(origin, b);
  });
}
