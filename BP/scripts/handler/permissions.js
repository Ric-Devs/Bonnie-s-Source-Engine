import { world } from "@minecraft/server";

// ── Constants ─────────────────────────────────────────────────────────────────
const ADVENTURE_PERMISSION_MESSAGE_COOLDOWN_MS = 1000;
const PRESSURE_PLATE_PUSH_OFF_COOLDOWN_MS = 180;
const PRESSURE_PLATE_BLOCK_HALF_EXTENT = 1.0;

export const ADVENTURE_COMMAND_TO_KEY = {
    can_use_pots: "canUsePots",
    can_use_shelves: "canUseShelves",
    can_use_trapdoors: "canUseTrapdoors",
    can_use_doors: "canUseDoors",
    can_use_itemframes: "canUseItemframes",
    can_use_candles: "canUseCandles",
    can_open_containers: "canOpenContainers",
    can_use_buttons: "canUseButtons",
    can_use_pressure_plates: "canUsePressurePlates",
    can_use_incompatible_respawns: "canUseIncompatibleRespawns",
    can_use_daylight_sensors: "canUseDaylightSensors",
    can_hit_entities: "canHitEntities",
    can_hit_players: "canHitPlayers",
    can_use_jukebox: "canUseJukebox",
    can_use_all: "canUseAll"
};

const ADVENTURE_KEY_TO_PROPERTY = {
    canUsePots: "can_use_pots",
    canUseShelves: "can_use_shelves",
    canUseTrapdoors: "can_use_trapdoors",
    canUseDoors: "can_use_doors",
    canUseItemframes: "can_use_itemframes",
    canUseCandles: "can_use_candles",
    canOpenContainers: "can_open_containers",
    canUseButtons: "can_use_buttons",
    canUsePressurePlates: "can_use_pressure_plates",
    canUseIncompatibleRespawns: "can_use_incompatible_respawns",
    canUseDaylightSensors: "can_use_daylight_sensors",
    canHitEntities: "can_hit_entities",
    canHitPlayers: "can_hit_players",
    canUseJukebox: "can_use_jukebox",
    canUseAll: "can_use_all"
};

const ADVENTURE_BLOCKED_MESSAGES = {
    canUsePots: "You cannot use flower pots right now.",
    canUseShelves: "You cannot use shelves right now.",
    canUseTrapdoors: "You cannot use trapdoors right now.",
    canUseDoors: "You cannot use doors right now.",
    canUseItemframes: "You cannot use item frames right now.",
    canUseCandles: "You cannot use candles right now.",
    canOpenContainers: "You cannot open containers right now.",
    canUseButtons: "You cannot use buttons right now.",
    canUsePressurePlates: "You cannot use pressure plates right now.",
    canUseIncompatibleRespawns: "You cannot use beds or respawn anchors here right now.",
    canUseDaylightSensors: "You cannot use daylight sensors right now.",
    canHitEntities: "You cannot hit entities right now.",
    canHitPlayers: "You cannot hit players right now.",
    canUseJukebox: "You cannot use jukeboxes right now."
};

// ── Runtime State ─────────────────────────────────────────────────────────────
const adventureInteractionMessageCooldowns = new Map();
const pressurePlatePushCooldowns = new Map();
const pressurePlateEnforcementCache = new Map();

export const adventureInteractionPermissions = {
    canUsePots: true,
    canUseShelves: true,
    canUseTrapdoors: true,
    canUseDoors: true,
    canUseItemframes: true,
    canUseCandles: true,
    canOpenContainers: true,
    canUseButtons: true,
    canUsePressurePlates: true,
    canUseIncompatibleRespawns: true,
    canUseDaylightSensors: true,
    canHitEntities: true,
    canHitPlayers: true,
    canUseJukebox: true,
    canUseAll: true
};

// ── Player Helpers ────────────────────────────────────────────────────────────
function getPlayerGameMode(player) {
    if (!player) return "";

    if (typeof player.getGameMode === "function") {
        try {
            const rawMode = `${player.getGameMode()}`.trim().toLowerCase();
            if (rawMode === "0" || rawMode === "survival") return "survival";
            if (rawMode === "1" || rawMode === "creative") return "creative";
            if (rawMode === "2" || rawMode === "adventure") return "adventure";
            if (rawMode === "6" || rawMode === "spectator") return "spectator";
            if (rawMode.includes("adventure")) return "adventure";
            if (rawMode.includes("creative")) return "creative";
            if (rawMode.includes("survival")) return "survival";
            if (rawMode.includes("spectator")) return "spectator";
        } catch { }
    }

    const modeChecks = [
        ["survival", "testfor @s[m=survival]", "testfor @s[m=0]"],
        ["creative", "testfor @s[m=creative]", "testfor @s[m=1]"],
        ["adventure", "testfor @s[m=adventure]", "testfor @s[m=2]"],
        ["spectator", "testfor @s[m=spectator]", "testfor @s[m=6]"]
    ];
    for (const [modeName, ...tests] of modeChecks) {
        for (const test of tests) {
            try {
                if ((player.runCommand(test)?.successCount ?? 0) > 0) {
                    return modeName;
                }
            } catch { }
        }
    }

    return "";
}

