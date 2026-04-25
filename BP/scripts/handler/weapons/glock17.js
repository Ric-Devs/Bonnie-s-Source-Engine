import { world, system, EntityDamageCause, ItemStack } from "@minecraft/server";

// SECTION: Glock Constants
const GLOCK_ITEM_ID = "brr:glock17";
const GLOCK_EMPTY_ITEM_ID = "brr:glock17_empty";
const GLOCK_AMMO_ITEM_ID = "brr:9mmclip";

const GLOCK_DAMAGE = 2;
const GLOCK_MAG_SIZE = 17;
const GLOCK_MAX_DISTANCE = 48;
const GLOCK_HIT_RADIUS = 0.85;
const AUTO_FIRE_ROUNDS_PER_SECOND = 3;
const AUTO_FIRE_INTERVAL_TICKS = 20 / AUTO_FIRE_ROUNDS_PER_SECOND;
const MIN_SHOT_INTERVAL_TICKS = 1;
const RELOAD_LOCK_TICKS = 50;

const EMPTY_SOUND = "weapons.glock.empty";
const FIRE_SOUND = "weapons.glock.fire";
const RELOAD_SOUND = "weapons.glock.reload";
const RELOAD_EMPTY_SOUND = "weapons.glock.reload_empty";
const DRAW_ADMIRE_SOUND = "weapons.glock.draw_admire";
const IDLE_FIDGET_SOUND = "weapons.glock.idle_fidget";

const EMPTY_SOUND_COOLDOWN_TICKS = 8;
const IDLE_FIDGET_MIN_INTERVAL_TICKS = 200;
const IDLE_FIDGET_MAX_INTERVAL_TICKS = 340;
const HUD_UPDATE_INTERVAL_TICKS = 2;

// SECTION: Glock Runtime State
const autoFireStateByPlayer = new Map();
const lastShotTickByPlayer = new Map();
const reloadUntilTickByPlayer = new Map();
const pendingReloadByPlayer = new Map();
const loadedRoundsByPlayer = new Map();
const lastEmptySoundTickByPlayer = new Map();
const lastMainhandTypeByPlayer = new Map();
const nextIdleFidgetSoundTickByPlayer = new Map();
const lastAmmoHudTextByPlayer = new Map();
const lastAmmoHudTickByPlayer = new Map();

// SECTION: Shared Helpers
function getCurrentTick() {
    try {
        const tick = Number(system?.currentTick);
        if (Number.isFinite(tick) && tick >= 0) return tick;
    } catch { }

    try {
        return Number.parseInt(`${world.getAbsoluteTime?.() ?? 0}`, 10) || 0;
    } catch {
        return 0;
    }
}

function getEventSourcePlayer(eventData) {
    return eventData?.source
        ?? eventData?.sourceEntity
        ?? eventData?.player
        ?? eventData?.damagingEntity;
}

function getEventItemTypeId(eventData) {
    return `${eventData?.itemStack?.typeId ?? eventData?.item?.typeId ?? ""}`.trim().toLowerCase();
}

function isPlayerEntity(entity) {
    return `${entity?.typeId ?? ""}`.trim().toLowerCase() === "minecraft:player";
}

function getMainhandTypeId(player) {
    try {
        const equipment = player.getComponent("minecraft:equippable");
        return `${equipment?.getEquipment("Mainhand")?.typeId ?? ""}`.trim().toLowerCase();
    } catch {
        return "";
    }
}

function isGlockTypeId(typeId) {
    const normalized = `${typeId ?? ""}`.trim().toLowerCase();
    return normalized === GLOCK_ITEM_ID
        || normalized === GLOCK_EMPTY_ITEM_ID;
}

function isHoldingGlock(player) {
    return isGlockTypeId(getMainhandTypeId(player));
}

function isSneaking(player) {
    try {
        return !!player?.isSneaking;
    } catch {
        return false;
    }
}

function setMainhandType(player, itemTypeId) {
    if (!player?.id || !itemTypeId) return false;

    try {
        const equippable = player.getComponent("minecraft:equippable");
        if (!equippable) return false;
        equippable.setEquipment("Mainhand", new ItemStack(itemTypeId, 1));
        return true;
    } catch {
        return false;
    }
}

function playSoundForPlayer(player, soundId) {
    if (!player?.id || !soundId) return;

    try {
        player.playSound(soundId, { pitch: 1, volume: 1 });
        return;
    } catch { }

    try {
        player.runCommand(`playsound ${soundId} @s ~ ~ ~ 1 1`);
    } catch { }
}

