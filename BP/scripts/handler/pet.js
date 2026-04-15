import { system, world } from "@minecraft/server";

// SECTION: Item and Property Constants
const COLLAR_ITEM = "brr:collar";
const LEASH_ITEM = "brr:leash";
const SIT_ITEM = "brr:sit";

const DP_COLLARED = "brr_collared";
const DP_OWNER_ID = "brr_owner_id";
const WORLD_PET_STATE = "brr_pet_state";

// SECTION: Ride Rules
const BONNIE_USERNAME = "bonnierobloxrip";
const MARSHMALLOW_USERNAME = "marshmallow997";
const RIDE_DENIED_MESSAGE = "You are not allowed to ride other players.";

// SECTION: Leash Follow Tuning
const LEASH_PULL_DISTANCE = 2.5;
const LEASH_STRONG_PULL_DISTANCE = 10;
const LEASH_HARD_PULL_DISTANCE = 18;
const LEASH_PULL_DISTANCE_SQUARED = LEASH_PULL_DISTANCE * LEASH_PULL_DISTANCE;
const LEASH_STRONG_PULL_DISTANCE_SQUARED = LEASH_STRONG_PULL_DISTANCE * LEASH_STRONG_PULL_DISTANCE;
const LEASH_HARD_PULL_DISTANCE_SQUARED = LEASH_HARD_PULL_DISTANCE * LEASH_HARD_PULL_DISTANCE;

// SECTION: Interaction Tuning
const INTERACTION_DEDUPE_WINDOW_TICKS = 2;

let tickCount = 0;

// SECTION: Runtime State
const fallbackCollaredState = new Map();
const fallbackOwnerState = new Map();
const recentInteractionTickByKey = new Map();
let cachedPetStateByPlayerId;

async function triggerPetEvent(entity, eventName) {
  if (!entity || !eventName) return;

  try {
    await entity.runCommandAsync(`event entity @s ${eventName}`);
    return;
  } catch {
    // Fall through to direct script event dispatch below.
  }

  try {
    if (typeof entity.triggerEvent === "function") {
      entity.triggerEvent(eventName);
    }
  } catch {
    // Ignore if runtime cannot dispatch this event via script.
  }
}

function getPlayers() {
  return world.getAllPlayers();
}

function loadPetStateByPlayerId() {
  if (cachedPetStateByPlayerId) return cachedPetStateByPlayerId;

  try {
    const raw = world.getDynamicProperty(WORLD_PET_STATE);
    if (typeof raw === "string" && raw.length > 0) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        cachedPetStateByPlayerId = parsed;
        return cachedPetStateByPlayerId;
      }
    }
  } catch {
    // Ignore malformed persistence and start fresh.
  }

  cachedPetStateByPlayerId = {};
  return cachedPetStateByPlayerId;
}

function savePetStateByPlayerId() {
  if (!cachedPetStateByPlayerId) return;

  try {
    const raw = JSON.stringify(cachedPetStateByPlayerId);
    world.setDynamicProperty(WORLD_PET_STATE, raw === "{}" ? undefined : raw);
  } catch {
    // Ignore persistence failures and keep runtime state alive.
  }
}

function getPersistedPetState(playerId) {
  if (!playerId) return undefined;
  const state = loadPetStateByPlayerId()[playerId];
  return state && typeof state === "object" ? state : undefined;
}

function updatePersistedPetState(playerId, updater) {
  if (!playerId) return;

  const petStateByPlayerId = loadPetStateByPlayerId();
  const currentState = getPersistedPetState(playerId) ?? {};
  const nextState = updater({ ...currentState }) ?? {};
  const hasCollared = typeof nextState.collared === "boolean";
  const hasOwner = typeof nextState.ownerId === "string" && nextState.ownerId.length > 0;

  if (!hasCollared && !hasOwner) {
    delete petStateByPlayerId[playerId];
  } else {
    petStateByPlayerId[playerId] = {};
    if (hasCollared) {
      petStateByPlayerId[playerId].collared = nextState.collared;
    }
    if (hasOwner) {
      petStateByPlayerId[playerId].ownerId = nextState.ownerId;
    }
  }

  savePetStateByPlayerId();
}