export function isPlayerInAdventure(player) {
    return getPlayerGameMode(player) === "adventure";
}

// ── Persistence ───────────────────────────────────────────────────────────────
function persistAdventurePermissions() {
    for (const [permissionKey, propertyId] of Object.entries(ADVENTURE_KEY_TO_PROPERTY)) {
        world.setDynamicProperty(propertyId, adventureInteractionPermissions[permissionKey]);
    }
}

export function loadPersistedPermissions(parseBooleanLike) {
    adventureInteractionPermissions.canUsePots = parseBooleanLike(world.getDynamicProperty("can_use_pots"), true);
    adventureInteractionPermissions.canUseShelves = parseBooleanLike(world.getDynamicProperty("can_use_shelves"), true);
    adventureInteractionPermissions.canUseTrapdoors = parseBooleanLike(world.getDynamicProperty("can_use_trapdoors"), true);
    adventureInteractionPermissions.canUseDoors = parseBooleanLike(world.getDynamicProperty("can_use_doors"), true);
    adventureInteractionPermissions.canUseItemframes = parseBooleanLike(world.getDynamicProperty("can_use_itemframes"), true);
    adventureInteractionPermissions.canUseCandles = parseBooleanLike(world.getDynamicProperty("can_use_candles"), true);
    adventureInteractionPermissions.canOpenContainers = parseBooleanLike(world.getDynamicProperty("can_open_containers"), true);
    adventureInteractionPermissions.canUseButtons = parseBooleanLike(world.getDynamicProperty("can_use_buttons"), true);
    adventureInteractionPermissions.canUsePressurePlates = parseBooleanLike(world.getDynamicProperty("can_use_pressure_plates"), true);
    adventureInteractionPermissions.canUseIncompatibleRespawns = parseBooleanLike(world.getDynamicProperty("can_use_incompatible_respawns"), true);
    adventureInteractionPermissions.canUseDaylightSensors = parseBooleanLike(world.getDynamicProperty("can_use_daylight_sensors"), true);
    adventureInteractionPermissions.canHitEntities = parseBooleanLike(world.getDynamicProperty("can_hit_entities"), true);
    adventureInteractionPermissions.canHitPlayers = parseBooleanLike(world.getDynamicProperty("can_hit_players"), true);
    adventureInteractionPermissions.canUseJukebox = parseBooleanLike(world.getDynamicProperty("can_use_jukebox"), true);
    adventureInteractionPermissions.canUseAll =
        adventureInteractionPermissions.canUsePots
        && adventureInteractionPermissions.canUseShelves
        && adventureInteractionPermissions.canUseTrapdoors
        && adventureInteractionPermissions.canUseDoors
        && adventureInteractionPermissions.canUseItemframes
        && adventureInteractionPermissions.canUseCandles
        && adventureInteractionPermissions.canOpenContainers
        && adventureInteractionPermissions.canUseButtons
        && adventureInteractionPermissions.canUsePressurePlates
        && adventureInteractionPermissions.canUseIncompatibleRespawns
        && adventureInteractionPermissions.canUseDaylightSensors
        && adventureInteractionPermissions.canHitEntities
        && adventureInteractionPermissions.canHitPlayers
        && adventureInteractionPermissions.canUseJukebox;
}

