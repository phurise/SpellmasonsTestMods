import { Modifier } from '../../../../cards/util';
import type { UnitSource } from '../../../../entity/units';
import floatingText from '../../../../graphics/FloatingText';
import { CardCategory } from '../../../../types/commonTypes';
import Underworld from '../../../../Underworld';

const {
  cards,
  Projectile,
  rangedAction,
  commonTypes,
  config,
  JPromise,
  JAudio,
  Unit,
  PixiUtils,
  ParticleCollection,
  MultiColorReplaceFilter,
} = globalThis.SpellmasonsAPI;

const { createVisualLobbingProjectile } = Projectile;
const { getBestRangedLOSTarget, rangedLOSMovement } = rangedAction;
const { UnitSubType } = commonTypes;
const { addPixiSpriteAnimated, containerUnits } = PixiUtils;

export const CASTER_ID = 'Evil Caster';
const projectilePath = 'portal';
const explosionDamage = 1;
const explosion_radius = 140;
const manaCostToCast = 15;
const manaPerTurn = 30;
const mana = 60;
const unit: UnitSource = {
  id: CASTER_ID,
  info: {
    description: 'Commits acts of evil.',
    image: 'poisIdle',
    subtype: UnitSubType.RANGED_LOS,
  },
  unitProps: {
    attackRange: 500,
    mana: mana,
    manaCostToCast: manaCostToCast,
    manaPerTurn: manaPerTurn,
    damage: 0,
    healthMax: 80,
    bloodColor: 0x5126c7
  },
  spawnParams: {
    probability: 65,
    budgetCost: 3,
    unavailableUntilLevelIndex: 3,
  },
  animations: {
    idle: 'poisIdle',
    hit: 'poisHit',
    attack: 'poisAttack',
    die: 'poisDeath',
    walk: 'poisWalk',
  },
  sfx: {
    damage: 'poisonerHurt',
    death: 'poisonerDeath'
  },
  init: (unit: Unit.IUnit, _underworld: Underworld) => {
    if (unit.image && unit.image.sprite && unit.image.sprite.filters) {
      unit.image.sprite.filters.push(
        new MultiColorReplaceFilter(
          [
            [0x866262, 0x5126c7], //skinLight
            [0x7c5353, 0x5126c7], //skinMedium
            [0x603232, 0x5126c7], //skinDark
            [0x838d9f, 0x5126c7], //loin cloth
            [0x3fc7c2, 0x5126c7], // feathers 
          ],
          1.0
        )
      );
    }
  },
  action: async (unit: Unit.IUnit, attackTargets: Unit.IUnit[] | undefined, underworld: Underworld, _canAttackTarget: boolean) => {
    // Archer just checks attackTarget, not canAttackTarget to know if it can attack because getBestRangedLOSTarget() will return undefined
    // if it can't attack any targets
    const attackTarget = attackTargets && attackTargets[0];
    // Get all targets but the first which will be hit by the explosion.  This is determined from within getUnitAttackTargets
    const explosionTargets = attackTargets ? attackTargets.slice(1) : [];

    let didAction = false;
    //change all effects to AOE
    const playerTargetedAbilities = {
      pain: (a: IUnit) => { // deal damage to units 
        const dmg = a.health * 0.26;
        Unit.takeDamage({ unit: a, amount: dmg, fromVec2: attackTarget }, underworld, false);
      },
      exhaust: (a: IUnit) => { // drain stamina, should happen on player turn so make spell/modifier
        Unit.addModifier(a, "Exhaust", underworld, false, 1);
        a.stamina -= a.stamina;
        Unit.syncPlayerHealthManaUI(underworld);
      },
      sap: (a: IUnit) => { // drain mana:  (manaValue * 0.25) + 1 | move to modifier probably
        Unit.addModifier(a, "Sap", underworld, false, 1);
      },
      hex: async (a: IUnit) => { //  random curse, fix so that all are AOE
        const fx = cards.allModifiers;
        const cs = cards.allCards;
        for (const c in cs) {
          const crd = cs[c];
          if (
            //try to balance
            crd?.category === CardCategory.Curses &&
            !["Ensnare", "Pacify", "Caltrops", "freeze", "Poison 2", "Poison 3", "Cursify", "Soul Shard", "Skip Turn", "Sap", "Exhaust"].includes(crd?.id)) {
            console.log(crd?.id);
            Unit.addModifier(attackTarget, crd.id, underworld, false, 1);
          }
        };
      }
    }
    const unitTargetedAbilities = { //set a targeting order, like if no merge targets then try steal summons, if not then cast some other
      makeEmBig: (a: IUnit) => { // increase targets max hp & size: (targetHP * 0.25) + (caster's manaValue * 0.8) hp, size

      },
      makeEmStrong: (a: IUnit) => { // give targets dmg increase: playerHP * 0.12

      },
      makeEmFast: (a: IUnit) => { // give targets more range and stamina: 25 range, 20 max stamina

      },
      mergeWeakUnits: (a: IUnit) => { // find target, get target type, combine all selected tartgets into one large guy, foreach hp/dmg/mana += 12

      },
      stealPlayerSummons: (a: IUnit) => { // mergeWeakUnits targetting but steals them

      }
    }
    // Attack
    if ((attackTarget) && (unit.mana >= manaCostToCast)) {
      // get rand ability
      const keys = Object.keys(playerTargetedAbilities) as (keyof typeof playerTargetedAbilities)[];
      const randomIndex = Math.floor(Math.random() * keys.length);
      const randomKey = keys[randomIndex];
      // Archers attack or move, not both; so clear their existing path
      unit.path = undefined;
      Unit.orient(unit, attackTarget);
      await Unit.playComboAnimation(unit, unit.animations.attack, () => {
        return createVisualLobbingProjectile(
          unit,
          attackTarget,
          projectilePath,
        ).then(() => {
          JAudio.playSFXKey('poisonerProjectileHit');
          //choose ability from set
          if (randomKey) {
            playerTargetedAbilities[randomKey](attackTarget);
            //playerTargetedAbilities.sap(attackTarget)
          }
          //Unit.takeDamage({ unit: attackTarget, amount: unit.damage, fromVec2: unit, thinBloodLine: true }, underworld, false);
          ParticleCollection.makeNova(attackTarget, 1, 0x090024, 0x7d52ff, false);
          // Await the resolution of the forcePushes before moving on
          return JPromise.raceTimeout(3000, 'evil caster push', Promise.all(explosionTargets.map(u => {
            // Push units away from exploding unit
            return SpellmasonsAPI.forcePushAwayFrom(unit, attackTarget, 1, underworld, false);
          })));
        });
      });
      unit.mana -= manaCostToCast;
      didAction = true;
    } else {
      // If it gets to this block it means it is either out of range or cannot see enemy
      await rangedLOSMovement(unit, underworld);
    }
  },
  getUnitAttackTargets: (unit: Unit.IUnit, underworld: Underworld) => {
    const targets = getBestRangedLOSTarget(unit, underworld);
    const target = targets[0];
    if (target) {
      const explosionTargets = underworld.getUnitsWithinDistanceOfTarget(
        target,
        explosion_radius,
        false
      );
      return [target, ...explosionTargets];
    } else {
      return [];
    }
  }
};

export default unit;