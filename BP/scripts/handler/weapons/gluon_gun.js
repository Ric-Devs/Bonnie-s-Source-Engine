import { world, system, EntityDamageCause } from "@minecraft/server";
import { renderGluonBeamVisual } from "./gluon_beam_visual.js";
import { consumeAmmo, getAmmoRemaining, playEmptySound } from "./ammo_system.js";

// SECTION: Gluon Constants
const GLUON_ITEM_ID = "brr:gluon_gun";
const GLUON_AURA_PARTICLE = "brr:gluon_beam_aura";
const GLUON_CORE_PARTICLE = "brr:gluon_beam_core";
const GLUON_ARC_PARTICLE = "brr:gluon_beam_arc";
const GLUON_TRAIL_PARTICLE = "brr:gluon_beam_trail";
const GLUON_SPARK_PARTICLE = "brr:gluon_beam_particle";
const GLUON_FALLBACK_PARTICLE = "minecraft:basic_flame_particle";
const GLUON_FIRE_START_SOUND = "weapons.egon_fire_start";
const GLUON_FIRE_SOUND = "weapons.egon_fire";
const GLUON_FIRE_END_SOUND = "weapons.egon_fire_end";
const GLUON_HIT_SOUNDS = [
    "weapons.egon_hit1",
    "weapons.egon_hit2",
    "weapons.egon_hit3",
    "weapons.egon_hit4",
    "weapons.egon_hit5"
];
const FIRE_LOOP_START_DELAY_TICKS = 6;
const FIRE_LOOP_INTERVAL_TICKS = 165;
const HIT_SOUND_INTERVAL_TICKS = 2;
const MAX_BEAM_DISTANCE = 64;
const LASER_POINT_FORWARD_OFFSET = 0.72;
const LASER_POINT_RIGHT_OFFSET = 0.4;
const LASER_POINT_UP_OFFSET = -0.4;
const MOVE_WOBBLE_MAX_RIGHT_OFFSET = 0.8;
const MOVE_WOBBLE_FULL_SPEED = 0.5;
const MOVE_WOBBLE_TIME_SCALE = 1;
const MOVE_WOBBLE_STRAFE_BIAS = 0.2;
const MOVE_WOBBLE_SMOOTHING = 0.24;
const BEAM_HIT_RADIUS = 2;
const FIRE_PULSE_TICKS = 3;
const DAMAGE_PER_PULSE = 20;
const DAMAGE_INTERVAL_TICKS = 1;
const USE_HOLD_THRESHOLD_TICKS = 3;
const GLUON_KILL_EFFECT_WINDOW_TICKS = 8;
const GLUON_DISINTEGRATE_PASSES = 6;
const GLUON_DISINTEGRATE_PASS_INTERVAL_TICKS = 2;
const GLUON_DISINTEGRATE_PARTICLES_PER_PASS = 18;
const DEBUG_ENABLED = false;
const DEBUG_ACTIONBAR_INTERVAL_TICKS = 6;

// SECTION: Gluon Runtime State
const activeFireStateByPlayer = new Map();
const lastDamageTickByPair = new Map();
const lastHitSoundTickByPair = new Map();
const trackedUseByPlayer = new Map();
const nextFireLoopTickByPlayer = new Map();
const movementStateByPlayer = new Map();
const recentGluonHitByTarget = new Map();
const debugLastActionbarTickByPlayer = new Map();
const debugLastEventByPlayer = new Map();

// SECTION: Shared Helpers
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

function stopSoundForPlayer(player, soundId) {
    if (!player?.id || !soundId) return;

    try {
        player.runCommand(`stopsound @s ${soundId}`);
    } catch { }
}

function playLoopedFireSound(player, tick, force = false) {
    if (!player?.id) return;

    const scheduledTick = nextFireLoopTickByPlayer.get(player.id);
    if (!force && Number.isFinite(scheduledTick) && tick < scheduledTick) {
        return;
    }

    playSoundForPlayer(player, GLUON_FIRE_SOUND);
    nextFireLoopTickByPlayer.set(player.id, tick + FIRE_LOOP_INTERVAL_TICKS);
}