// ── Permission Management ─────────────────────────────────────────────────────
export function getAdventurePermissionStatusLines() {
    return [
        "Adventure interaction permissions:",
        `- can_use_pots: ${adventureInteractionPermissions.canUsePots}`,
        `- can_use_shelves: ${adventureInteractionPermissions.canUseShelves}`,
        `- can_use_trapdoors: ${adventureInteractionPermissions.canUseTrapdoors}`,
        `- can_use_doors: ${adventureInteractionPermissions.canUseDoors}`,
        `- can_use_itemframes: ${adventureInteractionPermissions.canUseItemframes}`,
        `- can_use_candles: ${adventureInteractionPermissions.canUseCandles}`,
        `- can_open_containers: ${adventureInteractionPermissions.canOpenContainers}`,
        `- can_use_buttons: ${adventureInteractionPermissions.canUseButtons}`,
        `- can_use_pressure_plates: ${adventureInteractionPermissions.canUsePressurePlates}`,
        `- can_use_incompatible_respawns: ${adventureInteractionPermissions.canUseIncompatibleRespawns}`,
        `- can_use_daylight_sensors: ${adventureInteractionPermissions.canUseDaylightSensors}`,
        `- can_hit_entities: ${adventureInteractionPermissions.canHitEntities}`,
        `- can_hit_players: ${adventureInteractionPermissions.canHitPlayers}`,
        `- can_use_jukebox: ${adventureInteractionPermissions.canUseJukebox}`,
        `- can_use_all (derived): ${adventureInteractionPermissions.canUseAll}`
    ];
}

export function setAdventurePermission(permissionKey, enabled) {
    const normalizedValue = !!enabled;

    if (permissionKey === "canUseAll") {
        adventureInteractionPermissions.canUsePots = normalizedValue;
        adventureInteractionPermissions.canUseShelves = normalizedValue;
        adventureInteractionPermissions.canUseTrapdoors = normalizedValue;
        adventureInteractionPermissions.canUseDoors = normalizedValue;
        adventureInteractionPermissions.canUseItemframes = normalizedValue;
        adventureInteractionPermissions.canUseCandles = normalizedValue;
        adventureInteractionPermissions.canOpenContainers = normalizedValue;
        adventureInteractionPermissions.canUseButtons = normalizedValue;
        adventureInteractionPermissions.canUsePressurePlates = normalizedValue;
        adventureInteractionPermissions.canUseIncompatibleRespawns = normalizedValue;
        adventureInteractionPermissions.canUseDaylightSensors = normalizedValue;
        adventureInteractionPermissions.canHitEntities = normalizedValue;
        adventureInteractionPermissions.canHitPlayers = normalizedValue;
        adventureInteractionPermissions.canUseJukebox = normalizedValue;
        adventureInteractionPermissions.canUseAll = normalizedValue;
        persistAdventurePermissions();
        return;
    }

    if (!Object.prototype.hasOwnProperty.call(adventureInteractionPermissions, permissionKey)) return;

    adventureInteractionPermissions[permissionKey] = normalizedValue;
    adventureInteractionPermissions.canUseAll =
        adventureInteractionPermissions.canUsePots
        && adventureInteractionPermissions.canUseShelves
        && adventureInteractionPermissions.canUseTrapdoors
        && adventureInteractionPermissions.canUseDoors
        && adventureInteractionPermissions.canUseItemframes
        && adventureInteractionPermissions.canUseCandles
        && adventureInteractionPermissions.canOpenContainers
        && adventureInteractionPermissions.canUseButtons
        && adventureInteractionPermissions.canUsePressurePlates
        && adventureInteractionPermissions.canUseIncompatibleRespawns
        && adventureInteractionPermissions.canUseDaylightSensors
        && adventureInteractionPermissions.canHitEntities
        && adventureInteractionPermissions.canHitPlayers
        && adventureInteractionPermissions.canUseJukebox;
    persistAdventurePermissions();
}

// ── Block Type Helpers ────────────────────────────────────────────────────────
function isContainerBlockType(typeId) {
    const normalizedTypeId = `${typeId ?? ""}`;
    if (!normalizedTypeId) return false;

    return normalizedTypeId === "minecraft:chest"
        || normalizedTypeId === "minecraft:trapped_chest"
        || normalizedTypeId === "minecraft:barrel"
        || normalizedTypeId === "minecraft:hopper"
        || normalizedTypeId === "minecraft:dropper"
        || normalizedTypeId === "minecraft:dispenser"
        || normalizedTypeId === "minecraft:furnace"
        || normalizedTypeId === "minecraft:blast_furnace"
        || normalizedTypeId === "minecraft:smoker"
        || normalizedTypeId === "minecraft:brewing_stand"
        || normalizedTypeId === "minecraft:shulker_box"
        || normalizedTypeId.endsWith("_shulker_box")
        || normalizedTypeId.includes("container")
        || normalizedTypeId.includes("crate")
        || normalizedTypeId.includes("locker")
        || normalizedTypeId.includes("cabinet")
        || normalizedTypeId.includes("drawers");
}

function isButtonBlockType(typeId) {
    const normalizedTypeId = `${typeId ?? ""}`;
    return normalizedTypeId.endsWith("_button") || normalizedTypeId.includes("button");
}