function getSelectedItemType(player) {
  try {
    const inventory = player.getComponent("minecraft:inventory");
    const container = inventory?.container;
    if (!container) return undefined;
    return container.getItem(player.selectedSlotIndex)?.typeId;
  } catch {
    return undefined;
  }
}

function getPlayerUsername(player) {
  return `${player?.name ?? player?.nameTag ?? ""}`.trim().toLowerCase();
}

function canPlayersRideEachOther(rider, mount) {
  const riderName = getPlayerUsername(rider);
  const mountName = getPlayerUsername(mount);

  if (!riderName || !mountName) return false;

  return (
    (riderName === MARSHMALLOW_USERNAME && mountName === BONNIE_USERNAME) ||
    (riderName === BONNIE_USERNAME && mountName === MARSHMALLOW_USERNAME)
  );
}

function sendRideDenied(player) {
  try {
    player?.sendMessage(RIDE_DENIED_MESSAGE);
  } catch {
    // Ignore messaging failures on older runtimes.
  }
}

function getMainhandItemType(player) {
  try {
    const eq = player.getComponent("minecraft:equippable");
    const mainhand =
      eq?.getEquipment("Mainhand") ??
      eq?.getEquipment("mainhand");
    return mainhand?.typeId;
  } catch {
    return undefined;
  }
}

function isPlayerEntity(entity) {
  return entity?.typeId === "minecraft:player" || entity?.typeId?.endsWith(":player");
}

function isWearingCollar(player) {
  try {
    const eq = player.getComponent("minecraft:equippable");
    const chest =
      eq?.getEquipment("Chest") ??
      eq?.getEquipment("chest");
    return chest?.typeId === COLLAR_ITEM;
  } catch {
    return false;
  }
}

function getCollaredState(player) {
  if (!player?.id) return false;

  try {
    const value = player.getDynamicProperty(DP_COLLARED);
    if (typeof value === "boolean") {
      fallbackCollaredState.set(player.id, value);
      return value;
    }
  } catch {
    // Ignore and use fallback state map.
  }

  const persisted = getPersistedPetState(player.id);
  if (typeof persisted?.collared === "boolean") {
    fallbackCollaredState.set(player.id, persisted.collared);
    return persisted.collared;
  }

  return fallbackCollaredState.get(player.id) ?? false;
}

function setCollaredState(player, collared) {
  if (!player?.id) return;
  fallbackCollaredState.set(player.id, collared);
  updatePersistedPetState(player.id, (state) => {
    state.collared = collared;
    return state;
  });

  try {
    player.setDynamicProperty(DP_COLLARED, collared);
  } catch {
    // Ignore if dynamic properties are not supported.
  }
}

function getOwnerId(pet) {
  if (!pet?.id) return undefined;

  try {
    const value = pet.getDynamicProperty(DP_OWNER_ID);
    if (typeof value === "string" && value.length > 0) {
      fallbackOwnerState.set(pet.id, value);
      return value;
    }
  } catch {
    // Ignore and use fallback state map.
  }

  const persisted = getPersistedPetState(pet.id);
  if (typeof persisted?.ownerId === "string" && persisted.ownerId.length > 0) {
    fallbackOwnerState.set(pet.id, persisted.ownerId);
    return persisted.ownerId;
  }

  return fallbackOwnerState.get(pet.id);
}

function setOwnerId(pet, ownerId) {
  if (!pet?.id) return;

  if (!ownerId) {
    fallbackOwnerState.delete(pet.id);
  } else {
    fallbackOwnerState.set(pet.id, ownerId);
  }

  updatePersistedPetState(pet.id, (state) => {
    if (ownerId) {
      state.ownerId = ownerId;
    } else {
      delete state.ownerId;
    }
    return state;
  });

  try {
    setOrClearStringProperty(pet, DP_OWNER_ID, ownerId);
  } catch {
    // Ignore if dynamic properties are not supported.
  }
}

function setOrClearStringProperty(player, propertyId, value) {
  if (!value) {
    player.setDynamicProperty(propertyId, undefined);
    return;
  }

  player.setDynamicProperty(propertyId, value);
}

function getOwnerForPet(pet) {
  const ownerId = getOwnerId(pet);
  if (!ownerId) return undefined;
  return getPlayers().find((p) => p.id === ownerId);
}