function playRandomHitSound(player, tick, pairKey) {
    if (!player?.id || !pairKey) return;

    const previousTick = lastHitSoundTickByPair.get(pairKey);
    if (Number.isFinite(previousTick) && (tick - previousTick) < HIT_SOUND_INTERVAL_TICKS) {
        return;
    }

    lastHitSoundTickByPair.set(pairKey, tick);

    const randomIndex = Math.floor(Math.random() * GLUON_HIT_SOUNDS.length);
    const soundId = GLUON_HIT_SOUNDS[randomIndex] ?? GLUON_HIT_SOUNDS[0];
    playSoundForPlayer(player, soundId);
}

function getCurrentTick() {
    try {
        const tick = Number(system?.currentTick);
        if (Number.isFinite(tick) && tick >= 0) {
            return tick;
        }
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

function isEventUsingGluon(player, eventData) {
    const itemTypeId = getEventItemTypeId(eventData);
    return isGluonItem(itemTypeId) || (!itemTypeId && isHoldingGluon(player));
}

function isGluonItem(typeId) {
    return `${typeId ?? ""}`.trim().toLowerCase() === GLUON_ITEM_ID;
}

function getMainhandTypeId(player) {
    try {
        const equipment = player.getComponent("minecraft:equippable");
        return `${equipment?.getEquipment("Mainhand")?.typeId ?? ""}`.trim().toLowerCase();
    } catch {
        return "";
    }
}

function isHoldingGluon(player) {
    return isGluonItem(getMainhandTypeId(player));
}

// SECTION: Firing State Helpers
function beginFiring(player, continuous) {
    if (!player?.id) return;

    if (getAmmoRemaining(player) <= 0) {
        playEmptySound(player);
        return;
    }

    const tick = getCurrentTick();
    const alreadyFiring = activeFireStateByPlayer.has(player.id);
    if (!alreadyFiring) {
        playSoundForPlayer(player, GLUON_FIRE_START_SOUND);
        nextFireLoopTickByPlayer.set(player.id, tick + FIRE_LOOP_START_DELAY_TICKS);
    }

    activeFireStateByPlayer.set(player.id, {
        continuous,
        expireTick: continuous ? Number.MAX_SAFE_INTEGER : tick + FIRE_PULSE_TICKS
    });

    if (DEBUG_ENABLED) {
        const mode = continuous ? "hold" : "pulse";
        debugSetEvent(player, `begin(${mode})`);
    }
}

function stopFiring(player, options = {}) {
    if (!player?.id) return;
    const { playEndSound = true } = options;
    const wasFiring = activeFireStateByPlayer.has(player.id);

    activeFireStateByPlayer.delete(player.id);
    nextFireLoopTickByPlayer.delete(player.id);

    if (wasFiring) {
        stopSoundForPlayer(player, GLUON_FIRE_START_SOUND);
        stopSoundForPlayer(player, GLUON_FIRE_SOUND);
        if (playEndSound) {
            playSoundForPlayer(player, GLUON_FIRE_END_SOUND);
        }
    }

    if (DEBUG_ENABLED) {
        debugSetEvent(player, "stop");
    }
}

function beginUseTracking(player) {
    if (!player?.id) return;

    trackedUseByPlayer.set(player.id, {
        startTick: getCurrentTick(),
        continuousStarted: false
    });
}

function finishUseTracking(player) {
    if (!player?.id) return;

    const trackedUse = trackedUseByPlayer.get(player.id);
    if (!trackedUse) {
        if (activeFireStateByPlayer.has(player.id)) {
            stopFiring(player);
        }
        return;
    }

    trackedUseByPlayer.delete(player.id);

    if (trackedUse.continuousStarted) {
        stopFiring(player);
        return;
    }

    if (!isHoldingGluon(player)) return;
}

// SECTION: Debug Helpers
function debugActionbar(player, message, force = false) {
    if (!DEBUG_ENABLED || !player?.id) return;

    const tick = getCurrentTick();
    const lastTick = debugLastActionbarTickByPlayer.get(player.id) ?? -999999;
    if (!force && (tick - lastTick) < DEBUG_ACTIONBAR_INTERVAL_TICKS) {
        return;
    }

    debugLastActionbarTickByPlayer.set(player.id, tick);
    const text = `[gluon dbg] ${`${message ?? ""}`.slice(0, 180)}`;

    try {
        player.onScreenDisplay?.setActionBar(text);
        return;
    } catch { }

    try {
        player.sendMessage(text);
    } catch { }
}

function debugSetEvent(player, eventName) {
    if (!DEBUG_ENABLED || !player?.id) return;

    const label = `${eventName ?? "unknown"}`.trim() || "unknown";
    debugLastEventByPlayer.set(player.id, label);
    debugActionbar(player, `event=${label}`, true);
}

// SECTION: Beam Math and Targeting
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

function cross(a, b) {
    return {
        x: (a.y * b.z) - (a.z * b.y),
        y: (a.z * b.x) - (a.x * b.z),
        z: (a.x * b.y) - (a.y * b.x)
    };
}

function clamp(value, minValue, maxValue) {
    return Math.min(maxValue, Math.max(minValue, value));
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

function getBeamBasis(direction) {
    const forward = normalize(direction);
    const worldUp = { x: 0, y: 1, z: 0 };

    let right = normalize(cross(forward, worldUp));
    if (lengthOf(right) <= 0.000001) {
        right = { x: 1, y: 0, z: 0 };
    }

    const up = normalize(cross(right, forward));
    return { forward, right, up };
}

function getBeamOriginFromLaserPointApprox(player, direction) {
    const { forward, right, up } = getBeamBasis(direction);
    const head = getHeadLocation(player);

    // Script API cannot sample attachable locators directly, so this local-space offset
    // is tuned to the weapon muzzle locator location (laserPoint) in first-person use.
    return add(
        add(
            add(head, scale(forward, LASER_POINT_FORWARD_OFFSET)),
            scale(right, LASER_POINT_RIGHT_OFFSET)
        ),
        scale(up, LASER_POINT_UP_OFFSET)
    );
}

function getPlayerMovePhaseOffset(playerId) {
    const safeId = `${playerId ?? ""}`;
    let hash = 0;

    for (let i = 0; i < safeId.length; i++) {
        hash = ((hash * 31) + safeId.charCodeAt(i)) | 0;
    }

    return Math.abs(hash % 628) / 100;
}

function sampleHorizontalMotion(player, tick) {
    const fallbackLocation = player?.location ?? { x: 0, y: 0, z: 0 };
    const playerId = player?.id;

    if (!playerId) {
        return {
            speed: 0,
            direction: { x: 0, y: 0, z: 0 },
            movementFactor: 0
        };
    }

    const previousState = movementStateByPlayer.get(playerId) ?? {
        lastLocation: {
            x: fallbackLocation.x,
            y: fallbackLocation.y,
            z: fallbackLocation.z
        },
        lastTick: tick,
        smoothedSpeed: 0,
        phaseOffset: getPlayerMovePhaseOffset(playerId)
    };

    const currentLocation = player.location ?? previousState.lastLocation;
    const elapsedTicks = Math.max(1, tick - (previousState.lastTick ?? tick));

    let horizontal = { x: 0, y: 0, z: 0 };
    let speed = 0;

    try {
        const velocity = player.getVelocity?.();
        if (velocity
            && Number.isFinite(velocity.x)
            && Number.isFinite(velocity.z)) {
            horizontal = { x: velocity.x, y: 0, z: velocity.z };
            speed = Math.sqrt((horizontal.x * horizontal.x) + (horizontal.z * horizontal.z));
        }
    } catch { }

    if (speed <= 0.0001) {
        const dx = currentLocation.x - previousState.lastLocation.x;
        const dz = currentLocation.z - previousState.lastLocation.z;
        speed = Math.sqrt((dx * dx) + (dz * dz)) / elapsedTicks;
        horizontal = { x: dx, y: 0, z: dz };
    }

    const smoothedSpeed = (previousState.smoothedSpeed * (1 - MOVE_WOBBLE_SMOOTHING)) + (speed * MOVE_WOBBLE_SMOOTHING);
    const movementFactor = clamp(smoothedSpeed / MOVE_WOBBLE_FULL_SPEED, 0, 1);
    const direction = speed > 0.0001 ? normalize(horizontal) : { x: 0, y: 0, z: 0 };

    movementStateByPlayer.set(playerId, {
        lastLocation: {
            x: currentLocation.x,
            y: currentLocation.y,
            z: currentLocation.z
        },
        lastTick: tick,
        smoothedSpeed,
        phaseOffset: previousState.phaseOffset
    });

    return {
        speed: smoothedSpeed,
        direction,
        movementFactor,
        phaseOffset: previousState.phaseOffset
    };
}

function getMovementWobbleRightOffset(player, aimDirection, tick) {
    const movement = sampleHorizontalMotion(player, tick);
    if (movement.movementFactor <= 0.0001) {
        return {
            rightOffset: 0,
            movementFactor: 0
        };
    }

    const { right } = getBeamBasis(aimDirection);

    const oscillation = Math.sin((tick * MOVE_WOBBLE_TIME_SCALE) + movement.phaseOffset)
        * MOVE_WOBBLE_MAX_RIGHT_OFFSET
        * movement.movementFactor;

    const strafeBias = dot(movement.direction, right)
        * MOVE_WOBBLE_STRAFE_BIAS
        * movement.movementFactor;

    return {
        rightOffset: oscillation + strafeBias,
        movementFactor: movement.movementFactor
    };
}

function getLookTarget(shooter) {
    let viewDirection = null;
    try {
        viewDirection = normalize(shooter.getViewDirection());
    } catch {
        return null;
    }

    const viewOrigin = getAimPoint(shooter);

    const blockDistance = getDistanceToFirstBlockingBlock(
        shooter.dimension,
        viewOrigin,
        viewDirection,
        MAX_BEAM_DISTANCE
    );

    const entityHit = findEntityHit(shooter, viewOrigin, viewDirection, blockDistance);
    const lookDistance = entityHit ? entityHit.distance : blockDistance;
    const targetPoint = add(viewOrigin, scale(viewDirection, Math.max(0.05, lookDistance)));

    return {
        viewDirection,
        targetPoint
    };
}

function getDirectionToTarget(origin, targetPoint, fallbackDirection) {
    const toTarget = subtract(targetPoint, origin);
    const toTargetLength = lengthOf(toTarget);

    if (!Number.isFinite(toTargetLength) || toTargetLength <= 0.0001) {
        return normalize(fallbackDirection);
    }

    return normalize(toTarget);
}

// SECTION: Beam Damage and Effects
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

        if (lateralDistance > BEAM_HIT_RADIUS) continue;

        const blockingHit = getFirstBlockingBlockHit(shooter.dimension, origin, direction, forwardDistance);
        const blockingDistance = Number(blockingHit?.distance);
        if (Number.isFinite(blockingDistance) && blockingDistance >= 0 && blockingDistance < (forwardDistance - 0.01)) {
            continue;
        }

        if (!closestHit || forwardDistance < closestHit.distance) {
            closestHit = {
                entity: target,
                distance: forwardDistance,
                impactPoint: nearestOnRay
            };
        }
    }

    return closestHit;
}

function applyBeamDamage(shooter, target, tick) {
    if (!shooter?.id || !target?.id) return;

    const pairKey = `${shooter.id}|${target.id}`;
    playRandomHitSound(shooter, tick, pairKey);

    const previousTick = lastDamageTickByPair.get(pairKey);
    if (Number.isFinite(previousTick) && (tick - previousTick) < DAMAGE_INTERVAL_TICKS) {
        return;
    }

    lastDamageTickByPair.set(pairKey, tick);

    // Track recent hits so we can trigger disintegration particles if this hit causes death.
    try {
        const location = target.location;
        recentGluonHitByTarget.set(target.id, {
            tick,
            location: {
                x: Number(location?.x) || 0,
                y: Number(location?.y) || 0,
                z: Number(location?.z) || 0
            }
        });
    } catch { }

    try {
        target.applyDamage(DAMAGE_PER_PULSE, {
            cause: EntityDamageCause.entityAttack,
            damagingEntity: shooter
        });
        return;
    } catch { }

    if (!isPlayerEntity(target)) return;

    try {
        shooter.runCommand(`damage @a[name=\"${target.name}\",c=1] ${DAMAGE_PER_PULSE} entity_attack entity @s`);
    } catch { }
}

function randomRange(minValue, maxValue) {
    return minValue + (Math.random() * (maxValue - minValue));
}

function spawnDisintegratePass(dimension, center) {
    if (!dimension || !center) return;

    for (let i = 0; i < GLUON_DISINTEGRATE_PARTICLES_PER_PASS; i++) {
        const point = {
            x: center.x + randomRange(-0.55, 0.55),
            y: center.y + randomRange(0.05, 1.65),
            z: center.z + randomRange(-0.55, 0.55)
        };

        try {
            dimension.spawnParticle(GLUON_TRAIL_PARTICLE, point);
        } catch {
            try {
                dimension.spawnParticle(GLUON_FALLBACK_PARTICLE, point);
            } catch { }
        }

        if (Math.random() < 0.2) {
            try {
                dimension.spawnParticle(GLUON_AURA_PARTICLE, point);
            } catch { }
        }
    }
}

function startGluonDisintegrationEffect(dimension, center) {
    if (!dimension || !center) return;

    for (let pass = 0; pass < GLUON_DISINTEGRATE_PASSES; pass++) {
        system.runTimeout(() => {
            spawnDisintegratePass(dimension, center);
        }, pass * GLUON_DISINTEGRATE_PASS_INTERVAL_TICKS);
    }
}

// SECTION: Event Wiring
function subscribeAfterEvent(signalName, callback) {
    try {
        const signal = world.afterEvents?.[signalName];
        if (signal && typeof signal.subscribe === "function") {
            signal.subscribe(callback);
            return true;
        }
    } catch { }

    return false;
}

subscribeAfterEvent("itemStartUse", (eventData) => {
    const player = getEventSourcePlayer(eventData);
    if (!isPlayerEntity(player)) return;

    const itemTypeId = getEventItemTypeId(eventData);

    if (!isEventUsingGluon(player, eventData)) {
        if (isHoldingGluon(player)) {
            debugSetEvent(player, `itemStartUse(miss:${itemTypeId || "none"})`);
        }
        return;
    }

    debugSetEvent(player, `itemStartUse(${itemTypeId || "held"})`);

    beginUseTracking(player);
});

subscribeAfterEvent("itemStopUse", (eventData) => {
    const player = getEventSourcePlayer(eventData);
    if (!isPlayerEntity(player)) return;

    const itemTypeId = getEventItemTypeId(eventData);

    if (isEventUsingGluon(player, eventData) || trackedUseByPlayer.has(player.id) || activeFireStateByPlayer.has(player.id)) {
        debugSetEvent(player, `itemStopUse(${itemTypeId || "held"})`);
        finishUseTracking(player);
    }
});

subscribeAfterEvent("itemReleaseUse", (eventData) => {
    const player = getEventSourcePlayer(eventData);
    if (!isPlayerEntity(player)) return;

    const itemTypeId = getEventItemTypeId(eventData);

    if (isEventUsingGluon(player, eventData) || trackedUseByPlayer.has(player.id) || activeFireStateByPlayer.has(player.id)) {
        debugSetEvent(player, `itemReleaseUse(${itemTypeId || "held"})`);
        finishUseTracking(player);
    }
});

subscribeAfterEvent("itemUse", (eventData) => {
    const player = getEventSourcePlayer(eventData);
    if (!isPlayerEntity(player)) return;

    const itemTypeId = getEventItemTypeId(eventData);

    if (!isEventUsingGluon(player, eventData)) {
        if (isHoldingGluon(player)) {
            debugSetEvent(player, `itemUse(miss:${itemTypeId || "none"})`);
        }
        return;
    }

    debugSetEvent(player, `itemUse(${itemTypeId || "held"})`);

});

subscribeAfterEvent("itemUseOn", (eventData) => {
    const player = getEventSourcePlayer(eventData);
    if (!isPlayerEntity(player)) return;

    const itemTypeId = getEventItemTypeId(eventData);

    if (!isEventUsingGluon(player, eventData)) {
        if (isHoldingGluon(player)) {
            debugSetEvent(player, `itemUseOn(miss:${itemTypeId || "none"})`);
        }
        return;
    }

    debugSetEvent(player, `itemUseOn(${itemTypeId || "held"})`);

});

subscribeAfterEvent("playerSwingStart", (eventData) => {
    const player = getEventSourcePlayer(eventData);
    if (!isPlayerEntity(player)) return;
    if (!isHoldingGluon(player)) return;

    debugSetEvent(player, "playerSwingStart");

});

subscribeAfterEvent("entityHitEntity", (eventData) => {
    const player = getEventSourcePlayer(eventData);
    if (!isPlayerEntity(player)) return;
    if (!isHoldingGluon(player)) return;

    debugSetEvent(player, "entityHitEntity");

});

subscribeAfterEvent("entityHitBlock", (eventData) => {
    const player = getEventSourcePlayer(eventData);
    if (!isPlayerEntity(player)) return;
    if (!isHoldingGluon(player)) return;

    debugSetEvent(player, "entityHitBlock");

});

subscribeAfterEvent("playerBreakBlock", (eventData) => {
    const player = getEventSourcePlayer(eventData);
    if (!isPlayerEntity(player)) return;
    if (!isHoldingGluon(player)) return;

    debugSetEvent(player, "playerBreakBlock(after)");

});

subscribeAfterEvent("entityDie", (eventData) => {
    const deadEntity = eventData?.deadEntity;
    if (!deadEntity?.id) return;

    const marker = recentGluonHitByTarget.get(deadEntity.id);
    if (!marker) return;

    recentGluonHitByTarget.delete(deadEntity.id);

    const tick = getCurrentTick();
    if ((tick - (Number(marker.tick) || 0)) > GLUON_KILL_EFFECT_WINDOW_TICKS) return;

    let center = marker.location;
    try {
        center = deadEntity.location ?? center;
    } catch { }

    let dimension = null;
    try {
        dimension = deadEntity.dimension;
    } catch { }

    startGluonDisintegrationEffect(dimension, center);
});

// SECTION: Runtime Tick
system.runInterval(() => {
    const tick = getCurrentTick();
    const onlinePlayerIds = new Set();

    for (const player of world.getPlayers()) {
        if (!player?.id) continue;
        onlinePlayerIds.add(player.id);

        const trackedUse = trackedUseByPlayer.get(player.id);
        if (trackedUse) {
            if (!isHoldingGluon(player)) {
                trackedUseByPlayer.delete(player.id);
            } else if (!trackedUse.continuousStarted && (tick - trackedUse.startTick) >= USE_HOLD_THRESHOLD_TICKS) {
                beginFiring(player, true);
                trackedUse.continuousStarted = true;
                trackedUseByPlayer.set(player.id, trackedUse);
            }
        }

        const fireState = activeFireStateByPlayer.get(player.id);
        if (!fireState) {
            if (DEBUG_ENABLED && isHoldingGluon(player)) {
                const lastEvent = debugLastEventByPlayer.get(player.id) ?? "none";
                debugActionbar(player, `active=0 event=${lastEvent}`);
            }
            continue;
        }

        playLoopedFireSound(player, tick);

        if (!isHoldingGluon(player)) {
            stopFiring(player);
            continue;
        }

        if (!fireState.continuous && tick > fireState.expireTick) {
            // Startup/auto-expire pulses should not fire the "end" tail sound.
            stopFiring(player, { playEndSound: false });
            continue;
        }

        if (!consumeAmmo(player, 1)) {
            stopFiring(player);
            playEmptySound(player);
            continue;
        }

        const lookTarget = getLookTarget(player);
        if (!lookTarget) {
            continue;
        }

        const baseOrigin = getBeamOriginFromLaserPointApprox(player, lookTarget.viewDirection);
        const { right: baseRight } = getBeamBasis(lookTarget.viewDirection);
        const movementWobble = getMovementWobbleRightOffset(player, lookTarget.viewDirection, tick);
        const beamOrigin = add(baseOrigin, scale(baseRight, movementWobble.rightOffset));
        const direction = getDirectionToTarget(beamOrigin, lookTarget.targetPoint, lookTarget.viewDirection);

        const blockRayHit = getFirstBlockingBlockHit(player.dimension, beamOrigin, direction, MAX_BEAM_DISTANCE);
        const blockHitDistance = Number(blockRayHit?.distance);
        const hasValidBlockHit = Number.isFinite(blockHitDistance) && blockHitDistance >= 0 && blockHitDistance <= MAX_BEAM_DISTANCE;
        const blockDistance = hasValidBlockHit
            ? Math.max(0, blockHitDistance - 0.05)
            : MAX_BEAM_DISTANCE;
        const hit = findEntityHit(player, beamOrigin, direction, blockDistance);
        const beamLength = hit ? hit.distance : blockDistance;
        const hitBlockTypeId = `${blockRayHit?.block?.typeId ?? ""}`.trim().toLowerCase();
        const hasBlockStop = !hit
            && hasValidBlockHit
            && (!hitBlockTypeId || hitBlockTypeId !== "minecraft:air");
        const blockImpactPoint = hasBlockStop
            ? add(beamOrigin, scale(direction, Math.max(0, blockHitDistance - 0.02)))
            : null;

        const movementVisualSway = 0.62 + (movementWobble.movementFactor * 1.18);
        const movementVisualFrequency = 0.8 + (movementWobble.movementFactor * 0.45);
        const dynamicParticleBudget = Math.min(1400, Math.max(360, Math.ceil(beamLength * 10)));

        const beamRender = renderGluonBeamVisual({
            dimension: player.dimension,
            origin: beamOrigin,
            direction,
            length: beamLength,
            tick,
            auraParticle: GLUON_AURA_PARTICLE,
            coreParticle: GLUON_CORE_PARTICLE,
            arcParticle: GLUON_ARC_PARTICLE,
            fallbackAuraParticle: GLUON_FALLBACK_PARTICLE,
            fallbackCoreParticle: GLUON_FALLBACK_PARTICLE,
            fallbackArcParticle: GLUON_FALLBACK_PARTICLE,
            step: 0.21,
            stepGrowth: 0.55,
            strands: 3,
            ampNear: 0.11,
            ampFar: 0.52,
            spiralTightness: 1.1,
            spiralTimeScale: 0.58,
            forwardLeadNear: 0.08,
            forwardLeadFar: 0.44,
            pathWobbleNear: 0.03,
            pathWobbleFar: 0.36,
            pathSwayAmount: movementVisualSway,
            pathSwayFrequency: movementVisualFrequency,
            pathSwayTimeScale: 0.47,
            coreFollowNear: 0.02,
            coreFollowFar: 0.16,
            auraStride: 3,
            maxParticles: dynamicParticleBudget
        });

        if (!beamRender?.hasVisual) {
            try {
                player.dimension.spawnParticle(GLUON_FALLBACK_PARTICLE, beamOrigin);
            } catch { }
        }

        if (Math.random() < 0.55) {
            try {
                player.dimension.spawnParticle(GLUON_SPARK_PARTICLE, beamOrigin);
            } catch {
                try {
                    player.dimension.spawnParticle(GLUON_FALLBACK_PARTICLE, beamOrigin);
                } catch { }
            }
        }

        if (DEBUG_ENABLED) {
            const lastEvent = debugLastEventByPlayer.get(player.id) ?? "none";
            const hasVisual = beamRender?.hasVisual ? 1 : 0;
            debugActionbar(player, `active=1 len=${beamLength.toFixed(1)} hit=${hit?.entity ? 1 : 0} vis=${hasVisual} move=${movementWobble.movementFactor.toFixed(2)} event=${lastEvent}`);
        }

        if (hit?.entity) {
            applyBeamDamage(player, hit.entity, tick);

            try {
                player.dimension.spawnParticle(GLUON_SPARK_PARTICLE, hit.impactPoint);
            } catch {
                try {
                    player.dimension.spawnParticle(GLUON_FALLBACK_PARTICLE, hit.impactPoint);
                } catch { }
            }

            if (Math.random() < 0.65) {
                try {
                    player.dimension.spawnParticle(GLUON_SPARK_PARTICLE, hit.impactPoint);
                } catch { }
            }

            try {
                player.dimension.spawnParticle(GLUON_AURA_PARTICLE, hit.impactPoint);
            } catch { }
        } else if (blockImpactPoint) {
            try {
                player.dimension.spawnParticle(GLUON_TRAIL_PARTICLE, blockImpactPoint);
            } catch {
                try {
                    player.dimension.spawnParticle(GLUON_FALLBACK_PARTICLE, blockImpactPoint);
                } catch { }
            }

            try {
                player.dimension.spawnParticle(GLUON_SPARK_PARTICLE, blockImpactPoint);
            } catch {
                try {
                    player.dimension.spawnParticle(GLUON_FALLBACK_PARTICLE, blockImpactPoint);
                } catch { }
            }

            if (Math.random() < 0.4) {
                try {
                    player.dimension.spawnParticle(GLUON_AURA_PARTICLE, blockImpactPoint);
                } catch { }
            }
        }
    }

    for (const playerId of activeFireStateByPlayer.keys()) {
        if (!onlinePlayerIds.has(playerId)) {
            activeFireStateByPlayer.delete(playerId);
        }
    }

    for (const playerId of trackedUseByPlayer.keys()) {
        if (!onlinePlayerIds.has(playerId)) {
            trackedUseByPlayer.delete(playerId);
        }
    }

    for (const playerId of nextFireLoopTickByPlayer.keys()) {
        if (!onlinePlayerIds.has(playerId)) {
            nextFireLoopTickByPlayer.delete(playerId);
        }
    }

    for (const playerId of movementStateByPlayer.keys()) {
        if (!onlinePlayerIds.has(playerId)) {
            movementStateByPlayer.delete(playerId);
        }
    }

    for (const [targetId, marker] of recentGluonHitByTarget.entries()) {
        const markerTick = Number(marker?.tick);
        if (!Number.isFinite(markerTick) || (tick - markerTick) > 80) {
            recentGluonHitByTarget.delete(targetId);
        }
    }

    for (const playerId of debugLastEventByPlayer.keys()) {
        if (!onlinePlayerIds.has(playerId)) {
            debugLastEventByPlayer.delete(playerId);
        }
    }

    for (const playerId of debugLastActionbarTickByPlayer.keys()) {
        if (!onlinePlayerIds.has(playerId)) {
            debugLastActionbarTickByPlayer.delete(playerId);
        }
    }

    if ((tick % 120) !== 0) return;

    for (const [pairKey, damageTick] of lastDamageTickByPair.entries()) {
        if (!Number.isFinite(damageTick) || (tick - damageTick) > 600) {
            lastDamageTickByPair.delete(pairKey);
        }
    }

    for (const [pairKey, soundTick] of lastHitSoundTickByPair.entries()) {
        if (!Number.isFinite(soundTick) || (tick - soundTick) > 600) {
            lastHitSoundTickByPair.delete(pairKey);
        }
    }
}, 1);