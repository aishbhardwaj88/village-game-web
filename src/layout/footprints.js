/**
 * Footprints of the EXISTING places (the ones that keep their model and only move), in the model's own frame:
 * [minX, maxX, minZ, maxZ] metres about the anchor, before the anchor yaw is applied. The whole site counts (yard, compound,
 * open ground), because nothing new may be built on it either.
 *
 * Source: the model's own bounds where one exists (the .glb read with gltf-transform, 21 Nov: tmp/glb-bbox.mjs) or the
 * fit box of docs/asset-slots.md; otherwise the owner's 1 Nov map shapes (docs/layout/village-plan-positions-2026-11-01.json) taken back into each place's
 * own turned frame (the game turns these models by the same map turn), widened where the built model is larger than her
 * outline (named per line). `open: true` = open ground with no built front (fields, grounds, water): no front test.
 * Points with no footprint (labels, the chemist/manihari points) are absent.
 */
export const EXISTING_FOOTPRINTS = {
  house: { box: [-9.3, 9.2, -7.9, 7.3] }, // house_compound.glb bounds
  school: { box: [-15.4, 15.3, -14.5, 12.5] }, // school_compound.glb bounds
  halwai: { box: [-3.4, 2.6, -3.3, 4.2] }, // halwai_compound.glb bounds
  teastall: { box: [-2.7, 2.4, -1.6, 2.0] }, // tea_stall.glb bounds
  store: { box: [-2.1, 2.1, -1.7, 2.5] }, // general_store.glb bounds
  bazaar: { box: [-18.3, 18.3, -4.4, 2.9], row: true }, // bazaar_row.glb bounds (shops open toward local -z)
  post: { box: [-5.5, 5.5, -8, 3.5] }, // post_office_v2.glb bounds
  ration: { box: [-4, 4, -6, 4.2] }, // ration_shop_v2.glb bounds
  chakki: { box: [-4.5, 4.5, -6, 4.2] }, // atta_chakki_v2.glb bounds
  temple: { box: [-6.7, 10, -5.2, 5.2] }, // temple.glb bounds
  field: { box: [-60, 60, -45, 45], open: true }, // src/field.js: field centre +-60 x, +-45 z (its tractor loop)
  banta: { box: [-1.9, 1.9, -0.9, 0.9] }, // fit box 3.8 x 1.8
  chaat: { box: [-2.35, 2.35, -1.5, 1.5] }, // fit box 4.7 x 3.0
  jalebi: { box: [-2.1, 2.1, -1.3, 1.3] }, // fit box 4.2 x 2.6
  dairy: { box: [-9, 10.7, -6, 6] }, // dudh_dairy_v2.glb bounds
  khalihan: { box: [-15, 15, -12, 12], open: true },
  tubewell: { box: [-6, 6.1, -5.1, 5] }, // tubewell_v2.glb bounds
  gaushala: { box: [-13.8, 13.6, -10.8, 11.4] }, // gaushala.glb bounds
  pond: { box: [-13, 13, -13, 13], open: true }, // src/dips.js: water R 9.6 with a wobbling outline, bank to u 1.25
  anganwadi: { box: [-5.3, 5.3, -4.85, 4.85] }, // docs/asset-slots.md fit box 10.6 x 9.7
  mela: { box: [-10, 19.4, -13, 13.5], open: true }, // src/farmSites.js createMelaGround: shamiana, stage, benches, swing, stalls (the 62 x 53 m fit box was the old open-ground outline)
  gurudwara: { box: [-5, 5, -3.6, 7.4] }, // createGurudwara: 9.2 x 7.2 hall + porch and steps to the front (fit box 11 deep)
  tvhouse: { box: [-8, 8, -12, 7.5] }, // tv_house_v2.glb bounds
  health: { box: [-4.8, 4.8, -2.85, 5] }, // createHealthSubCentre: 9.2 x 5.7 block + verandah to z 5
  sabzi: { box: [-4.95, 4.95, -1.4, 0.9] }, // createSabziRehris: three carts + tarp poles
  johad: { box: [-7, 7, -7, 7], open: true }, // src/dips.js: water R 5.4, bank to u 1.32
  masjid: { box: [-5.8, 4.1, -3.6, 3.6] }, // createMasjid: 8.2 x 7.2 hall + the minaret at x -5.2
  chemist: { box: [-2.4, 2.4, -2.9, 2.9] }, // fit box 4.8 x 5.8 (standalone again on the approved map)
  manihari: { box: [-2.6, 2.6, -0.9, 0.9] }, // fit box 5.2 x 1.8
  jain: { box: [-3.7, 3.7, -3.7, 4.8] }, // createJainMandir: 7.4 x 7.4 + front steps (fit box depth 9.6)
  haveli: { box: [-16, 16, -10, 14.2] }, // src/farmSites.js createOldHaveli: 20 x 20 m ranges + the front yard walls to x +-16, z 14.15
  gurukul: { box: [-30.5, 30.5, -22.6, 23.1] }, // gurukul_v2.glb bounds (grounds included)
  maidan: { box: [-24, 24, -24, 24], open: true }, // the same ground as yard_khel
  mandi: { box: [-18.6, 18.6, -37, 37] }, // the built yard is 74 m long (src/anchors.js), her outline 58 m
  yard_bus_adda: { box: [-10, 11.1, -5, 5] }, // bus_adda_v2.glb bounds
  yard_chaupal: { box: [-10, 10, -10, 10] }, // chaupal_v2.glb bounds
  yard_volleyball: { box: [-12, 12, -7.5, 7.5], open: true },
  yard_puncture: { box: [-4, 4, -3.1, 3] }, // puncture_v2.glb bounds
  yard_paani_tanki: { box: [-10.2, 10.2, -10.2, 10.3] }, // paani_tanki_v2.glb bounds
  yard_petrol: { box: [-17, 17, -8, 16] }, // petrol_pump_v2.glb bounds
  yard_panchayat: { box: [-9, 9, -11.5, 13] }, // panchayat_v2.glb bounds
  yard_bhatta: { box: [-40, 40, -25, 25] }, // bhatta_v2.glb bounds
  yard_akhada: { box: [-11, 11, -10, 10], open: true },
  yard_dharam_kanta: { box: [-12, 12, -13, 7] }, // dharam_kanta_v2.glb bounds
  gilli: { box: [-8, 8, -7, 7], open: true },
};
