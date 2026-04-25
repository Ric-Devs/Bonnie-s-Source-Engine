import { world, system, EntityDamageCause, ItemStack } from "@minecraft/server";

// SECTION: Magnum Constants
const MAGNUM_ITEM_ID = "brr:magnum357";
const MAGNUM_EMPTY_ITEM_ID = "brr:magnum357_empty";
const MAGNUM_AMMO_ITEM_ID = "brr:357_ammobox";

const MAGNUM_DAMAGE = 12;
const MAGNUM_MAG_SIZE = 6;
const MAGNUM_MAX_DISTANCE = 128;
const MAGNUM_HIT_RADIUS = 0.9;
const MIN_SHOT_INTERVAL_TICKS = 6;
const RELOAD_LOCK_TICKS = 87;
const RELOAD_HOLD_THRESHOLD_TICKS = 20;

const EMPTY_SOUND = "weapons.gauss.empty";
const FIRE_SOUND = "weapons.357.fire";
const FIRE_CENTERFIRE_SOUND = "weapons.357.fire";
const RELOAD_SOUND = "weapons.357.reload";
const RELOAD_EMPTY_SOUND = "weapons.357.reload";
const DRAW_ADMIRE_SOUND = "weapons.357.draw_admire";
const IDLE_FIDGET_SOUND = "weapons.357.draw_admire";

const EMPTY_SOUND_COOLDOWN_TICKS = 8;
const IDLE_FIDGET_MIN_INTERVAL_TICKS = 200;
const IDLE_FIDGET_MAX_INTERVAL_TICKS = 340;
const HUD_UPDATE_INTERVAL_TICKS = 2;

// SECTION: Magnum Runtime State
const rightClickUseStartTickByPlayer = new Map();
const rightClickUseReloadTriggeredByPlayer = new Set();
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

function isMagnumTypeId(typeId) {
    const normalized = `${typeId ?? ""}`.trim().toLowerCase();
    return normalized === MAGNUM_ITEM_ID
        || normalized === MAGNUM_EMPTY_ITEM_ID;
}

function isHoldingMagnum(player) {
    return isMagnumTypeId(getMainhandTypeId(player));
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
    if (Number.isFinite(cached)) return Math.max(0, Math.min(MAGNUM_MAG_SIZE, Math.floor(cached)));

    loadedRoundsByPlayer.set(player.id, MAGNUM_MAG_SIZE);
    return MAGNUM_MAG_SIZE;
}

function syncMagnumItemVariant(player) {
    if (!player?.id) return;

    const mainhandTypeId = getMainhandTypeId(player);
    if (!isMagnumTypeId(mainhandTypeId)) return;

    const pendingReload = pendingReloadByPlayer.get(player.id);
    if (pendingReload && (getCurrentTick() < pendingReload.completeTick)) return;

    const rounds = getLoadedRounds(player);
    const expectedTypeId = rounds <= 0 ? MAGNUM_EMPTY_ITEM_ID : MAGNUM_ITEM_ID;
    if (mainhandTypeId === expectedTypeId) return;

    setMainhandType(player, expectedTypeId);
}

function setLoadedRounds(player, rounds) {
    if (!player?.id) return;
    loadedRoundsByPlayer.set(player.id, Math.max(0, Math.min(MAGNUM_MAG_SIZE, Math.floor(rounds))));
    syncMagnumItemVariant(player);
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
            if (!item || item.typeId !== MAGNUM_AMMO_ITEM_ID) continue;

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
            if (!item || item.typeId !== MAGNUM_AMMO_ITEM_ID) continue;

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
    if (!player?.id || !isHoldingMagnum(player)) return;

    const lastHudTick = lastAmmoHudTickByPlayer.get(player.id) ?? -999999;
    if ((tick - lastHudTick) < HUD_UPDATE_INTERVAL_TICKS) return;

    const loadedRounds = getLoadedRounds(player);
    const reserveRounds = getReserveAmmoTotal(player);
    const hudText = `${loadedRounds}/${MAGNUM_MAG_SIZE} | ${reserveRounds} .357`;
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
    if (!player?.id || !isHoldingMagnum(player)) return false;

    const tick = getCurrentTick();
    const reloadUntil = reloadUntilTickByPlayer.get(player.id) ?? -1;
    if (tick < reloadUntil) return false;

    const currentRounds = getLoadedRounds(player);
    if (currentRounds >= MAGNUM_MAG_SIZE) return false;

    const roundsNeeded = MAGNUM_MAG_SIZE - currentRounds;
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
        if (lateralDistance > MAGNUM_HIT_RADIUS) continue;

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
        target.applyDamage(MAGNUM_DAMAGE, {
            cause: EntityDamageCause.entityAttack,
            damagingEntity: shooter
        });
        return true;
    } catch { }

    if (!isPlayerEntity(target)) return false;

    try {
        shooter.runCommand(`damage @a[name=\"${target.name}\",c=1] ${MAGNUM_DAMAGE} entity_attack entity @s`);
        return true;
    } catch {
        return false;
    }
}

