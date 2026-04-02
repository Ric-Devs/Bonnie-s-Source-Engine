import { system, world } from "@minecraft/server";

const COLLAR_ITEM = "brr:collar";
const LEASH_ITEM = "brr:leash";
const SHOULDER_ITEM = "brr:sit";

const DP_COLLARED = "brr_collared";
const DP_OWNER_ID = "brr_owner_id";

const NUDGE_DISTANCE = 6;
const TELEPORT_DISTANCE = 20;
const NUDGE_DISTANCE_SQUARED = NUDGE_DISTANCE * NUDGE_DISTANCE;
const TELEPORT_DISTANCE_SQUARED = TELEPORT_DISTANCE * TELEPORT_DISTANCE;

let tickCount = 0;

const fallbackCollaredState = new Map();
const fallbackOwnerState = new Map();

async function triggerPetEvent(entity, eventName) {
  if (!entity || !eventName) return;

  try {
    if (typeof entity.triggerEvent === "function") {
      entity.triggerEvent(eventName);
      return;
    }
  } catch {
    // Fall back to command-based trigger below.
  }

  try {
    await entity.runCommandAsync(`event entity @s ${eventName}`);
  } catch {
    // Ignore if runtime cannot dispatch this event via script.
  }
}

function getPlayers() {
  return world.getAllPlayers();
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

  return fallbackCollaredState.get(player.id) ?? false;
}

function setCollaredState(player, collared) {
  if (!player?.id) return;
  fallbackCollaredState.set(player.id, collared);

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

  return fallbackOwnerState.get(pet.id);
}

function setOwnerId(pet, ownerId) {
  if (!pet?.id) return;

  if (!ownerId) {
    fallbackOwnerState.delete(pet.id);
  } else {
    fallbackOwnerState.set(pet.id, ownerId);
  }

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

world.afterEvents.playerSpawn.subscribe((event) => {
  if (!event.initialSpawn) return;
  system.runTimeout(() => {
    void triggerPetEvent(event.player, "brr:rideable_default");
    void triggerPetEvent(event.player, "brr:shoulders_off");
  }, 1);
});

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

  if (held === SHOULDER_ITEM) {
    if (!targetIsCollared) {
      source.sendMessage("You can only use the sit item on collared players.");
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

  if (!sourceIsCollared) return;

  const owner = getOwnerForPet(source);
  if (owner && owner.id !== target.id) {
    source.sendMessage("You are leashed and can only shoulder-sit your owner.");
    return;
  }

  await mountRider(source, target);
}

const beforeInteractWithEntitySignal = world.beforeEvents?.playerInteractWithEntity;
const interactWithEntitySignal = world.afterEvents?.playerInteractWithEntity;

if (beforeInteractWithEntitySignal) {
  beforeInteractWithEntitySignal.subscribe((event) => {
    const source = event.player;
    const target = event.target;
    if (!source || !target || !isPlayerEntity(target) || source.id === target.id) return;

    const held = event.itemStack?.typeId ?? getMainhandItemType(source) ?? getSelectedItemType(source);
    if (held !== LEASH_ITEM && held !== SHOULDER_ITEM) return;

    event.cancel = true;

    system.run(() => {
      void handlePlayerInteraction(source, target, held);
    });
  });
}

if (interactWithEntitySignal) {
  interactWithEntitySignal.subscribe(async (event) => {
    const source = event.player;
    const target = event.target;
    const held = event.itemStack?.typeId ?? getMainhandItemType(source) ?? getSelectedItemType(source);
    if (beforeInteractWithEntitySignal && (held === LEASH_ITEM || held === SHOULDER_ITEM)) return;
    await handlePlayerInteraction(source, target, held);
  });
}

if (!interactWithEntitySignal) {
  world.afterEvents.itemUse.subscribe(async (event) => {
    const source = event.source;
    const held = event.itemStack?.typeId ?? getMainhandItemType(source) ?? getSelectedItemType(source);
    const sourceIsCollared = getCollaredState(source) || isWearingCollar(source);
    if (!sourceIsCollared && held !== LEASH_ITEM && held !== SHOULDER_ITEM) return;

    try {
      const hits = source.getEntitiesFromViewDirection({ maxDistance: 6 });
      const hit = hits.find((h) => isPlayerEntity(h.entity) && h.entity.id !== source.id);
      if (!hit?.entity) return;
      await handlePlayerInteraction(source, hit.entity, held);
    } catch {
      // Older runtimes might not support view-direction queries.
    }
  });
}

system.runInterval(() => {
  tickCount++;
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

    if (distanceSquared > TELEPORT_DISTANCE_SQUARED) {
      try {
        player.teleport(owner.location, { dimension: owner.dimension, keepVelocity: false });
      } catch {
        try {
          player.runCommandAsync(`tp @s ${owner.location.x} ${owner.location.y} ${owner.location.z}`);
        } catch {
          // Ignore teleport fallback failures.
        }
      }
      continue;
    }

    if (distanceSquared > NUDGE_DISTANCE_SQUARED) {
      const horizontal = Math.sqrt(dx * dx + dz * dz) || 1;
      const nx = dx / horizontal;
      const nz = dz / horizontal;
      try {
        player.applyKnockback(nx, nz, 0.6, Math.max(0, Math.min(0.2, dy * 0.05)));
      } catch {
        // Ignore runtimes where applyKnockback has incompatible signatures.
      }
    }
  }
}, 1);