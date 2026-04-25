import { world, system, EntityDamageCause } from "@minecraft/server";

// SECTION: Crowbar Constants
const CROWBAR_ITEM_ID = "brr:crowbar";
const CROWBAR_DAMAGE = 5;
const CROWBAR_COOLDOWN_TICKS = 10;
const CROWBAR_HOLD_ATTACK_INTERVAL_TICKS = 10;
const CROWBAR_REACH = 4;
const CROWBAR_HIT_RADIUS = 1;
const CROWBAR_HIT_SOUNDS = [
    "weapons.crowbar.hit1",
    "weapons.crowbar.hit2",
    "weapons.crowbar.hit3"
];
const CROWBAR_MISS_SOUNDS = [
    "weapons.crowbar.miss1",
    "weapons.crowbar.miss2",
    "weapons.crowbar.miss3"
];

// SECTION: Crowbar Runtime State
const cooldownUntilTickByPlayer = new Map();
const heldUseByPlayer = new Map();
const nextHeldAttackTickByPlayer = new Map();

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

function isHoldingCrowbar(player) {
    return getMainhandTypeId(player) === CROWBAR_ITEM_ID;
}

// SECTION: Hit Detection
function lengthOf(vector) {
    return Math.sqrt((vector.x * vector.x) + (vector.y * vector.y) + (vector.z * vector.z));
}

