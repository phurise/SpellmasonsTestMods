import { Mod } from '../../types/commonTypes';

//units
import EvilCaster from './entity/units/EvilCaster';

//cards
import Sap from './cards/Sap';
import Exhaust from './cards/Exhaust'
import Pain from './cards/Pain'

//mod export
const bmBaddies: Mod = {
    modName: 'buttmuncher\'s baddies',
    author: 'buttmuncher',
    description: "Adds some more spells and units the game.",
    screenshot: 'spellmasons-mods/ButtmunchersBaddies/graphics/skip_turn.png',
    units: [
        EvilCaster
    ],
    spells: [
        Sap,
        Exhaust,
        Pain
    ],
    spritesheet: '/src/DevelopmentMods/bmBaddies/sheet3.json'
};
export default bmBaddies;