// SECTION: Ammo and Reload Helpers
function getLoadedRounds(player) {
    if (!player?.id) return 0;

    const cached = loadedRoundsByPlayer.get(player.id);
    if (Number.isFinite(cached)) return Math.max(0, Math.min(GLOCK_MAG_SIZE, Math.floor(cached)));

    loadedRoundsByPlayer.set(player.id, GLOCK_MAG_SIZE);
    return GLOCK_MAG_SIZE;
}

function syncGlockItemVariant(player) {
    if (!player?.id) return;

    const mainhandTypeId = getMainhandTypeId(player);
    if (!isGlockTypeId(mainhandTypeId)) return;

    const pendingReload = pendingReloadByPlayer.get(player.id);
    if (pendingReload && (getCurrentTick() < pendingReload.completeTick)) return;

    const rounds = getLoadedRounds(player);
    const expectedTypeId = rounds <= 0 ? GLOCK_EMPTY_ITEM_ID : GLOCK_ITEM_ID;
    if (mainhandTypeId === expectedTypeId) return;

    setMainhandType(player, expectedTypeId);
}

function setLoadedRounds(player, rounds) {
    if (!player?.id) return;
    loadedRoundsByPlayer.set(player.id, Math.max(0, Math.min(GLOCK_MAG_SIZE, Math.floor(rounds))));
    syncGlockItemVariant(player);
}

function canShootNow(player, tick) {
    if (!player?.id) return false;

    const reloadUntil = reloadUntilTickByPlayer.get(player.id) ?? -1;
    if (tick < reloadUntil) return false;

    const lastShotTick = lastShotTickByPlayer.get(player.id) ?? -999999;
    if ((tick - lastShotTick) < MIN_SHOT_INTERVAL_TICKS) return false;

    return true;
}

function tryPlayEmptySound(player, tick) {
    if (!player?.id) return;

    const lastTick = lastEmptySoundTickByPlayer.get(player.id) ?? -999999;
    if ((tick - lastTick) < EMPTY_SOUND_COOLDOWN_TICKS) return;

    lastEmptySoundTickByPlayer.set(player.id, tick);
    playSoundForPlayer(player, EMPTY_SOUND);
}

function getRandomIntInclusive(minValue, maxValue) {
    const min = Math.floor(minValue);
    const max = Math.floor(maxValue);
    return min + Math.floor(Math.random() * ((max - min) + 1));
}

function findAmmoInInventory(player) {
    try {
        const inventory = player.getComponent("minecraft:inventory");
        if (!inventory?.container) return null;

        const container = inventory.container;
        for (let i = 0; i < container.size; i++) {
            const item = container.getItem(i);
            if (!item || item.typeId !== GLOCK_AMMO_ITEM_ID) continue;

            const durability = item.getComponent("minecraft:durability");
            if (!durability) continue;

            const available = durability.maxDurability - durability.damage;
            if (available <= 0) continue;

            return { slotIndex: i, container, itemStack: item, durabilityComponent: durability, available };
        }
    } catch { }

    return null;
}

function consumeReserveAmmo(player, roundsNeeded) {
    let remaining = Math.max(0, Math.floor(roundsNeeded));
    if (remaining <= 0) return 0;

    let consumed = 0;
    while (remaining > 0) {
        const ammo = findAmmoInInventory(player);
        if (!ammo) break;

        const take = Math.min(remaining, ammo.available);
        ammo.durabilityComponent.damage += take;

        if (ammo.durabilityComponent.damage >= ammo.durabilityComponent.maxDurability) {
            ammo.container.setItem(ammo.slotIndex, undefined);
        } else {
            ammo.container.setItem(ammo.slotIndex, ammo.itemStack);
        }

        consumed += take;
        remaining -= take;
    }

    return consumed;
}

function getReserveAmmoTotal(player) {
    try {
        const inventory = player.getComponent("minecraft:inventory");
        if (!inventory?.container) return 0;

        const container = inventory.container;
        let total = 0;

        for (let i = 0; i < container.size; i++) {
            const item = container.getItem(i);
            if (!item || item.typeId !== GLOCK_AMMO_ITEM_ID) continue;

            const durability = item.getComponent("minecraft:durability");
            if (!durability) continue;

            total += Math.max(0, durability.maxDurability - durability.damage);
        }

        return total;
    } catch {
        return 0;
    }
}