function setLeash(owner, pet) {
  setOwnerId(pet, owner.id);
}

function clearCachedState(playerId) {
  if (!playerId) return;
  fallbackCollaredState.delete(playerId);
  fallbackOwnerState.delete(playerId);

  for (const key of recentInteractionTickByKey.keys()) {
    if (key.startsWith(`${playerId}|`) || key.includes(`|${playerId}|`)) {
      recentInteractionTickByKey.delete(key);
    }
  }
}

function unleash(pet) {
  setOwnerId(pet, undefined);
}

async function normalizeRideState(player) {
  const currentMount = getRideTarget(player);
  try {
    await player.runCommandAsync("ride @s stop_riding");
  } catch {
    // Ignore if not currently riding.
  }

  if (currentMount) {
    await triggerPetEvent(currentMount, "brr:shoulders_off");
  }

  try {
    await player.runCommandAsync("ride @s evict_riders");
  } catch {
    // Ignore if player has no riders.
  }

  await triggerPetEvent(player, "brr:shoulders_off");
  await triggerPetEvent(player, "brr:rideable_default");
}

async function mountRider(rider, mount) {
  await normalizeRideState(rider);
  await normalizeRideState(mount);

  await triggerPetEvent(mount, "brr:shoulders_on");

  if (typeof rider.startRiding !== "function") return;

  try {
    rider.startRiding(mount);
  } catch {
    // Ignore incompatible runtime behavior.
  }
}

async function dismount(player) {
  const mount = getRideTarget(player);
  try {
    await player.runCommandAsync("ride @s stop_riding");
  } catch {
    // Ignore unsupported /ride failure.
  } finally {
    if (mount) {
      await triggerPetEvent(mount, "brr:shoulders_off");
    }
  }
}

function getHeldItemType(player, itemStack) {
  return itemStack?.typeId ?? getMainhandItemType(player) ?? getSelectedItemType(player);
}

function getInteractionTick() {
  return typeof system.currentTick === "number" ? system.currentTick : tickCount;
}

function shouldSkipInteraction(source, target, held) {
  const sourceId = source?.id;
  const targetId = target?.id;
  if (!sourceId || !targetId) return false;

  const key = `${sourceId}|${targetId}|${held ?? "none"}`;
  const now = getInteractionTick();
  const previous = recentInteractionTickByKey.get(key);

  if (typeof previous === "number" && (now - previous) <= INTERACTION_DEDUPE_WINDOW_TICKS) {
    return true;
  }

  recentInteractionTickByKey.set(key, now);
  return false;
}

function getRideTarget(player) {
  try {
    return player.getComponent("minecraft:riding")?.entityRidingOn;
  } catch {
    return undefined;
  }
}

function applyCollarState(player, collared) {
  const hasCollarState = getCollaredState(player);

  if (collared && !hasCollarState) {
    setCollaredState(player, true);
    void triggerPetEvent(player, "brr:collar_on");
    return;
  }

  if (!collared && hasCollarState) {
    setCollaredState(player, false);
    void normalizeRideState(player);
    void triggerPetEvent(player, "brr:collar_off");
    unleash(player);
  }
}

function scheduleRideableBaseline(player, delay = 1) {
  if (!player?.id) return;

  system.runTimeout(() => {
    if (!player?.isValid) return;

    void triggerPetEvent(player, "brr:rideable_default");

    if (!getRideTarget(player)) {
      void triggerPetEvent(player, "brr:shoulders_off");
    }

    const collared = getCollaredState(player) || isWearingCollar(player);
    if (collared) {
      void triggerPetEvent(player, "brr:collar_on");
    }
  }, delay);
}

world.afterEvents.playerSpawn.subscribe((event) => {
  scheduleRideableBaseline(event.player, event.initialSpawn ? 1 : 2);
});

system.runTimeout(() => {
  for (const player of getPlayers()) {
    scheduleRideableBaseline(player, 1);
  }
}, 1);

world.afterEvents?.playerLeave?.subscribe((event) => {
  clearCachedState(event?.playerId);
});