function isPressurePlateBlockType(typeId) {
    const normalizedTypeId = `${typeId ?? ""}`;
    return normalizedTypeId.endsWith("_pressure_plate") || normalizedTypeId.includes("pressure_plate");
}

export function getAdventurePermissionForBlock(blockTypeId) {
    const normalizedTypeId = `${blockTypeId ?? ""}`;
    if (!normalizedTypeId) return undefined;

    if (normalizedTypeId === "minecraft:flower_pot" || normalizedTypeId.includes("flower_pot") || normalizedTypeId.includes("pot")) return "canUsePots";
    if (normalizedTypeId === "minecraft:chiseled_bookshelf" || normalizedTypeId === "minecraft:bookshelf" || normalizedTypeId.includes("shelf")) return "canUseShelves";
    if (normalizedTypeId.endsWith("_trapdoor") || normalizedTypeId.includes("trapdoor") || normalizedTypeId.includes("trap_door")) return "canUseTrapdoors";
    if (normalizedTypeId.endsWith("_door")) return "canUseDoors";
    if (normalizedTypeId.includes("_candle") || normalizedTypeId === "minecraft:candle") return "canUseCandles";
    if (normalizedTypeId === "minecraft:frame" || normalizedTypeId === "minecraft:glow_frame" || normalizedTypeId.includes("item_frame")) return "canUseItemframes";
    if (normalizedTypeId === "minecraft:jukebox" || normalizedTypeId.includes("jukebox")) return "canUseJukebox";
    if (normalizedTypeId === "minecraft:daylight_detector" || normalizedTypeId === "minecraft:daylight_detector_inverted") return "canUseDaylightSensors";
    if (isContainerBlockType(normalizedTypeId)) return "canOpenContainers";
    if (isButtonBlockType(normalizedTypeId)) return "canUseButtons";

    return undefined;
}

export function shouldBlockAdventureInteraction(player, blockTypeId) {
    if (!isPlayerInAdventure(player)) return false;

    const permissionKey = getAdventurePermissionForBlock(blockTypeId);
    if (!permissionKey) return false;

    return !adventureInteractionPermissions[permissionKey];
}

export function getIncompatibleRespawnPermissionForBlock(player, blockTypeId, dimensionId) {
    if (!player || !isPlayerInAdventure(player)) return undefined;

    const normalizedTypeId = `${blockTypeId ?? ""}`;
    const normalizedDimensionId = `${dimensionId ?? player.dimension?.id ?? ""}`;
    if (!normalizedTypeId || !normalizedDimensionId) return undefined;

    const isBed = normalizedTypeId.endsWith("_bed");
    const isRespawnAnchor = normalizedTypeId === "minecraft:respawn_anchor";

    const bedIncompatible = isBed && normalizedDimensionId !== "minecraft:overworld";
    const anchorIncompatible = isRespawnAnchor && normalizedDimensionId !== "minecraft:nether";

    if (bedIncompatible || anchorIncompatible) {
        return "canUseIncompatibleRespawns";
    }

    return undefined;
}

// ── Notifications ─────────────────────────────────────────────────────────────
export function notifyAdventureInteractionBlocked(player, permissionKey) {
    if (!player?.id || !permissionKey) return;

    const now = Date.now();
    const previous = adventureInteractionMessageCooldowns.get(player.id) ?? 0;
    if (now - previous < ADVENTURE_PERMISSION_MESSAGE_COOLDOWN_MS) return;

    adventureInteractionMessageCooldowns.set(player.id, now);
    player.sendMessage(ADVENTURE_BLOCKED_MESSAGES[permissionKey] ?? "You cannot use that block right now.");
}

// ── Pressure Plate Enforcement ────────────────────────────────────────────────
function pushPlayerOffPressurePlate(player, platePos) {
    if (!player || !platePos) return;

    const now = Date.now();
    const previous = pressurePlatePushCooldowns.get(player.id) ?? 0;
    if (now - previous < PRESSURE_PLATE_PUSH_OFF_COOLDOWN_MS) return;

    const playerLocation = player.location;
    const targetX = platePos.x + 0.5;
    const targetZ = platePos.z + 0.5;
    let offsetX = playerLocation.x - targetX;
    let offsetZ = playerLocation.z - targetZ;

    if (Math.abs(offsetX) < 0.001 && Math.abs(offsetZ) < 0.001) {
        offsetX = 1;
        offsetZ = 0;
    }

    const magnitude = Math.hypot(offsetX, offsetZ) || 1;
    const pushDistance = 0.65;
    const nextPos = {
        x: playerLocation.x + (offsetX / magnitude) * pushDistance,
        y: playerLocation.y,
        z: playerLocation.z + (offsetZ / magnitude) * pushDistance
    };

    try {
        player.teleport(nextPos, {
            dimension: player.dimension,
            keepVelocity: false
        });
        pressurePlatePushCooldowns.set(player.id, now);
    } catch { }
}