function updateAmmoHud(player, tick) {
    if (!player?.id || !isHoldingGlock(player)) return;

    const lastHudTick = lastAmmoHudTickByPlayer.get(player.id) ?? -999999;
    if ((tick - lastHudTick) < HUD_UPDATE_INTERVAL_TICKS) return;

    const loadedRounds = getLoadedRounds(player);
    const reserveRounds = getReserveAmmoTotal(player);
    const hudText = `${loadedRounds}/${GLOCK_MAG_SIZE} | ${reserveRounds} 9mm`;
    const previousText = lastAmmoHudTextByPlayer.get(player.id) ?? "";

    if (hudText === previousText) {
        lastAmmoHudTickByPlayer.set(player.id, tick);
        return;
    }

    try {
        player.onScreenDisplay?.setActionBar(hudText);
        lastAmmoHudTextByPlayer.set(player.id, hudText);
        lastAmmoHudTickByPlayer.set(player.id, tick);
    } catch { }
}

function tryReload(player) {
    if (!player?.id || !isHoldingGlock(player)) return false;

    const tick = getCurrentTick();
    const reloadUntil = reloadUntilTickByPlayer.get(player.id) ?? -1;
    if (tick < reloadUntil) return false;

    const currentRounds = getLoadedRounds(player);
    if (currentRounds >= GLOCK_MAG_SIZE) return false;

    const roundsNeeded = GLOCK_MAG_SIZE - currentRounds;
    const consumed = consumeReserveAmmo(player, roundsNeeded);
    if (consumed <= 0) {
        tryPlayEmptySound(player, tick);
        return false;
    }

    pendingReloadByPlayer.set(player.id, {
        roundsToAdd: consumed,
        completeTick: tick + RELOAD_LOCK_TICKS
    });
    reloadUntilTickByPlayer.set(player.id, tick + RELOAD_LOCK_TICKS);
    playSoundForPlayer(player, currentRounds <= 0 ? RELOAD_EMPTY_SOUND : RELOAD_SOUND);
    return true;
}

// SECTION: Shot Geometry Helpers
function lengthOf(vector) {
    return Math.sqrt((vector.x * vector.x) + (vector.y * vector.y) + (vector.z * vector.z));
}

function normalize(vector) {
    const vectorLength = lengthOf(vector);
    if (vectorLength <= 0.000001) return { x: 0, y: 0, z: 1 };

    return {
        x: vector.x / vectorLength,
        y: vector.y / vectorLength,
        z: vector.z / vectorLength
    };
}

