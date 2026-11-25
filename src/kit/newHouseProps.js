import { NEW_HOUSES, NEW_HOUSE_ROADS } from './houses.js';
import { plantSitesFor, furnitureSitesFor } from './newHouseSites.js';
/** Doorstep sites for the new-map houses; the logic and the road rule live in newHouseSites.js (pure, so tools/road-clearance-props.mjs runs the same code). */
export const newHousePlantSites = () => plantSitesFor(NEW_HOUSES, NEW_HOUSE_ROADS.idx);
export const newHouseFurnitureSites = () => furnitureSitesFor(NEW_HOUSES, NEW_HOUSE_ROADS.idx);