async function handlePlayerInteraction(source, target, held) {
  if (!source || !target || !isPlayerEntity(target)) return;

  const sourceIsCollared = getCollaredState(source) || isWearingCollar(source);
  const targetIsCollared = getCollaredState(target) || isWearingCollar(target);

  if (held === LEASH_ITEM) {
    if (!targetIsCollared) {
      source.sendMessage("You can only leash players wearing a pet collar.");
      return;
    }

    setLeash(source, target);
    return;
  }

  if (held === SIT_ITEM) {
    if (!targetIsCollared) {
      source.sendMessage("You can only use the sit item on collared players.");
      return;
    }

    if (!canPlayersRideEachOther(target, source)) {
      sendRideDenied(source);
      return;
    }

    const owner = getOwnerForPet(target);
    if (owner && owner.id !== source.id) {
      source.sendMessage("This pet is leashed to someone else.");
      return;
    }

    await mountRider(target, source);
    return;
  }

  if (sourceIsCollared) {
    if (!canPlayersRideEachOther(source, target)) {
      sendRideDenied(source);
      return;
    }

    const owner = getOwnerForPet(source);
    if (owner && owner.id !== target.id) {
      source.sendMessage("You are leashed and can only shoulder-sit your owner.");
      return;
    }

    await mountRider(source, target);
  }
}

const beforeInteractWithEntitySignal = world.beforeEvents?.playerInteractWithEntity;

if (beforeInteractWithEntitySignal) {
  beforeInteractWithEntitySignal.subscribe((event) => {
    const source = event.player;
    const target = event.target;
    if (!source || !target || !isPlayerEntity(target) || source.id === target.id) return;

    const held = getHeldItemType(source, event.itemStack);
    const sourceIsCollared = getCollaredState(source) || isWearingCollar(source);
    const usesPetItem = held === LEASH_ITEM || held === SIT_ITEM;
    if (!sourceIsCollared && !usesPetItem) return;

    event.cancel = true;

    if (shouldSkipInteraction(source, target, held)) return;

    system.run(() => {
      void handlePlayerInteraction(source, target, held);
    });
  });
}

system.runInterval(() => {
  tickCount++;

  if (tickCount % 40 === 0) {
    const cutoff = tickCount - 80;
    for (const [key, seenTick] of recentInteractionTickByKey.entries()) {
      if (seenTick < cutoff) {
        recentInteractionTickByKey.delete(key);
      }
    }
  }

  const players = getPlayers();

  for (const player of players) {
    const collared = isWearingCollar(player);
    applyCollarState(player, collared);

    if (!getCollaredState(player)) continue;

    if (tickCount % 20 === 0) {
      void triggerPetEvent(player, "brr:collar_on");
    }

    if (player.isSneaking && tickCount % 2 === 0) {
      void dismount(player);
    }

    const owner = getOwnerForPet(player);
    if (!owner) continue;

    const rideTarget = getRideTarget(player);
    if (rideTarget && rideTarget.id !== owner.id) {
      void dismount(player);
      continue;
    }

    const dx = owner.location.x - player.location.x;
    const dy = owner.location.y - player.location.y;
    const dz = owner.location.z - player.location.z;
    const distanceSquared = (dx * dx) + (dy * dy) + (dz * dz);

    if (distanceSquared <= LEASH_PULL_DISTANCE_SQUARED) {
      continue;
    }

    const horizontal = Math.sqrt(dx * dx + dz * dz) || 1;
    const nx = dx / horizontal;
    const nz = dz / horizontal;
    const verticalStrength = Math.max(-0.15, Math.min(0.35, dy * 0.08));

    let horizontalStrength = 0.5;
    if (distanceSquared > LEASH_STRONG_PULL_DISTANCE_SQUARED) {
      horizontalStrength = 0.95;
    }
    if (distanceSquared > LEASH_HARD_PULL_DISTANCE_SQUARED) {
      horizontalStrength = 1.3;
    }

    try {
      player.applyKnockback(nx, nz, horizontalStrength, verticalStrength);
    } catch {
      try {
        player.teleport(
          {
            x: player.location.x + (nx * 0.65),
            y: player.location.y + Math.max(-0.1, Math.min(0.3, dy * 0.03)),
            z: player.location.z + (nz * 0.65)
          },
          { dimension: player.dimension, keepVelocity: true }
        );
      } catch {
        // Ignore movement fallback failures.
      }
    }
  }
}, 1);