function normalize(vector) {
    const vectorLength = lengthOf(vector);
    if (!Number.isFinite(vectorLength) || vectorLength <= 0.000001) {
        return { x: 0, y: 0, z: 1 };
    }

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
        x: Number(location.x) || 0,
        y: (Number(location.y) || 0) + 1.62,
        z: Number(location.z) || 0
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

function isDamageableTarget(target, attacker) {
    if (!target?.id || target.id === attacker?.id) return false;

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

function findCrowbarHitTarget(player) {
    const origin = getAimPoint(player);

    let direction;
    try {
        direction = normalize(player.getViewDirection());
    } catch {
        return null;
    }

    let entities = [];
    try {
        entities = player.dimension.getEntities({
            location: origin,
            maxDistance: CROWBAR_REACH + 1.5
        });
    } catch {
        entities = [];
    }

    let closestHit = null;

    for (const target of entities) {
        if (!isDamageableTarget(target, player)) continue;

        const targetPoint = getAimPoint(target);
        const toTarget = subtract(targetPoint, origin);
        const forwardDistance = dot(toTarget, direction);

        if (!Number.isFinite(forwardDistance) || forwardDistance <= 0 || forwardDistance > CROWBAR_REACH) {
            continue;
        }

        const nearestOnRay = add(origin, scale(direction, forwardDistance));
        const lateralDistance = lengthOf(subtract(targetPoint, nearestOnRay));
        if (lateralDistance > CROWBAR_HIT_RADIUS) continue;

        if (!closestHit || forwardDistance < closestHit.distance) {
            closestHit = {
                entity: target,
                distance: forwardDistance
            };
        }
    }

    return closestHit?.entity ?? null;
}

// SECTION: Damage and Audio
function applyCrowbarDamage(attacker, target) {
    if (!attacker?.id || !target?.id) return false;

    try {
        target.applyDamage(CROWBAR_DAMAGE, {
            cause: EntityDamageCause.entityAttack,
            damagingEntity: attacker
        });
        return true;
    } catch { }

    if (!isPlayerEntity(target)) return false;

    try {
        attacker.runCommand(`damage @a[name=\"${target.name}\",c=1] ${CROWBAR_DAMAGE} entity_attack entity @s`);
        return true;
    } catch {
        return false;
    }
}

function playSwingSound(player, didHit) {
    if (!player?.id) return;

    const soundPool = didHit ? CROWBAR_HIT_SOUNDS : CROWBAR_MISS_SOUNDS;

    const index = Math.floor(Math.random() * soundPool.length);
    const soundId = soundPool[index] ?? soundPool[0];

    try {
        player.playSound(soundId, { pitch: 1, volume: 1 });
        return;
    } catch { }

    try {
        player.runCommand(`playsound ${soundId} @s ~ ~ ~ 1 1`);
    } catch { }
}

// SECTION: Input Helpers
function handleCrowbarSwing(player) {
    if (!player?.id || !isHoldingCrowbar(player)) return;

    const tick = getCurrentTick();
    const cooldownUntil = cooldownUntilTickByPlayer.get(player.id) ?? -1;
    if (tick < cooldownUntil) return;

    cooldownUntilTickByPlayer.set(player.id, tick + CROWBAR_COOLDOWN_TICKS);

    const target = findCrowbarHitTarget(player);
    const didHit = !!target && applyCrowbarDamage(player, target);
    playSwingSound(player, didHit);
}

function beginHeldUse(player) {
    if (!player?.id || !isHoldingCrowbar(player)) return;
    heldUseByPlayer.set(player.id, true);
    nextHeldAttackTickByPlayer.set(player.id, getCurrentTick());
}

function endHeldUse(player) {
    if (!player?.id) return;
    heldUseByPlayer.delete(player.id);
    nextHeldAttackTickByPlayer.delete(player.id);
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

// SECTION: Event Wiring
world.afterEvents.playerSwingStart.subscribe((eventData) => {
    const player = eventData?.player ?? eventData?.source ?? eventData?.sourceEntity;
    if (!isPlayerEntity(player)) return;

    handleCrowbarSwing(player);
});

world.afterEvents.itemUse.subscribe((eventData) => {
    const player = getEventSourcePlayer(eventData);
    if (!isPlayerEntity(player)) return;

    const itemTypeId = getEventItemTypeId(eventData);
    if (itemTypeId !== CROWBAR_ITEM_ID && !isHoldingCrowbar(player)) return;
    if (heldUseByPlayer.has(player.id)) return;

    handleCrowbarSwing(player);
});

world.afterEvents.itemStartUse.subscribe((eventData) => {
    const player = getEventSourcePlayer(eventData);
    if (!isPlayerEntity(player)) return;

    const itemTypeId = getEventItemTypeId(eventData);
    if (itemTypeId !== CROWBAR_ITEM_ID && !isHoldingCrowbar(player)) return;

    beginHeldUse(player);
});

world.afterEvents.itemStopUse.subscribe((eventData) => {
    const player = getEventSourcePlayer(eventData);
    if (!isPlayerEntity(player)) return;

    endHeldUse(player);
});

world.afterEvents.itemReleaseUse.subscribe((eventData) => {
    const player = getEventSourcePlayer(eventData);
    if (!isPlayerEntity(player)) return;

    endHeldUse(player);
});

// SECTION: Runtime Tick
system.runInterval(() => {
    const tick = getCurrentTick();
    const onlinePlayerIds = new Set();

    for (const player of world.getPlayers()) {
        if (!player?.id) continue;
        onlinePlayerIds.add(player.id);

        if (!isHoldingCrowbar(player)) {
            endHeldUse(player);
            continue;
        }

        if (heldUseByPlayer.has(player.id)) {
            const nextHeldTick = nextHeldAttackTickByPlayer.get(player.id) ?? 0;
            if (tick >= nextHeldTick) {
                handleCrowbarSwing(player);
                nextHeldAttackTickByPlayer.set(player.id, tick + CROWBAR_HOLD_ATTACK_INTERVAL_TICKS);
            }
        }
    }

    for (const playerId of cooldownUntilTickByPlayer.keys()) {
        if (!onlinePlayerIds.has(playerId)) {
            cooldownUntilTickByPlayer.delete(playerId);
            continue;
        }

        const expiresAt = cooldownUntilTickByPlayer.get(playerId);
        if (!Number.isFinite(expiresAt) || (tick - expiresAt) > 40) {
            cooldownUntilTickByPlayer.delete(playerId);
        }
    }

    for (const playerId of heldUseByPlayer.keys()) {
        if (!onlinePlayerIds.has(playerId)) {
            heldUseByPlayer.delete(playerId);
            nextHeldAttackTickByPlayer.delete(playerId);
        }
    }
}, 1);