export function enforcePressurePlateRestrictionForPlayer(player) {
    if (!player || !isPlayerInAdventure(player) || adventureInteractionPermissions.canUsePressurePlates) return;

    const location = player.location;
    const dimensionId = player.dimension?.id ?? "";
    const cacheKey = `${player.id}_${dimensionId}`;
    const cached = pressurePlateEnforcementCache.get(cacheKey);

    // Only scan if player moved or dimension changed
    if (cached) {
        const posChanged = cached.x !== Math.floor(location.x) || cached.y !== Math.floor(location.y) || cached.z !== Math.floor(location.z);
        if (!posChanged) return;
    }

    const baseX = Math.floor(location.x);
    const baseY = Math.floor(location.y);
    const baseZ = Math.floor(location.z);
    const dimension = player.dimension;

    // Full 3x3 grid at Y and Y-1 so diagonal corners are always covered.
    const candidatePositions = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
            candidatePositions.push({ x: baseX + dx, y: baseY,     z: baseZ + dz });
            candidatePositions.push({ x: baseX + dx, y: baseY - 1, z: baseZ + dz });
        }
    }

    for (const pos of candidatePositions) {
        const block = dimension.getBlock(pos);
        if (!isPressurePlateBlockType(block?.typeId)) continue;

        const centerX = pos.x + 0.5;
        const centerZ = pos.z + 0.5;
        const deltaX = Math.abs(location.x - centerX);
        const deltaZ = Math.abs(location.z - centerZ);

        // Square interaction zone: 1.5 x 1.5 centered on the plate.
        if (deltaX > PRESSURE_PLATE_BLOCK_HALF_EXTENT || deltaZ > PRESSURE_PLATE_BLOCK_HALF_EXTENT) continue;

        pushPlayerOffPressurePlate(player, pos);
        notifyAdventureInteractionBlocked(player, "canUsePressurePlates");
        pressurePlateEnforcementCache.set(cacheKey, { x: baseX, y: baseY, z: baseZ });
        break;
    }

    pressurePlateEnforcementCache.set(cacheKey, { x: baseX, y: baseY, z: baseZ });
}

// ── Entity Interaction Permission ─────────────────────────────────────────────
function getAdventurePermissionForEntityInteraction(entityTypeId) {
    const normalizedTypeId = `${entityTypeId ?? ""}`.trim().toLowerCase();
    if (!normalizedTypeId) return undefined;

    if (normalizedTypeId === "minecraft:item_frame" || normalizedTypeId === "minecraft:glow_item_frame" || normalizedTypeId === "minecraft:frame" || normalizedTypeId === "minecraft:glow_frame" || normalizedTypeId.includes("item_frame")) {
        return "canUseItemframes";
    }

    return undefined;
}

// ── Event Subscriptions ───────────────────────────────────────────────────────
world.beforeEvents.playerInteractWithEntity.subscribe((data) => {
    if (data.cancel) return;

    const player = data.player;
    if (!isPlayerInAdventure(player)) return;

    const blockedPermission = getAdventurePermissionForEntityInteraction(data?.target?.typeId);
    if (!blockedPermission) return;

    if (adventureInteractionPermissions[blockedPermission]) return;

    data.cancel = true;
    notifyAdventureInteractionBlocked(player, blockedPermission);
});

world.beforeEvents.entityHurt.subscribe((data) => {
    if (data.cancel) return;

    let attacker = data?.damageSource?.damagingEntity;

    if (!attacker) {
        const projectile = data?.damageSource?.damagingProjectile;
        try {
            attacker = projectile?.getComponent?.("minecraft:projectile")?.owner ?? projectile?.owner;
        } catch { }
    }

    if (!attacker || attacker.typeId !== "minecraft:player") return;
    if (!isPlayerInAdventure(attacker)) return;

    const hurtEntity = data?.hurtEntity;
    const hitPlayers = hurtEntity?.typeId === "minecraft:player";
    const permissionKey = hitPlayers ? "canHitPlayers" : "canHitEntities";
    if (adventureInteractionPermissions[permissionKey]) return;

    data.cancel = true;
    notifyAdventureInteractionBlocked(attacker, permissionKey);
});

