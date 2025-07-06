import { Mod } from '../types/commonTypes';
import bmBaddies from './bmBaddies/bmBaddies';

const developmentMods: Mod[] = [
    bmBaddies
    // Attention Modder!
    // Add your in-progress mod here.
    // See Modding.md for more information
];

// Development mods are only available during
// local development.  See "Publishing Your Mod"
// in Modding.md if you want to make your mod public
if (location.href.includes('localhost')) {
    console.log("Development mods: ON");
    globalThis.mods = exists(globalThis.mods) ? [...globalThis.mods, ...developmentMods] : developmentMods;
}

export default developmentMods;