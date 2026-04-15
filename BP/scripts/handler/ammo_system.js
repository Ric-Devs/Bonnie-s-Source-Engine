// SECTION: Ammo Constants
const AMMO_ITEM_ID = "brr:gaussammo";
const EMPTY_SOUND = "weapons.gauss.empty";

// SECTION: Shared Helpers
function isCreativePlayer(player) {
    if (!player?.id) return false;

    try {
        if (typeof player.getGameMode === "function") {
            return `${player.getGameMode()}`.trim().toLowerCase() === "creative";
        }
    } catch { }

    try {
        return (player.runCommand("testfor @s[m=creative]")?.successCount ?? 0) > 0;
    } catch { }

    try {
        return (player.runCommand("testfor @s[m=1]")?.successCount ?? 0) > 0;
    } catch { }

    return false;
}

function findAmmoInInventory(player) {
    try {
        const inventory = player.getComponent("minecraft:inventory");
        if (!inventory?.container) return null;

        const container = inventory.container;
        for (let i = 0; i < container.size; i++) {
            const item = container.getItem(i);
            if (!item || item.typeId !== AMMO_ITEM_ID) continue;

            const durability = item.getComponent("minecraft:durability");
            if (!durability) continue;

            return { slotIndex: i, container, itemStack: item, durabilityComponent: durability };
        }
    } catch { }
    return null;
}

// SECTION: Public Ammo API
export function getAmmoRemaining(player) {
    if (isCreativePlayer(player)) return Number.MAX_SAFE_INTEGER;

    const ammo = findAmmoInInventory(player);
    if (!ammo) return 0;
    return Math.max(0, ammo.durabilityComponent.maxDurability - ammo.durabilityComponent.damage);
}

export function consumeAmmo(player, cost) {
    if (cost <= 0) return true;
    if (isCreativePlayer(player)) return true;

    const ammo = findAmmoInInventory(player);
    if (!ammo) return false;

    const remaining = ammo.durabilityComponent.maxDurability - ammo.durabilityComponent.damage;
    if (remaining < cost) return false;

    ammo.durabilityComponent.damage += cost;

    if (ammo.durabilityComponent.damage >= ammo.durabilityComponent.maxDurability) {
        ammo.container.setItem(ammo.slotIndex, undefined);
    } else {
        ammo.container.setItem(ammo.slotIndex, ammo.itemStack);
    }

    return true;
}

// SECTION: Feedback
export function playEmptySound(player) {
    if (!player?.id) return;
    try {
        player.playSound(EMPTY_SOUND, { pitch: 1, volume: 1 });
        return;
    } catch { }
    try {
        player.runCommand(`playsound ${EMPTY_SOUND} @s ~ ~ ~ 1 1`);
    } catch { }
}
