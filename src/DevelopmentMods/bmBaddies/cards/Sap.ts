/// <reference path="../../globalTypes.d.ts" />
import { quantityWithUnit } from '../../../cards/util';
import Underworld from '../../types/Underworld';
import type { Spell } from '../../types/cards/index';
import { IUnit } from '../../types/entity/Unit';
import { Vec2 } from '../../types/jmath/Vec';

const {
    particleEmitter,
    Particles,
    PixiUtils,
    cardUtils,
    commonTypes,
    cards,
    cardsUtil,
    FloatingText,
    ParticleCollection
} = globalThis.SpellmasonsAPI;
const BURNING_RAGE_PARTICLE_EMITTER_NAME = 'BURNING_RAGE';

function makeBurningRageParticles(follow: Vec2, underworld: Underworld, prediction: boolean) {
    if (prediction || globalThis.headless) {
        // Don't show if just a prediction or running on the server (globalThis.headless)
        return;
    }
    const texture = Particles.createParticleTexture();
    if (!texture) {
        Particles.logNoTextureWarning('makeBurningRageParticles');
        return;
    }
    const particleConfig =
        particleEmitter.upgradeConfig({
            autoUpdate: true,
            "alpha": {
                "start": 1,
                "end": 0
            },
            "scale": {
                "start": 1,
                "end": 0.25,
                "minimumScaleMultiplier": 1
            },
            "color": {
                "start": "#9e1818",
                "end": "#ffee00"
            },
            "speed": {
                "start": 20,
                "end": 60,
                "minimumSpeedMultiplier": 1
            },
            "acceleration": {
                "x": 0,
                "y": -50
            },
            "maxSpeed": 0,
            "startRotation": {
                "min": 265,
                "max": 275
            },
            "noRotation": false,
            "rotationSpeed": {
                "min": 0,
                "max": 0
            },
            "lifetime": {
                "min": 1,
                "max": 1.5
            },
            "blendMode": "normal",
            "frequency": 0.45,
            "emitterLifetime": -1,
            "maxParticles": 20,
            "pos": {
                "x": 0,
                "y": 0
            },
            "addAtBack": false,
            "spawnType": "circle",
            "spawnCircle": {
                "x": 0,
                "y": 0,
                "r": 25
            }
        }, [texture]);
    if (PixiUtils.containerUnits) {
        const wrapped = Particles.wrappedEmitter(particleConfig, PixiUtils.containerUnits);
        if (wrapped) {
            const { container, emitter } = wrapped;
            // @ts-ignore adding name prop to identify emitter for later removal
            emitter.name = BURNING_RAGE_PARTICLE_EMITTER_NAME;
            underworld.particleFollowers.push({
                displayObject: container,
                emitter,
                target: follow
            })
        } else {
            console.error('Failed to create BurnigRage particle emitter');
        }
    } else {
        return;
    }
    //Particles.simpleEmitter(position, config, () => { }, Particles.containerParticlesUnderUnits);
}

const { refundLastSpell } = cards;
const Unit = globalThis.SpellmasonsAPI.Unit;
const { playDefaultSpellSFX } = cardUtils;
const { CardCategory, probabilityMap, CardRarity } = commonTypes;

const cardId = 'Pain';
const spell: Spell = {
    card: {
        id: cardId,
        category: CardCategory.Curses,
        supportQuantity: true,
        manaCost: 30,
        healthCost: 0,
        expenseScaling: 30,
        probability: probabilityMap[CardRarity.FORBIDDEN],
        thumbnail: 'spellmasons-mods/ButtmunchersBaddies/graphics/pain.png',
        sfx: 'poison',
        description: [`Lose health at the end of your turn, based on missing health.`],
        effect: async (state, card, quantity, underworld, prediction) => {
            //Only filter unit thats are alive
            const targets = state.targetedUnits.filter(u => u.alive);
            //Refund if targets no one that can attack
            if (targets.length == 0) {
                refundLastSpell(state, prediction, 'No target, mana refunded')
            } else {
                if (!prediction) {
                    playDefaultSpellSFX(card, prediction);
                }
                for (let unit of targets) {
                    unit.addModifier(unit, cardId, underworld, prediction, quantity);
                }
            }
            if (!prediction && !globalThis.headless) {
                await new Promise((resolve) => {
                    setTimeout(resolve, 100);
                })
            }
            return state;
        },
    },
    modifiers: {
        add,
        remove,
    },
    events: {
        onTurnStart: async (unit: IUnit, underworld, prediction) => {
            // do stuff
            const modifier = unit.modifiers[cardId];
            if (modifier && !prediction && unit.mana >= 1) {
                unit.mana -= unit.mana;
                unit.syncPlayerHealthManaUI(underworld, prediction);
                FloatingText.default({
                    coords: unit,
                    text: `Pain`,
                    style: { fill: 'red', strokeThickness: 1 }
                });

            }
        },
        onTurnEnd: async (unit: IUnit, underworld, prediction) => {
            // do stuff
            Unit.removeModifier(unit, cardId, underworld);

        }
    }
}
function add(unit: IUnit, underworld: Underworld, prediction: boolean, quantity: number) {
    cardsUtil.getOrInitModifier(unit, cardId, {
        isCurse: true, quantity, persistBetweenLevels: false,
    }, () => {
        SpellmasonsAPI.Unit.addEvent(unit, cardId);
        makeBurningRageParticles(unit, underworld, prediction);
    });
}
function remove(unit: IUnit, underworld: Underworld) {
    for (let follower of underworld.particleFollowers) {
        if (follower.emitter.name === BURNING_RAGE_PARTICLE_EMITTER_NAME && follower.target == unit) {
            // Remove emitter
            ParticleCollection.stopAndDestroyForeverEmitter(follower.emitter);
            break;
        }
    }
}

export default spell;