function fireMagnumShot(player) {
    if (!player?.id || !isHoldingMagnum(player)) return false;

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
    playSoundForPlayer(player, isSneaking(player) ? FIRE_CENTERFIRE_SOUND : FIRE_SOUND);

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
        MAGNUM_MAX_DISTANCE
    );

    const hit = findEntityHit(player, origin, viewDirection, blockDistance);
    if (!hit?.entity) return true;

    applyShotDamage(player, hit.entity);
    return true;
}

// SECTION: Input Helpers
function beginRightClickUse(player) {
    if (!player?.id || !isHoldingMagnum(player)) return;
    rightClickUseStartTickByPlayer.set(player.id, getCurrentTick());
    rightClickUseReloadTriggeredByPlayer.delete(player.id);
}

function cancelRightClickUse(player) {
    if (!player?.id) return;
    rightClickUseStartTickByPlayer.delete(player.id);
    rightClickUseReloadTriggeredByPlayer.delete(player.id);
}

function finalizeRightClickUse(player) {
    if (!player?.id) return;

    const startTick = rightClickUseStartTickByPlayer.get(player.id);
    if (!Number.isFinite(startTick)) return;

    rightClickUseStartTickByPlayer.delete(player.id);
    const reloadTriggered = rightClickUseReloadTriggeredByPlayer.has(player.id);
    rightClickUseReloadTriggeredByPlayer.delete(player.id);

    if (!isHoldingMagnum(player)) return;

    const heldTicks = getCurrentTick() - startTick;
    if (reloadTriggered || heldTicks >= RELOAD_HOLD_THRESHOLD_TICKS) {
        return;
    }

    fireMagnumShot(player);
}

// SECTION: Event Wiring
world.afterEvents.itemStartUse.subscribe((eventData) => {
    const player = getEventSourcePlayer(eventData);
    if (!isPlayerEntity(player)) return;

    const itemTypeId = getEventItemTypeId(eventData);
    if (!isMagnumTypeId(itemTypeId) && !isHoldingMagnum(player)) return;

    beginRightClickUse(player);
});

world.afterEvents.itemStopUse.subscribe((eventData) => {
    const player = getEventSourcePlayer(eventData);
    if (!isPlayerEntity(player)) return;

    finalizeRightClickUse(player);
});

world.afterEvents.itemReleaseUse.subscribe((eventData) => {
    const player = getEventSourcePlayer(eventData);
    if (!isPlayerEntity(player)) return;

    finalizeRightClickUse(player);
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

        if (!isMagnumTypeId(previousMainhandTypeId) && isMagnumTypeId(mainhandTypeId)) {
            playSoundForPlayer(player, DRAW_ADMIRE_SOUND);
            nextIdleFidgetSoundTickByPlayer.set(
                player.id,
                tick + getRandomIntInclusive(IDLE_FIDGET_MIN_INTERVAL_TICKS, IDLE_FIDGET_MAX_INTERVAL_TICKS)
            );
        }
        lastMainhandTypeByPlayer.set(player.id, mainhandTypeId);

        if (isMagnumTypeId(mainhandTypeId)) {
            syncMagnumItemVariant(player);
        }

        if (!isHoldingMagnum(player)) {
            cancelRightClickUse(player);
            if (isMagnumTypeId(previousMainhandTypeId)) {
                try {
                    player.onScreenDisplay?.setActionBar("");
                } catch { }
                lastAmmoHudTextByPlayer.delete(player.id);
                lastAmmoHudTickByPlayer.delete(player.id);
            }
            continue;
        }

        updateAmmoHud(player, tick);

        const rightClickStartTick = rightClickUseStartTickByPlayer.get(player.id);
        if (Number.isFinite(rightClickStartTick)
            && !rightClickUseReloadTriggeredByPlayer.has(player.id)
            && (tick - rightClickStartTick) >= RELOAD_HOLD_THRESHOLD_TICKS) {
            const reloadStarted = tryReload(player);
            if (reloadStarted) {
                rightClickUseReloadTriggeredByPlayer.add(player.id);
            }
        }

        if (!isSneaking(player)) {
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
    }

    for (const playerId of rightClickUseStartTickByPlayer.keys()) {
        if (!onlinePlayerIds.has(playerId)) {
            rightClickUseStartTickByPlayer.delete(playerId);
        }
    }

    for (const playerId of rightClickUseReloadTriggeredByPlayer.keys()) {
        if (!onlinePlayerIds.has(playerId)) {
            rightClickUseReloadTriggeredByPlayer.delete(playerId);
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