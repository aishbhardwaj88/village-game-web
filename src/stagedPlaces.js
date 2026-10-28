/**
 * Data table of the STAGING YARD places (see src/stagingYard.js). Slot n sits at x = 320 + 80 * (n % 6), z = -160 + 80 * floor(n / 6).
 * Add a place by appending ONE line here (and its Blender build + model file): the anchor, map inset, Visit-place list and zone
 * registration all derive from this table. `boards` are in the place's own metres (front = +z).
 */
export const STAGED_PLACES = [
  { id: 'yard_school', zone: 'primary_school_v2', model: 'primary_school', en: 'Yard 1: Primary school', hi: 'यार्ड 1: प्राथमिक पाठशाला', kind: 'school', radius: 28, build: 80, front: 16.25,
    boards: [{ id: 'school_v2', x: 0, y: 3.52, z: 16.23, w: 4.9 }, { id: 'school_donation', x: 5.85, y: 1.1, z: 16.37, w: 3.4 }] },
  { id: 'yard_gurukul', zone: 'gurukul_v2', model: 'gurukul_v2', en: 'Yard 2: Gurukul', hi: 'यार्ड 2: गुरुकुल', kind: 'school', radius: 40, build: 80, front: 22.5,
    boards: [{ id: 'gurukul_v2', x: 0, y: 4.93, z: 22.66, w: 4.8 }] },
  { id: 'yard_dairy', zone: 'dudh_dairy_v2', model: 'dudh_dairy_v2', en: 'Yard 3: Dudh dairy', hi: 'यार्ड 3: दूध डेयरी', kind: 'shop', radius: 20, build: 50, front: 6,
    cattle: [{ x: 4.6, z: -3.4, rotationY: Math.PI }, { x: 7.2, z: -3.4, rotationY: Math.PI - 0.15, buffalo: true }],
    boards: [{ id: 'dairy', x: -5.0, y: 3.3, z: -0.4, w: 4.4 }, { id: 'dairy_slogan', x: -8.56, y: 2.3, z: -3.85, w: 2.2, ry: -Math.PI / 2 }] },
  { id: 'yard_bus_adda', zone: 'bus_adda_v2', model: 'bus_adda_v2', en: 'Yard 4: Bus adda', hi: 'यार्ड 4: बस अड्डा', kind: 'bazaar', radius: 16, build: 45, front: 5,
    boards: [{ id: 'bus_adda', x: -9.08, y: 2.35, z: 4.1, w: 1.4, ry: Math.PI / 2 }, { id: 'bus_adda', x: -9.12, y: 2.35, z: 4.1, w: 1.4, ry: -Math.PI / 2 }] },
  { id: 'yard_chaupal', zone: 'chaupal_v2', model: 'chaupal_v2', en: 'Yard 5: Peepal chaupal', hi: 'यार्ड 5: पीपल चौपाल', kind: 'tree', radius: 20, build: 40, front: 10, boards: [] },
  { id: 'yard_volleyball', zone: 'volleyball_v2', model: 'volleyball_v2', en: 'Yard 6: Volleyball court', hi: 'यार्ड 6: वॉलीबॉल मैदान', kind: 'field', radius: 18, build: 40, front: 7.5, boards: [] },
  { id: 'yard_puncture', zone: 'puncture_v2', model: 'puncture_v2', en: 'Yard 7: Puncture shop', hi: 'यार्ड 7: पंक्चर की दुकान', kind: 'shop', radius: 10, build: 30, front: 3,
    lanterns: [{ type: 'hurricane', x: 2.1, y: 0, z: 1.3, ry: 0.2, s: 1, tint: 0xe8dccb }],
    boards: [{ id: 'puncture', x: 0, y: 2.28, z: -0.07, w: 3.0 }] },
  { id: 'yard_tubewell', zone: 'tubewell_v2', model: 'tubewell_v2', en: 'Yard 8: Tubewell and kothri', hi: 'यार्ड 8: ट्यूबवेल और कोठरी', kind: 'bridge', radius: 12, build: 35, front: 5, boards: [] },
  { id: 'yard_paani_tanki', zone: 'paani_tanki_v2', model: 'paani_tanki_v2', en: 'Yard 9: Paani ki tanki', hi: 'यार्ड 9: पानी की टंकी', kind: 'bridge', radius: 22, build: 60, front: 10, boards: [] },
  { id: 'yard_ration', zone: 'ration_shop_v2', model: 'ration_shop_v2', en: 'Yard 10: Ration shop', hi: 'यार्ड 10: राशन की दुकान', kind: 'shop', radius: 12, build: 35, front: 3.5,
    lanterns: [{ type: 'hurricane', x: 1.6, y: 0, z: 1.4, ry: 0.5, s: 1, tint: 0xf2ead8 }, { type: 'tin', x: -2.4, y: 0, z: 1.5, ry: 2.2, s: 1, tint: 0xe6dccb }],
    boards: [{ id: 'ration_v2', x: -0.65, y: 3.95, z: 0.08, w: 2.6 }] },
  { id: 'yard_post', zone: 'post_office_v2', model: 'post_office_v2', en: 'Yard 11: Post office', hi: 'यार्ड 11: डाकघर', kind: 'house', radius: 14, build: 35, front: 3.5,
    lanterns: [{ type: 'hurricane', x: -1.9, y: 0, z: 1.6, ry: 3.6, s: 1, tint: 0xf0e6d2 }],
    boards: [{ id: 'post_v2', x: 0, y: 2.75, z: 2.16, w: 2.6 }] },
  { id: 'yard_chakki', zone: 'atta_chakki_v2', model: 'atta_chakki_v2', en: 'Yard 12: Atta chakki', hi: 'यार्ड 12: आटा चक्की', kind: 'shop', radius: 12, build: 35, front: 3.5,
    lanterns: [{ type: 'tin', x: 1.7, y: 0, z: 1.4, ry: 1.1, s: 1, tint: 0xeadfcc }, { type: 'hurricane', x: -2.0, y: 0, z: 1.5, ry: 4.0, s: 1, tint: 0xf4ecdc }],
    boards: [{ id: 'chakki_v2', x: 0, y: 3.05, z: 0.04, w: 2.4 }] },
  { id: 'yard_petrol', zone: 'petrol_pump_v2', model: 'petrol_pump_v2', en: 'Yard 13: Petrol pump', hi: 'यार्ड 13: पेट्रोल पंप', kind: 'bazaar', radius: 26, build: 55, front: 12,
    boards: [{ id: 'petrol_v2', x: -13.0, y: 5.3, z: 8.7, w: 2.2 }] },
  { id: 'yard_panchayat', zone: 'panchayat_v2', model: 'panchayat_v2', en: 'Yard 14: Panchayat bhavan', hi: 'यार्ड 14: पंचायत भवन', kind: 'house', radius: 18, build: 45, front: 13,
    boards: [{ id: 'panchayat_v2', x: 0, y: 4.55, z: 0.08, w: 2.6 }] },
  { id: 'yard_tvhouse', zone: 'tv_house_v2', model: 'tv_house_v2', en: 'Yard 15: TV house', hi: 'यार्ड 15: टीवी वाला घर', kind: 'house', radius: 14, build: 45, front: 7.5, boards: [] },
  { id: 'yard_bhatta', zone: 'bhatta_v2', model: 'bhatta_v2', en: 'Yard 16: Bhatta (brick kiln)', hi: 'यार्ड 16: ईंट भट्ठा', kind: 'bazaar', radius: 40, build: 90, front: 25, boards: [] },
  { id: 'yard_khel', zone: 'khel_maidan_v2', model: 'khel_maidan_v2', en: 'Yard 17: Khel maidan', hi: 'यार्ड 17: खेल मैदान', kind: 'field', radius: 36, build: 80, front: 25, boards: [] },
  { id: 'yard_khalihan', zone: 'khalihan_v2', model: 'khalihan_v2', en: 'Yard 18: Khalihan', hi: 'यार्ड 18: खलिहान', kind: 'field', radius: 20, build: 50, front: 15, boards: [] },
  { id: 'yard_dharam_kanta', zone: 'dharam_kanta_v2', model: 'dharam_kanta_v2', en: 'Yard 19: Dharam kanta', hi: 'यार्ड 19: धर्म कांटा', kind: 'bazaar', radius: 16, build: 45, front: 5, boards: [] },
  { id: 'yard_akhada', zone: 'akhada_v2', model: 'akhada_v2', en: 'Yard 20: Akhada', hi: 'यार्ड 20: अखाड़ा', kind: 'field', radius: 16, build: 45, front: 10, boards: [] },
  { id: 'yard_houses', zone: 'houses_kit_v2', custom: 'houseKit', model: '', en: 'Yard 21: Village houses kit (A-H)', hi: 'यार्ड 21: गाँव के घर (A-H)', kind: 'house', radius: 40, build: 80, front: 20, boards: [] },
  { id: 'yard_matboard', zone: 'material_board_v2', model: 'material_board_v2', en: 'Yard 22: Material board', hi: 'यार्ड 22: सामग्री बोर्ड', kind: 'house', radius: 14, build: 45, front: 12, boards: [] },
];

const STEP = 80, X0 = 320, Z0 = -160, COLS = 6;
export const stagingPos = (n) => ({ x: X0 + STEP * (n % COLS), z: Z0 + STEP * Math.floor(n / COLS) });
