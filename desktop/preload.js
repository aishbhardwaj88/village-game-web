/**
 * Dopahar desktop preload (sandboxed, context isolation on). Exposes exactly one read-only object to the game:
 *   window.dopaharDesktop = { edition: 'desktop', version: '<app version>' }
 * src/edition.js reads it to pick the 'full' quality preset. Nothing else from the computer is reachable by the page.
 */
'use strict';

const { contextBridge } = require('electron');

const arg = process.argv.find((a) => a.startsWith('--dopahar-version='));
const version = arg ? arg.slice('--dopahar-version='.length) : '0.0.0';

contextBridge.exposeInMainWorld('dopaharDesktop', Object.freeze({ edition: 'desktop', version }));