function add(a, b) {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function subtract(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scale(vector, scalar) {
    return {
        x: vector.x * scalar,
        y: vector.y * scalar,
        z: vector.z * scalar
    };
}

function dot(a, b) {
    return (a.x * b.x) + (a.y * b.y) + (a.z * b.z);
}

function getHeadLocation(entity) {
    try {
        if (typeof entity?.getHeadLocation === "function") {
            return entity.getHeadLocation();
        }
    } catch { }

    const location = entity?.location ?? { x: 0, y: 0, z: 0 };
    return {
        x: location.x,
        y: location.y + 1.62,
        z: location.z
    };
}

function getAimPoint(entity) {
    const head = getHeadLocation(entity);
    return {
        x: head.x,
        y: head.y - 0.2,
        z: head.z
    };
}

function isDamageableTarget(target, shooter) {
    if (!target || target.id === shooter?.id) return false;

    const typeId = `${target.typeId ?? ""}`.trim().toLowerCase();
    if (!typeId) return false;

    if (typeId === "minecraft:item"
        || typeId === "minecraft:xp_orb"
        || typeId === "minecraft:arrow"
        || typeId === "minecraft:snowball"
        || typeId === "minecraft:egg") {
        return false;
    }

    try {
        return !!target.getComponent("minecraft:health");
    } catch {
        return false;
    }
}

function getFirstBlockingBlockHit(dimension, origin, direction, maxDistance) {
    try {
        return dimension.getBlockFromRay(origin, direction, {
            maxDistance,
            includePassableBlocks: false,
            includeLiquidBlocks: false
        });
    } catch {
        return null;
    }
}

function getDistanceToFirstBlockingBlock(dimension, origin, direction, maxDistance) {
    const hit = getFirstBlockingBlockHit(dimension, origin, direction, maxDistance);
    const distance = Number(hit?.distance);
    if (Number.isFinite(distance) && distance >= 0) {
        return Math.max(0, distance - 0.05);
    }

    return maxDistance;
}

function findEntityHit(shooter, origin, direction, maxDistance) {
    let closestHit = null;
    let entities = [];

    try {
        entities = shooter.dimension.getEntities({
            location: origin,
            maxDistance: maxDistance + 2
        });
    } catch {
        entities = [];
    }

    for (const target of entities) {
        if (!isDamageableTarget(target, shooter)) continue;

        const targetPoint = getAimPoint(target);
        const toTarget = subtract(targetPoint, origin);
        const forwardDistance = dot(toTarget, direction);

        if (!Number.isFinite(forwardDistance) || forwardDistance <= 0 || forwardDistance > maxDistance) {
            continue;
        }

        const nearestOnRay = add(origin, scale(direction, forwardDistance));
        const lateralDistance = lengthOf(subtract(targetPoint, nearestOnRay));
        if (lateralDistance > GLOCK_HIT_RADIUS) continue;

        if (!closestHit || forwardDistance < closestHit.distance) {
            closestHit = {
                entity: target,
                distance: forwardDistance
            };
        }
    }

    return closestHit;
}

function applyShotDamage(shooter, target) {
    if (!shooter?.id || !target?.id) return false;

    try {
        target.applyDamage(GLOCK_DAMAGE, {
            cause: EntityDamageCause.entityAttack,
            damagingEntity: shooter
        });
        return true;
    } catch { }

    if (!isPlayerEntity(target)) return false;

    try {
        shooter.runCommand(`damage @a[name=\"${target.name}\",c=1] ${GLOCK_DAMAGE} entity_attack entity @s`);
        return true;
    } catch {
        return false;
    }
}

function fireGlockShot(player) {
    if (!player?.id || !isHoldingGlock(player)) return false;

    const tick = getCurrentTick();
    if (!canShootNow(player, tick)) {
        return false;
    }

    const loadedRounds = getLoadedRounds(player);
    if (loadedRounds <= 0) {
        tryPlayEmptySound(player, tick);
        return false;
    }

    lastShotTickByPlayer.set(player.id, tick);
    setLoadedRounds(player, loadedRounds - 1);
    playSoundForPlayer(player, FIRE_SOUND);

    let viewDirection;
    try {
        viewDirection = normalize(player.getViewDirection());
    } catch {
        return false;
    }

    const origin = getAimPoint(player);
    const blockDistance = getDistanceToFirstBlockingBlock(
        player.dimension,
        origin,
        viewDirection,
        GLOCK_MAX_DISTANCE
    );

    const hit = findEntityHit(player, origin, viewDirection, blockDistance);
    if (!hit?.entity) return true;

    applyShotDamage(player, hit.entity);
    return true;
}

// SECTION: Input Helpers
function beginAutoFire(player) {
    if (!player?.id || !isHoldingGlock(player)) return;

    if (isSneaking(player)) {
        stopAutoFire(player);
        tryReload(player);
        return;
    }

    const tick = getCurrentTick();
    const firedNow = fireGlockShot(player);

    autoFireStateByPlayer.set(player.id, {
        nextShotTick: firedNow ? (tick + AUTO_FIRE_INTERVAL_TICKS) : tick
    });
}

function stopAutoFire(player) {
    if (!player?.id) return;
    autoFireStateByPlayer.delete(player.id);
}

// SECTION: Event Wiring
world.afterEvents.itemUse.subscribe((eventData) => {
    const player = getEventSourcePlayer(eventData);
    if (!isPlayerEntity(player)) return;

    const itemTypeId = getEventItemTypeId(eventData);
    if (!isGlockTypeId(itemTypeId) && !isHoldingGlock(player)) return;

    if (isSneaking(player)) {
        tryReload(player);
    }
});

world.afterEvents.itemStartUse.subscribe((eventData) => {
    const player = getEventSourcePlayer(eventData);
    if (!isPlayerEntity(player)) return;

    const itemTypeId = getEventItemTypeId(eventData);
    if (!isGlockTypeId(itemTypeId) && !isHoldingGlock(player)) return;

    beginAutoFire(player);
});

world.afterEvents.itemStopUse.subscribe((eventData) => {
    const player = getEventSourcePlayer(eventData);
    if (!isPlayerEntity(player)) return;

    stopAutoFire(player);
});

world.afterEvents.itemReleaseUse.subscribe((eventData) => {
    const player = getEventSourcePlayer(eventData);
    if (!isPlayerEntity(player)) return;

    stopAutoFire(player);
});

// SECTION: Runtime Tick
system.runInterval(() => {
    const tick = getCurrentTick();
    const onlinePlayerIds = new Set();

    for (const player of world.getPlayers()) {
        if (!player?.id) continue;
        onlinePlayerIds.add(player.id);

        const pendingReload = pendingReloadByPlayer.get(player.id);
        if (pendingReload && tick >= pendingReload.completeTick) {
            pendingReloadByPlayer.delete(player.id);
            setLoadedRounds(player, getLoadedRounds(player) + pendingReload.roundsToAdd);
        }

        const mainhandTypeId = getMainhandTypeId(player);
        const previousMainhandTypeId = lastMainhandTypeByPlayer.get(player.id) ?? "";

        if (!isGlockTypeId(previousMainhandTypeId) && isGlockTypeId(mainhandTypeId)) {
            if (Math.random() < 0.12) {
                playSoundForPlayer(player, DRAW_ADMIRE_SOUND);
            }
            nextIdleFidgetSoundTickByPlayer.set(
                player.id,
                tick + getRandomIntInclusive(IDLE_FIDGET_MIN_INTERVAL_TICKS, IDLE_FIDGET_MAX_INTERVAL_TICKS)
            );
        }
        lastMainhandTypeByPlayer.set(player.id, mainhandTypeId);

        if (isGlockTypeId(mainhandTypeId)) {
            syncGlockItemVariant(player);
        }

        if (!isHoldingGlock(player)) {
            autoFireStateByPlayer.delete(player.id);
            if (isGlockTypeId(previousMainhandTypeId)) {
                try {
                    player.onScreenDisplay?.setActionBar("");
                } catch { }
                lastAmmoHudTextByPlayer.delete(player.id);
                lastAmmoHudTickByPlayer.delete(player.id);
            }
            continue;
        }

        updateAmmoHud(player, tick);

        if (!autoFireStateByPlayer.has(player.id)
            && !isSneaking(player)
        ) {
            const nextFidgetTick = nextIdleFidgetSoundTickByPlayer.get(player.id)
                ?? (tick + IDLE_FIDGET_MIN_INTERVAL_TICKS);
            if (tick >= nextFidgetTick) {
                if (Math.random() < 0.15) {
                    playSoundForPlayer(player, IDLE_FIDGET_SOUND);
                }
                nextIdleFidgetSoundTickByPlayer.set(
                    player.id,
                    tick + getRandomIntInclusive(IDLE_FIDGET_MIN_INTERVAL_TICKS, IDLE_FIDGET_MAX_INTERVAL_TICKS)
                );
            }
        }

        if (isSneaking(player)) {
            autoFireStateByPlayer.delete(player.id);
            continue;
        }

        const autoFireState = autoFireStateByPlayer.get(player.id);
        if (!autoFireState) continue;

        if (tick >= autoFireState.nextShotTick) {
            const fired = fireGlockShot(player);
            autoFireState.nextShotTick = fired
                ? (autoFireState.nextShotTick + AUTO_FIRE_INTERVAL_TICKS)
                : (tick + 1);
            autoFireStateByPlayer.set(player.id, autoFireState);
        }
    }

    for (const playerId of autoFireStateByPlayer.keys()) {
        if (!onlinePlayerIds.has(playerId)) {
            autoFireStateByPlayer.delete(playerId);
        }
    }

    for (const playerId of lastShotTickByPlayer.keys()) {
        if (!onlinePlayerIds.has(playerId)) {
            lastShotTickByPlayer.delete(playerId);
        }
    }

    for (const playerId of reloadUntilTickByPlayer.keys()) {
        if (!onlinePlayerIds.has(playerId)) {
            reloadUntilTickByPlayer.delete(playerId);
        }
    }

    for (const playerId of loadedRoundsByPlayer.keys()) {
        if (!onlinePlayerIds.has(playerId)) {
            loadedRoundsByPlayer.delete(playerId);
        }
    }

    for (const playerId of pendingReloadByPlayer.keys()) {
        if (!onlinePlayerIds.has(playerId)) {
            pendingReloadByPlayer.delete(playerId);
        }
    }

    for (const playerId of lastEmptySoundTickByPlayer.keys()) {
        if (!onlinePlayerIds.has(playerId)) {
            lastEmptySoundTickByPlayer.delete(playerId);
        }
    }

    for (const playerId of lastMainhandTypeByPlayer.keys()) {
        if (!onlinePlayerIds.has(playerId)) {
            lastMainhandTypeByPlayer.delete(playerId);
        }
    }

    for (const playerId of nextIdleFidgetSoundTickByPlayer.keys()) {
        if (!onlinePlayerIds.has(playerId)) {
            nextIdleFidgetSoundTickByPlayer.delete(playerId);
        }
    }

    for (const playerId of lastAmmoHudTextByPlayer.keys()) {
        if (!onlinePlayerIds.has(playerId)) {
            lastAmmoHudTextByPlayer.delete(playerId);
        }
    }

    for (const playerId of lastAmmoHudTickByPlayer.keys()) {
        if (!onlinePlayerIds.has(playerId)) {
            lastAmmoHudTickByPlayer.delete(playerId);
        }
    }
}, 1);