import * as mc from "@minecraft/server";
import { ModalFormData, ActionFormData } from "@minecraft/server-ui";

// SECTION: Runtime Handles and Permissions
const { world, system } = mc;
const CommandPermissionLevel = mc.CommandPermissionLevel;
const CustomCommandParamType = mc.CustomCommandParamType;
const PlayerPermissionLevel = mc.PlayerPermissionLevel;

// SECTION: Emoji Catalog
const emojis = [
    { id: ":skull:", emoji: "", displayName: "Skull" },
    { id: ":pray:", emoji: "", displayName: "Pray" },
    { id: ":hh:", emoji: "", displayName: "Horrific housing" },
    { id: ":fire:", emoji: "", displayName: "Fire" },
    { id: ":coins:", emoji: "", displayName: "Coins" },
    { id: ":crane:", emoji: "", displayName: "Crane" },
    { id: ":bonnie:", emoji: "", displayName: "Bonnie" },
    { id: ":ninjaman:", emoji: "", displayName: "Niceninjapro" },
    { id: ":taco:", emoji: "", displayName: "Taco" },
    { id: ":subspace_taco:", emoji: "", displayName: "Subspace Taco" },
    { id: ":crown:", emoji: "", displayName: "Crown" },
    { id: ":ok:", emoji: "", displayName: "OK" },
    { id: ":speaking_head:", emoji: "", displayName: "Speaking Head" },
    { id: ":lil_john:", emoji: "", displayName: "Lil John" },
    { id: ":ice:", emoji: "", displayName: "Ice" },
    { id: ":deathnote:", emoji: "", displayName: "Deathnote" },
    { id: ":meteor:", emoji: "", displayName: "Meteor" },
    { id: ":nuke:", emoji: "", displayName: "Nuke" },
    { id: ":train:", emoji: "", displayName: "Train" },
    { id: ":lightning:", emoji: "", displayName: "Lightning" },
    { id: ":microwave:", emoji: "", displayName: "Microwave" },
    { id: ":amogus:", emoji: "", displayName: "Amogus" },
    { id: ":not_stonks:", emoji: "", displayName: "Not Stonks" },
    { id: ":subspace_tripmine:", emoji: "", displayName: "Subspace Tripmine" },
    { id: ":landmine:", emoji: "", displayName: "Landmine" },
    { id: ":skull_cry:", emoji: "", displayName: "Skull Cry" },
    { id: ":thumbs_up:", emoji: "", displayName: "Thumbs Up" },
    { id: ":thumbs_down:", emoji: "", displayName: "Thumbs Down" },
    { id: ":classic:", emoji: "", displayName: "Classic" },
    { id: ":blast:", emoji: "", displayName: "Blast" },
    { id: ":rapid:", emoji: "", displayName: "Rapid" },
    { id: ":stud:", emoji: "", displayName: "Stud" },
    { id: ":oneplate:", emoji: "", displayName: "One Plate" },
    { id: ":scattered:", emoji: "", displayName: "Scattered" },
    { id: ":lava:", emoji: "", displayName: "Lava" },
    { id: ":spleef:", emoji: "", displayName: "Spleef" },
    { id: ":line:", emoji: "", displayName: "Line" },
    { id: ":town:", emoji: "", displayName: "Town" },
    { id: ":ring:", emoji: "", displayName: "Ring" },
    { id: ":sweeper:", emoji: "", displayName: "Sweeper" },
    { id: ":twoplates:", emoji: "", displayName: "Two Plates" },
    { id: ":murdertown:", emoji: "", displayName: "Murder Town" },
    { id: ":sloweddown:", emoji: "", displayName: "Slowed Down" },
    { id: ":gear:", emoji: "", displayName: "Gear" },
    { id: ":hotel:", emoji: "", displayName: "Hotel" },
    { id: ":islands:", emoji: "", displayName: "Islands" },
    { id: ":cloud:", emoji: "", displayName: "Cloud" },
    { id: ":soda:", emoji: "", displayName: "Soda" },
    { id: ":red_soda:", emoji: "", displayName: "Red Soda" },
    { id: ":wolf:", emoji: "", displayName: "Wolf" },
    { id: ":cat:", emoji: "", displayName: "Cat" },
    { id: ":fox:", emoji: "", displayName: "Fox" },
    { id: ":titanic:", emoji: "", displayName: "Titanic" },
    { id: ":bunny:", emoji: "", displayName: "Bunny" },
    { id: ":wave:", emoji: "", displayName: "Wave" },
    { id: ":left:", emoji: "", displayName: "Left" },
    { id: ":down:", emoji: "", displayName: "Down" },
    { id: ":up:", emoji: "", displayName: "Up" },
    { id: ":right:", emoji: "", displayName: "Right" },
    { id: ":axolotl:", emoji: "", displayName: "Axolotl" },
    { id: ":frog:", emoji: "", displayName: "Frog" },
    { id: ":gun:", emoji: "", displayName: "Gun" },
    { id: ":panda:", emoji: "", displayName: "Panda" },
    { id: ":duck:", emoji: "", displayName: "Duck" },
    { id: ":parrot:", emoji: "", displayName: "Parrot" },
    { id: ":discord:", emoji: "", displayName: "Discord" },
    { id: ":bonnie_stare:", emoji: "", displayName: "Bonnie Stare" },
    { id: ":sip:", emoji: "", displayName: "Sip" },
    { id: ":cactus:", emoji: "", displayName: "Cactus" },
    { id: ":tree:", emoji: "", displayName: "Tree" },
    { id: ":win:", emoji: "", displayName: "Win" },
    { id: ":plant:", emoji: "", displayName: "Plant" },
    { id: ":bread:", emoji: "", displayName: "Bread" },
    { id: ":technoblade:", emoji: "", displayName: "Technoblade" },
    { id: ":bee:", emoji: "", displayName: "Bee" },
    { id: ":wah:", emoji: "", displayName: "Wah" },
    { id: ":doggo:", emoji: "", displayName: "Doggo" },
    { id: ":happy:", emoji: "", displayName: "Happy" },
    { id: ":dollar:", emoji: "", displayName: "Dollar" },
    { id: ":sandwich:", emoji: "", displayName: "Sandwich" },
    { id: ":test:", emoji: "", displayName: "Test" },
    { id: ":white_pigeon:", emoji: "", displayName: "White Pigeon" },
    { id: ":marsh:", emoji: "", displayName: "Marsh" },
    { id: ":couldron:", emoji: "", displayName: "Couldron" },
    { id: ":bat:", emoji: "", displayName: "Bat" },
    { id: ":candy:", emoji: "", displayName: "Candy" },
    { id: ":candy_heart:", emoji: "", displayName: "Candy Heart" },
    { id: ":grave:", emoji: "", displayName: "Grave" },
    { id: ":ghost:", emoji: "", displayName: "Ghost" },
    { id: ":pumpkin:", emoji: "", displayName: "Pumpkin" },
    { id: ":pie:", emoji: "", displayName: "Pie" },
    { id: ":knife:", emoji: "", displayName: "Knife" },
    { id: ":spookycat:", emoji: "", displayName: "Spooky Cat" },
    { id: ":alien:", emoji: "", displayName: "Alien" },
    { id: ":crow:", emoji: "", displayName: "Crow" },
    { id: ":ice_cream:", emoji: "", displayName: "Ice Cream" },
    { id: ":sad:", emoji: "", displayName: "Sad" },
    { id: ":laugh:", emoji: "", displayName: "Laugh" },
    { id: ":cool:", emoji: "", displayName: "Cool" },
    { id: ":moyai:", emoji: "", displayName: "Moyai" },
    { id: ":penguin:", emoji: "", displayName: "Penguin" },
    { id: ":popcorn:", emoji: "", displayName: "Popcorn" },
    { id: ":hammer:", emoji: "", displayName: "Hammer" },
    { id: ":robot:", emoji: "", displayName: "Robot" },
    { id: ":laundry:", emoji: "", displayName: "Laundry" },
    { id: ":star:", emoji: "", displayName: "Star" },
    { id: ":witch:", emoji: "", displayName: "Witch" },
    { id: ":spider:", emoji: "", displayName: "Spider" },
    { id: ":pot:", emoji: "", displayName: "Pot" },
    { id: ":lamp:", emoji: "", displayName: "Lamp" },
    { id: ":farmbales:", emoji: "", displayName: "Farm Bales" },
    { id: ":tree_ornament:", emoji: "", displayName: "Tree Ornament" },
    { id: ":carpet:", emoji: "", displayName: "Carpet" },
    { id: ":construction_site:", emoji: "", displayName: "Construction Site" },
    { id: ":yeeter:", emoji: "", displayName: "Yeeter" },
    { id: ":bushes:", emoji: "", displayName: "Bushes" },
    { id: ":snowy:", emoji: "", displayName: "Snowy" },
    { id: ":banana_ornament:", emoji: "", displayName: "Banana Ornament" },
    { id: ":sans:", emoji: "", displayName: "Sans" },
    { id: ":fan:", emoji: "", displayName: "Fan" },
    { id: ":mcdonalds:", emoji: "", displayName: "Mcdonalds" },
    { id: ":horns:", emoji: "", displayName: "Horns" },
    { id: ":melodie:", emoji: "", displayName: "Melodie" },
    { id: ":janet:", emoji: "", displayName: "Janet" },
    { id: ":halloween_theme:", emoji: "", displayName: "Halloween Theme" },
    { id: ":carved_pumpkin:", emoji: "", displayName: "Carved Pumpkin" },
    { id: ":engine:", emoji: "", displayName: "Engine" },
    { id: ":ufo:", emoji: "", displayName: "UFO" },
    { id: ":tropical_island:", emoji: "", displayName: "Tropical Island" },
    { id: ":yippie:", emoji: "", displayName: "Yippie" },
    { id: ":stonks:", emoji: "", displayName: "Stonks" },
    { id: ":antidote:", emoji: "", displayName: "Antidote" },
    { id: ":stack:", emoji: "", displayName: "Stack" },
    { id: ":heist:", emoji: "", displayName: "Heist" },
    { id: ":subspace:", emoji: "", displayName: "Subspace" },
    { id: ":subspace_town:", emoji: "", displayName: "Subspace Town" },
    { id: ":purple_ring:", emoji: "", displayName: "Purple Ring" },
    { id: ":blue_flame:", emoji: "", displayName: "Blue Flame" },
    { id: ":banana:", emoji: "", displayName: "Banana" },
    { id: ":subspace_soda:", emoji: "", displayName: "Subspace Soda" },
    { id: ":bonnie_plush:", emoji: "", displayName: "BonnieRobloxRIP Plush" },
    { id: ":ring_ornament:", emoji: "", displayName: "Ring Ornament" },
    { id: ":springtrap_plush:", emoji: "", displayName: "Springtrap Plush" },
    { id: ":alastor_plush:", emoji: "", displayName: "Alastor Plush" },
    { id: ":seal_plush:", emoji: "", displayName: "Seal Plush" },
    { id: ":world_trade_center:", emoji: "", displayName: "World Trade Center" },
    { id: ":baby_fox:", emoji: "", displayName: "Bany Fox" },
    { id: ":bed:", emoji: "", displayName: "Bed" },
    { id: ":bell:", emoji: "", displayName: "Bell" },
    { id: ":bms:", emoji: "", displayName: "Black Mesa" },
    { id: ":bouquet:", emoji: "", displayName: "Bouquet" },
    { id: ":hamburger:", emoji: "", displayName: "Hambuger" },
    { id: ":alert:", emoji: "", displayName: "Alert" },
    { id: ":bulgaria:", emoji: "", displayName: "Bulgaria" },
    { id: ":candy_cane:", emoji: "", displayName: "Candy Cane" },
    { id: ":car:", emoji: "", displayName: "Car" },
    { id: ":catblobhug:", emoji: "", displayName: "CatBlobHug" },
    { id: ":cheeseburger:", emoji: "", displayName: "Cheeseburger" },
    { id: ":christmas_bunny:", emoji: "", displayName: "Christmas Bunny" },
    { id: ":christmas_lights:", emoji: "", displayName: "Christmas Lights" },
    { id: ":christmas_tree:", emoji: "", displayName: "Christmas Tree" },
    { id: ":christmas_wreath:", emoji: "", displayName: "Christmas Wreath" },
    { id: ":clock:", emoji: "", displayName: "Clock" },
    { id: ":creeper:", emoji: "", displayName: "Creeper" },
    { id: ":dispatcher:", emoji: "", displayName: "Dispatcher" },
    { id: ":firework:", emoji: "", displayName: "Firework" },
    { id: ":friendly_campfire:", emoji: "", displayName: "Friendly Campfire" },
    { id: ":gingerbread_man:", emoji: "", displayName: "Gingerbread Man" },
    { id: ":grave_digger:", emoji: "", displayName: "Grave Digger" },
    { id: ":heart_on_fire:", emoji: "", displayName: "Heart on Fire" },
    { id: ":heartpulse:", emoji: "", displayName: "HeartPulse" },
    { id: ":heart_hands:", emoji: "", displayName: "Heart Hands" },
    { id: ":hot_chocolate:", emoji: "", displayName: "Hot Chocolate" },
    { id: ":kissing_face:", emoji: "", displayName: "Kissing Face" },
    { id: ":lambda:", emoji: "", displayName: "Lambda" },
    { id: ":frown:", emoji: "", displayName: "Frown" },
    { id: ":laugh_out_loud:", emoji: "", displayName: "Laugh out Loud" },
    { id: ":milk:", emoji: "", displayName: "Milk" },
    { id: ":christmas_ornament:", emoji: "", displayName: "Christmas Ornament" },
    { id: ":owl:", emoji: "", displayName: "Owl" },
    { id: ":phone:", emoji: "", displayName: "Phone" },
    { id: ":present:", emoji: "", displayName: "Present" },
    { id: ":present2:", emoji: "", displayName: "Present 2" },
    { id: ":crystal:", emoji: "", displayName: "Crystal" },
    { id: ":reindeer:", emoji: "", displayName: "Reindeer" },
    { id: ":ring2:", emoji: "", displayName: "Ring" },
    { id: ":santa:", emoji: "", displayName: "Santa" },
    { id: ":sleigh:", emoji: "", displayName: "Sleigh" },
    { id: ":snowglobe:", emoji: "", displayName: "Snowglobe" },
    { id: ":snowball:", emoji: "", displayName: "Snowball" },
    { id: ":snowflake:", emoji: "", displayName: "Snowflake" },
    { id: ":snowman:", emoji: "", displayName: "Snowman" },
    { id: ":strawberry:", emoji: "", displayName: "Strawberry" },
    { id: ":strawberry_cheesecake:", emoji: "", displayName: "Strawberry Cheesecake" },
    { id: ":smiling_face_with_3_hearts:", emoji: "", displayName: "Smiling Face with 3 Hearts" },
    { id: ":tomato:", emoji: "", displayName: "Tomato" },
    { id: ":2_hearts:", emoji: "", displayName: "2 Hearts" },
    { id: ":blue_heart:", emoji: "", displayName: "Blue Heart" },
    { id: ":orange_heart:", emoji: "", displayName: "Orange Heart" },
    { id: ":purple_heart:", emoji: "", displayName: "Purple Heart" },
    { id: ":red_heart:", emoji: "", displayName: "Red Heart" },
    { id: ":waa:", emoji: "", displayName: "Waa" },
    { id: ":usa:", emoji: "", displayName: "USA" },
    { id: ":subspace_plant:", emoji: "", displayName: "Subspace Plant" },
    { id: ":cat2:", emoji: "", displayName: "Cat 2" },
    { id: ":cat3:", emoji: "", displayName: "Cat 3" },
    { id: ":cat4:", emoji: "", displayName: "Cat 4" },
    { id: ":cat5:", emoji: "", displayName: "Cat 5" },
    { id: ":cat6:", emoji: "", displayName: "Cat 6" },
    { id: ":cat7:", emoji: "", displayName: "Cat 7" },
    { id: ":cat8:", emoji: "", displayName: "Cat 8" },
    { id: ":rabbit:", emoji: "", displayName: "Rabbit" },
    { id: ":rabbit2:", emoji: "", displayName: "Rabbit 2" },
    { id: ":rabbit3:", emoji: "", displayName: "Rabbit 3" },
    { id: ":rabbit4:", emoji: "", displayName: "Rabbit 4" },
    { id: ":rabbit5:", emoji: "", displayName: "Rabbit 5" },
    { id: ":rabbit6:", emoji: "", displayName: "Rabbit 6" }
]

const DEV_NAMETAG_PLAYERS = new Set([
    "bonnierobloxrip",
    "marshmallow997",
    "xxjustmaxxx7546"
]);

const DEV_NAMETAG_TAGS = new Set([
    "dev",
    "developer"
]);

const CHAT_MESSAGE_COOLDOWN_DEFAULT_MS = 1000;
const CHAT_MESSAGE_COOLDOWN_PROPERTY = "brr_chat_message_cooldown_ms";
let chatMessageCooldownMs = CHAT_MESSAGE_COOLDOWN_DEFAULT_MS;
const lastChatMessageAtByPlayer = new Map();
const MUTE_STATE_PROPERTY = "brr_mute_state";
const muteEntriesByPlayerId = new Map();
const BOOK_ITEM_IDS = new Set([
    "minecraft:writable_book",
    "minecraft:written_book",
    "minecraft:book_and_quill"
]);
const MUTED_NOTICE_COOLDOWN_MS = 1200;
const lastMutedNoticeAtByPlayer = new Map();

// SECTION: Moderation Helpers
function normalizeTextToken(raw) {
    const text = `${raw ?? ""}`.trim();
    const quoted = text.match(/^("|')(.*)\1$/);
    return `${quoted ? quoted[2] : text}`.trim();
}

function normalizePlayerName(raw) {
    return normalizeTextToken(raw).toLowerCase();
}

function formatDurationSeconds(totalSecondsRaw) {
    const totalSeconds = Number(totalSecondsRaw);
    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "0s";

    if (totalSeconds < 60) {
        return `${totalSeconds.toFixed(1).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1")}s`;
    }

    const rounded = Math.ceil(totalSeconds);
    const hours = Math.floor(rounded / 3600);
    const minutes = Math.floor((rounded % 3600) / 60);
    const seconds = rounded % 60;
    const parts = [];

    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

    return parts.join(" ");
}

function persistMuteState() {
    try {
        const serialized = JSON.stringify(Array.from(muteEntriesByPlayerId.values()));
        world.setDynamicProperty(MUTE_STATE_PROPERTY, serialized);
    } catch {
        // Keep runtime mute state even if persistence fails.
    }
}

function loadMuteState() {
    muteEntriesByPlayerId.clear();

    try {
        const raw = world.getDynamicProperty(MUTE_STATE_PROPERTY);
        if (typeof raw !== "string" || raw.trim().length === 0) {
            return;
        }

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return;
        }

        const now = Date.now();
        let hadExpired = false;

        for (const item of parsed) {
            const playerId = `${item?.playerId ?? ""}`.trim();
            const playerName = `${item?.playerName ?? ""}`.trim();
            const mutedBy = `${item?.mutedBy ?? ""}`.trim();
            const reason = `${item?.reason ?? ""}`.trim();
            const createdAt = Number(item?.createdAt ?? 0);
            const expiresAt = Number(item?.expiresAt ?? 0);

            if (!playerId || !Number.isFinite(expiresAt) || expiresAt <= now) {
                hadExpired = true;
                continue;
            }

            muteEntriesByPlayerId.set(playerId, {
                playerId,
                playerName,
                mutedBy,
                reason,
                createdAt: Number.isFinite(createdAt) ? createdAt : now,
                expiresAt
            });
        }

        if (hadExpired) {
            persistMuteState();
        }
    } catch {
        // Ignore malformed persisted mute state.
    }
}

function cleanupExpiredMutes() {
    const now = Date.now();
    let changed = false;

    for (const [playerId, entry] of muteEntriesByPlayerId.entries()) {
        if (Number(entry?.expiresAt ?? 0) <= now) {
            muteEntriesByPlayerId.delete(playerId);
            changed = true;
        }
    }

    if (changed) {
        persistMuteState();
    }
}

function getActiveMuteEntry(player) {
    const playerId = `${player?.id ?? ""}`.trim();
    if (!playerId) return null;

    const entry = muteEntriesByPlayerId.get(playerId);
    if (!entry) return null;

    if (Number(entry.expiresAt ?? 0) <= Date.now()) {
        muteEntriesByPlayerId.delete(playerId);
        persistMuteState();
        return null;
    }

    const currentName = `${player?.name ?? ""}`.trim();
    if (currentName && entry.playerName !== currentName) {
        entry.playerName = currentName;
        muteEntriesByPlayerId.set(playerId, entry);
        persistMuteState();
    }

    return entry;
}

function parseMuteDurationSeconds(rawDuration) {
    const durationSeconds = typeof rawDuration === "number"
        ? rawDuration
        : Number.parseFloat(`${rawDuration ?? ""}`.trim());

    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
        return undefined;
    }

    return durationSeconds;
}

function findOnlinePlayerByName(rawPlayerName) {
    const normalizedTarget = normalizePlayerName(rawPlayerName);
    if (!normalizedTarget) return undefined;

    return world.getPlayers().find(player => normalizePlayerName(player?.name) === normalizedTarget);
}

function getPlayerFromCommandInput(targetInput) {
    if (Array.isArray(targetInput)) {
        for (const value of targetInput) {
            const resolved = getPlayerFromCommandInput(value);
            if (resolved) return resolved;
        }
        return undefined;
    }

    if (targetInput && typeof targetInput === "object") {
        if (`${targetInput?.typeId ?? ""}` === "minecraft:player") {
            return targetInput;
        }
        return undefined;
    }

    return findOnlinePlayerByName(targetInput);
}

function setPlayerMute(targetPlayer, durationSeconds, mutedByName, reasonText) {
    const now = Date.now();
    const entry = {
        playerId: `${targetPlayer?.id ?? ""}`.trim(),
        playerName: `${targetPlayer?.name ?? ""}`.trim(),
        mutedBy: `${mutedByName ?? ""}`.trim(),
        reason: `${reasonText ?? ""}`.trim(),
        createdAt: now,
        expiresAt: now + Math.max(1, Math.round(durationSeconds * 1000))
    };

    if (!entry.playerId) return null;

    muteEntriesByPlayerId.set(entry.playerId, entry);
    persistMuteState();
    return entry;
}

function removeMuteByPlayerId(playerId) {
    const normalizedId = `${playerId ?? ""}`.trim();
    if (!normalizedId) return null;

    const existing = muteEntriesByPlayerId.get(normalizedId) ?? null;
    if (!existing) return null;

    muteEntriesByPlayerId.delete(normalizedId);
    persistMuteState();
    return existing;
}

function removeMuteByPlayerName(rawPlayerName) {
    const normalizedTarget = normalizePlayerName(rawPlayerName);
    if (!normalizedTarget) return null;

    for (const [playerId, entry] of muteEntriesByPlayerId.entries()) {
        if (normalizePlayerName(entry?.playerName) !== normalizedTarget) continue;

        muteEntriesByPlayerId.delete(playerId);
        persistMuteState();
        return entry;
    }

    return null;
}

function canRunModerationCommands(player) {
    if (!player) return false;
    if (!PlayerPermissionLevel) return true;

    return player.playerPermissionLevel === PlayerPermissionLevel.Operator;
}

function executeMuteCommand(actor, targetInput, durationRaw, reasonRaw) {
    const durationSeconds = parseMuteDurationSeconds(durationRaw);
    const reason = normalizeTextToken(reasonRaw);
    const targetPlayer = getPlayerFromCommandInput(targetInput);

    if (!targetInput) {
        actor.sendMessage("§cUsage: /mute <player> <duration> [reason]");
        return;
    }

    if (durationSeconds === undefined) {
        actor.sendMessage("§cInvalid duration. Use a number of seconds greater than 0.");
        return;
    }

    if (!targetPlayer) {
        actor.sendMessage("§cTarget player not found online.");
        return;
    }

    const muteEntry = setPlayerMute(targetPlayer, durationSeconds, actor.name, reason);
    if (!muteEntry) {
        actor.sendMessage("§cFailed to apply mute.");
        return;
    }

    const durationLabel = formatDurationSeconds(durationSeconds);
    const reasonSuffix = reason ? ` Reason: ${reason}` : "";

    actor.sendMessage(`§aMuted ${targetPlayer.name} for ${durationLabel}.${reasonSuffix}`);
    targetPlayer.sendMessage(`§cYou have been muted for ${durationLabel}.${reasonSuffix}`);
}

function executeUnmuteCommand(actor, targetInput, reasonRaw) {
    const reason = normalizeTextToken(reasonRaw);
    const targetPlayer = getPlayerFromCommandInput(targetInput);
    const targetName = targetPlayer ? `${targetPlayer.name ?? ""}`.trim() : normalizeTextToken(targetInput);

    if (!targetName) {
        actor.sendMessage("§cUsage: /unmute <player> [reason]");
        return;
    }

    const removedEntry = targetPlayer
        ? removeMuteByPlayerId(targetPlayer.id)
        : removeMuteByPlayerName(targetName);

    if (!removedEntry) {
        actor.sendMessage(`§e${targetName} is not muted.`);
        return;
    }

    const reasonSuffix = reason ? ` Reason: ${reason}` : "";
    const targetNameForDisplay = `${removedEntry.playerName ?? targetName}`.trim() || targetName;

    actor.sendMessage(`§aUnmuted ${targetNameForDisplay}.${reasonSuffix}`);

    const onlineTarget = world.getPlayers().find(player => `${player?.id ?? ""}` === `${removedEntry.playerId ?? ""}`);
    if (onlineTarget) {
        onlineTarget.sendMessage(`§aYou have been unmuted.${reasonSuffix}`);
    }
}

function getMuteBlockedMessage(entry) {
    const remainingSeconds = Math.max(0, (Number(entry?.expiresAt ?? 0) - Date.now()) / 1000);
    const remainingLabel = formatDurationSeconds(remainingSeconds);
    const reason = `${entry?.reason ?? ""}`.trim();

    if (reason) {
        return `§cYou are muted for ${remainingLabel}. Reason: ${reason}`;
    }

    return `§cYou are muted for ${remainingLabel}.`;
}

function sendMutedNotice(player, entry) {
    const key = `${player?.id ?? player?.name ?? ""}`;
    const now = Date.now();
    const lastSentAt = lastMutedNoticeAtByPlayer.get(key) ?? 0;

    if (now - lastSentAt < MUTED_NOTICE_COOLDOWN_MS) return;

    lastMutedNoticeAtByPlayer.set(key, now);
    player?.sendMessage?.(getMuteBlockedMessage(entry));
}

function isSignTypeId(typeId) {
    const normalized = `${typeId ?? ""}`.trim().toLowerCase();
    if (!normalized) return false;

    return normalized.endsWith("_sign") || normalized.endsWith(":sign") || normalized.endsWith("_wall_sign");
}

function isMutedRestrictedItem(typeId) {
    const normalized = `${typeId ?? ""}`.trim().toLowerCase();
    if (!normalized) return false;

    return BOOK_ITEM_IDS.has(normalized) || isSignTypeId(normalized);
}

function normalizeChatCooldownSeconds(rawSeconds) {
    const parsedSeconds = typeof rawSeconds === "number"
        ? rawSeconds
        : Number.parseFloat(`${rawSeconds ?? ""}`.trim());

    if (!Number.isFinite(parsedSeconds) || parsedSeconds < 0) {
        return undefined;
    }

    return parsedSeconds;
}

function applyChatCooldownMs(cooldownMs, persist = true) {
    const safeMs = Math.max(0, Math.round(cooldownMs));
    chatMessageCooldownMs = safeMs;

    if (safeMs === 0) {
        lastChatMessageAtByPlayer.clear();
    }

    if (!persist) return;

    try {
        world.setDynamicProperty(CHAT_MESSAGE_COOLDOWN_PROPERTY, safeMs);
    } catch {
        // Dynamic property can fail if called too early; runtime value still applies.
    }
}

function loadPersistedChatCooldown() {
    try {
        const storedValue = world.getDynamicProperty(CHAT_MESSAGE_COOLDOWN_PROPERTY);
        if (typeof storedValue === "number" && Number.isFinite(storedValue) && storedValue >= 0) {
            applyChatCooldownMs(storedValue, false);
            return;
        }
    } catch {
        // Keep default cooldown if dynamic properties are unavailable.
    }

    applyChatCooldownMs(CHAT_MESSAGE_COOLDOWN_DEFAULT_MS, false);
}

// SECTION: Chat Cooldown Controls
export function getChatCooldownSeconds() {
    return chatMessageCooldownMs / 1000;
}

export function setChatCooldownSeconds(rawSeconds) {
    const parsedSeconds = normalizeChatCooldownSeconds(rawSeconds);
    if (parsedSeconds === undefined) {
        return undefined;
    }

    applyChatCooldownMs(parsedSeconds * 1000, true);
    return getChatCooldownSeconds();
}

system.run(() => {
    loadPersistedChatCooldown();
    loadMuteState();
});

system.runInterval(() => {
    cleanupExpiredMutes();
}, 20);

function isDevNametagPlayer(playerOrName) {
    const name = typeof playerOrName === "string" ? playerOrName : playerOrName?.name;
    const normalizedName = `${name ?? ""}`.trim().toLowerCase();
    if (DEV_NAMETAG_PLAYERS.has(normalizedName)) return true;

    if (typeof playerOrName === "object" && playerOrName) {
        try {
            const tags = playerOrName.getTags();
            return tags.some((tag) => DEV_NAMETAG_TAGS.has(`${tag ?? ""}`.trim().toLowerCase()));
        } catch {
            return false;
        }
    }

    return false;
}

function sendWhisperMirrorToDevs(sender, targetName, processedMessage) {
    const senderTags = sender.getTags();
    const rankPrefix = chatRank(sender, senderTags);
    const mirrorText = `§8[Dev Whisper] §r${rankPrefix}§r${sender.name} §7-> §r${targetName}: §f${processedMessage}`;

    for (const onlinePlayer of world.getPlayers()) {
        if (!isDevNametagPlayer(onlinePlayer)) continue;
        if (onlinePlayer.id === sender.id) continue;
        if (onlinePlayer.name === targetName) continue;

        try {
            onlinePlayer.sendMessage(mirrorText);
        } catch {
            // Skip recipients that cannot be messaged this tick.
        }
    }
}

function getCustomNametagParts(player, context) {
    try {
        const raw = player.getDynamicProperty("brr_nametag");
        if (typeof raw !== "string" || raw.length === 0) return { prefix: "", suffix: "" };

        const data = JSON.parse(raw);
        if (context === "chat") {
            if (typeof data?.chatPrefix === "string" || typeof data?.chatSuffix === "string") {
                return {
                    prefix: `${data?.chatPrefix ?? ""}`,
                    suffix: `${data?.chatSuffix ?? ""}`
                };
            }
        }

        if (context === "username") {
            if (typeof data?.usernamePrefix === "string" || typeof data?.usernameSuffix === "string") {
                return {
                    prefix: `${data?.usernamePrefix ?? ""}`,
                    suffix: `${data?.usernameSuffix ?? ""}`
                };
            }
        }

        const legacyNametag = `${data?.nametag ?? ""}`.trim();
        if (!legacyNametag) return { prefix: "", suffix: "" };

        const formattedLegacyTag = `[${legacyNametag}§r] `;
        const isChatContext = context === "chat";
        const isUsernameContext = context === "username";
        const enabledForContext = (isChatContext && Boolean(data?.worksInChat)) || (isUsernameContext && Boolean(data?.worksInUsernames));
        if (!enabledForContext) return { prefix: "", suffix: "" };

        const wantsPrefix = data?.prefix !== false;
        const wantsSuffix = Boolean(data?.suffix);
        return {
            prefix: wantsPrefix ? formattedLegacyTag : "",
            suffix: wantsSuffix ? formattedLegacyTag : ""
        };
    } catch {
        return { prefix: "", suffix: "" };
    }
}

function normalizeChatMessage(rawMessage) {
    return `${rawMessage ?? ""}`
        .replaceAll("\n", " ")
        .replaceAll("%", "%%");
}

// SECTION: Chat Formatting Helpers
export function applyEmojiReplacements(message) {
    let processedMessage = message;
    for (const emoji of emojis) {
        processedMessage = processedMessage.replaceAll(emoji.id, emoji.emoji);
    }
    return processedMessage;
}

export function sendRankedMessage(player, rawMessage) {
    const muteEntry = getActiveMuteEntry(player);
    if (muteEntry) {
        sendMutedNotice(player, muteEntry);
        return;
    }

    const tags = player.getTags();
    const rankPrefix = chatRank(player, tags);
    const nametagParts = getCustomNametagParts(player, "chat");

    const processedMessage = applyEmojiReplacements(normalizeChatMessage(rawMessage));

    const text = `§r${rankPrefix}${nametagParts.prefix}§r${player.name}${nametagParts.suffix}: §f${processedMessage}`;
    world.sendMessage({ rawtext: [{ text: text }] });
}

export function chatRank(player, tags) {
    let rankPrefix = "";

    // Dev Ranks
    if (isDevNametagPlayer(player)) {
        rankPrefix += "[§l§dDev§r] ";
    }
    if (["DinoDaniel21"].includes(player.name)) {
        rankPrefix += "[§l§dContributor§r] ";
    }

    // Special Tags
    if (tags.includes("mega_vip")) rankPrefix += "[§l§o§aM§2E§sG§bA §sV.§2I.§aP.§r] ";
    if (tags.includes("vip") && !tags.includes("mega_vip")) rankPrefix += "[§e§l§oV.§gI.§6P.§r] ";

    // Fun Tags
    if (tags.includes("begger")) rankPrefix += "[§d§lBegger§r]";
    if (tags.includes("sweat")) rankPrefix += "[§g§lSWEAT§r]";
    if (tags.includes("grinder")) rankPrefix += "[§6§lGRINDER§r]";
    if (tags.includes("mace_god")) rankPrefix += "[§5§lMace God§r]";
    if (tags.includes("frog")) rankPrefix += "[§2§lFr§ao§bg§r]";
    if (tags.includes("tank")) rankPrefix += "[§8§lTank§r]";
    if (tags.includes("icecream")) rankPrefix += "[§r]";
    if (tags.includes("skull")) rankPrefix += "[§r]";
    if (tags.includes("yt")) rankPrefix += "[§4You§fTuber§r]";
    if (tags.includes("strawberry")) rankPrefix += "[§r]";

    if (tags.includes("lobby") && !tags.includes("game")) rankPrefix += "[§b§lLobby§r] ";
    if (tags.includes("game")) rankPrefix += "[§a§lGamer§r] ";

    return rankPrefix;
}

export function nametagRank(player, tags) {
    let rankPrefix = "";

    if (player.name === "BonnieRobloxRIP") rankPrefix += " ";

    if (isDevNametagPlayer(player)) {
        rankPrefix += "[§l§dDev§r] ";
    }
    if (["DinoDaniel21"].includes(player.name)) {
        rankPrefix += "[§l§dContributor§r] ";
    }

    // Special tags
    if (tags.includes("mega_vip")) rankPrefix += "[§l§o§aM§2E§sG§bA §sV.§2I.§aP.§r] ";
    if (tags.includes("vip") && !tags.includes("mega_vip")) rankPrefix += "[§e§l§oV.§gI.§6P.§r] ";

    // Fun Tags
    if (tags.includes("begger")) rankPrefix += "[§d§lBegger§r]";
    if (tags.includes("sweat")) rankPrefix += "[§g§lSWEAT§r]";
    if (tags.includes("grinder")) rankPrefix += "[§6§lGRINDER§r]";
    if (tags.includes("mace_god")) rankPrefix += "[§5§lMace God§r]";
    if (tags.includes("frog")) rankPrefix += "[§2§lFr§ao§bg§r]";
    if (tags.includes("stop")) rankPrefix += "[§4§l§oAFK§r]";
    if (tags.includes("tank")) rankPrefix += "[§8§lTank§r]";
    if (tags.includes("icecream")) rankPrefix += "[§r]";
    if (tags.includes("skull")) rankPrefix += "[§r]";
    if (tags.includes("yt")) rankPrefix += "[§4You§fTuber§r]";
    if (tags.includes("strawberry")) rankPrefix += "[§r]";

    if (tags.includes("lobby") && !tags.includes("game")) rankPrefix += "[§b§lLobby§r] ";
    if (tags.includes("game")) rankPrefix += "[§a§lGamer§r] ";

    return rankPrefix;
}

// SECTION: Message Handling
export function handleMessage() {
    try {
        world.beforeEvents.chatSend.subscribe((data) => {
            const player = data.sender;
            const tags = player.getTags();
            let message = data.message;
            const nametagParts = getCustomNametagParts(player, "chat");

            const trimmedMessage = `${message ?? ""}`.trim();

            const brrCooldownMatch = trimmedMessage.match(/^\/brr\s+adjust_chat_cooldown\s+(.+)$/i);
            if (brrCooldownMatch) {
                data.cancel = true;

                if (!canRunModerationCommands(player)) {
                    player.sendMessage("§cYou do not have permission to adjust chat cooldown.");
                    return;
                }

                const rawCooldown = normalizeTextToken(brrCooldownMatch[1]);
                const appliedSeconds = setChatCooldownSeconds(rawCooldown);
                if (appliedSeconds === undefined) {
                    player.sendMessage("§cInvalid value. Use a number >= 0 (examples: 0, 0.1, 1).");
                    return;
                }

                const formattedSeconds = appliedSeconds
                    .toFixed(3)
                    .replace(/\.0+$/, "")
                    .replace(/(\.\d*?)0+$/, "$1");

                player.sendMessage(`§aChat cooldown set to ${formattedSeconds} second(s).`);
                return;
            }

            const muteCommandMatch = trimmedMessage.match(/^\/mute\s+(\S+)\s+(\S+)(?:\s+(.+))?$/i);
            if (muteCommandMatch) {
                data.cancel = true;

                if (!canRunModerationCommands(player)) {
                    player.sendMessage("§cYou do not have permission to use /mute.");
                    return;
                }

                executeMuteCommand(player, muteCommandMatch[1], muteCommandMatch[2], muteCommandMatch[3] ?? "");
                return;
            }

            const unmuteCommandMatch = trimmedMessage.match(/^\/unmute\s+(\S+)(?:\s+(.+))?$/i);
            if (unmuteCommandMatch) {
                data.cancel = true;

                if (!canRunModerationCommands(player)) {
                    player.sendMessage("§cYou do not have permission to use /unmute.");
                    return;
                }

                executeUnmuteCommand(player, unmuteCommandMatch[1], unmuteCommandMatch[2] ?? "");
                return;
            }

            const normalizedMessage = `${message ?? ""}`.trim().toLowerCase();
            if (normalizedMessage === "!emojis" || normalizedMessage === "/emojis" || normalizedMessage === "/brr:emojis") {
                data.cancel = true;
                system.run(() => showMainMenu(player));
                return;
            }

            const muteEntry = getActiveMuteEntry(player);
            if (muteEntry) {
                data.cancel = true;
                sendMutedNotice(player, muteEntry);
                return;
            }

            const cooldownKey = `${player?.id ?? player?.name ?? ""}`;
            const now = Date.now();
            const lastMessageAt = lastChatMessageAtByPlayer.get(cooldownKey) ?? 0;
            if (chatMessageCooldownMs > 0 && now - lastMessageAt < chatMessageCooldownMs) {
                data.cancel = true;
                player.sendMessage("§cDon't you dare spam!");
                return;
            }
            lastChatMessageAtByPlayer.set(cooldownKey, now);

            message = applyEmojiReplacements(normalizeChatMessage(message));

            const rankPrefix = chatRank(player, tags);

            // Send the message
            const text = `§r${rankPrefix}${nametagParts.prefix}§r${player.name}${nametagParts.suffix}: §f${message}`;
            world.sendMessage({ rawtext: [{ text: text }] });
            data.cancel = true;
        });
    } catch { }

    system.runInterval(() => {
        const allPlayers = world.getPlayers();
        const playerNames = allPlayers.map(p => p.name);
        const bothDevsOnline = playerNames.includes("BonnieRobloxRIP") && playerNames.includes("Marshmallow997");

        for (const player of allPlayers) {
            const tags = player.getTags();
            const rankPrefix = nametagRank(player, tags, bothDevsOnline);
            const nametagParts = getCustomNametagParts(player, "username");
            player.nameTag = `${rankPrefix}${nametagParts.prefix}${player.name}${nametagParts.suffix}`;
        }
    }, 20);
}
try {
    handleMessage();
} catch { }

// SECTION: Mute Restriction Event Hooks
try {
    world.afterEvents.itemUse.subscribe((eventData) => {
        const player = eventData.source;
        const itemId = eventData.itemStack.typeId;

        if (itemId === "brr:dino_speecher") {
            const muteEntry = getActiveMuteEntry(player);
            if (muteEntry) {
                sendMutedNotice(player, muteEntry);
                return;
            }

            showDinoSpeecherMenu(player);
            return;
        }
    });
} catch { }

try {
    const itemUseBeforeSignal = world.beforeEvents?.itemUse;
    if (itemUseBeforeSignal) {
        itemUseBeforeSignal.subscribe((eventData) => {
            const player = eventData?.source;
            if (!player || player.typeId !== "minecraft:player") return;

            const muteEntry = getActiveMuteEntry(player);
            if (!muteEntry) return;

            const itemId = `${eventData?.itemStack?.typeId ?? ""}`;
            if (!isMutedRestrictedItem(itemId)) return;

            eventData.cancel = true;
            sendMutedNotice(player, muteEntry);
        });
    }
} catch { }

try {
    const itemUseOnBeforeSignal = world.beforeEvents?.itemUseOn;
    if (itemUseOnBeforeSignal) {
        itemUseOnBeforeSignal.subscribe((eventData) => {
            const player = eventData?.source;
            if (!player || player.typeId !== "minecraft:player") return;

            const muteEntry = getActiveMuteEntry(player);
            if (!muteEntry) return;

            const itemId = `${eventData?.itemStack?.typeId ?? ""}`;
            if (!isMutedRestrictedItem(itemId)) return;

            eventData.cancel = true;
            sendMutedNotice(player, muteEntry);
        });
    }
} catch { }

try {
    const playerInteractWithBlockBeforeSignal = world.beforeEvents?.playerInteractWithBlock;
    if (playerInteractWithBlockBeforeSignal) {
        playerInteractWithBlockBeforeSignal.subscribe((eventData) => {
            const player = eventData?.player;
            if (!player) return;

            const muteEntry = getActiveMuteEntry(player);
            if (!muteEntry) return;

            const blockTypeId = `${eventData?.block?.typeId ?? ""}`;
            if (!isSignTypeId(blockTypeId)) return;

            eventData.cancel = true;
            sendMutedNotice(player, muteEntry);
        });
    }
} catch { }

// SECTION: Command Registration
export function emojiCommand(data) {
    if (!data?.customCommandRegistry || !CommandPermissionLevel) {
        return;
    }

    const registry = data.customCommandRegistry;

    function registerCommandAliases(baseConfig, callback, names) {
        for (const name of names) {
            try {
                registry.registerCommand(
                    {
                        ...baseConfig,
                        name
                    },
                    callback
                );
            } catch {
                // Ignore unavailable aliases or duplicate registrations.
            }
        }
    }

    registerCommandAliases(
        {
            description: "Open the emoji list menu",
            permissionLevel: CommandPermissionLevel.Any,
            mandatoryParameters: [],
        },
        (origin) => {
            const player = origin.sourceEntity;
            if (player && player.typeId === "minecraft:player") {
                system.run(() => showMainMenu(player));
            }
        },
        ["brr:emojis", "emojis"]
    );

    if (!CustomCommandParamType) return;

    registerCommandAliases(
        {
            description: "Mute a player",
            permissionLevel: CommandPermissionLevel.GameDirectors,
            mandatoryParameters: [
                { name: "player", type: CustomCommandParamType.PlayerSelector ?? CustomCommandParamType.String },
                { name: "duration_seconds", type: CustomCommandParamType.Float }
            ],
            optionalParameters: [
                { name: "reason", type: CustomCommandParamType.String }
            ]
        },
        (origin, targetNameRaw, durationRaw, reasonRaw) => {
            const actor = origin?.sourceEntity;
            if (!actor || actor.typeId !== "minecraft:player") return;
            executeMuteCommand(actor, targetNameRaw, durationRaw, reasonRaw);
        },
        ["brr:mute", "mute"]
    );

    registerCommandAliases(
        {
            description: "Unmute a player",
            permissionLevel: CommandPermissionLevel.GameDirectors,
            mandatoryParameters: [
                { name: "player", type: CustomCommandParamType.PlayerSelector ?? CustomCommandParamType.String }
            ],
            optionalParameters: [
                { name: "reason", type: CustomCommandParamType.String }
            ]
        },
        (origin, targetNameRaw, reasonRaw) => {
            const actor = origin?.sourceEntity;
            if (!actor || actor.typeId !== "minecraft:player") return;
            executeUnmuteCommand(actor, targetNameRaw, reasonRaw);
        },
        ["brr:unmute", "unmute"]
    );
}



// SECTION: Menu UI
export function showMainMenu(player) {
    const form = new ActionFormData()
        .title(" Emoji List ");

    for (const emoji of emojis) {
        form.button(`${emoji.emoji} ${emoji.id} ${emoji.displayName}`);
    }

    form.show(player).then(response => {
        if (response.canceled) return;

        const selectedEmoji = emojis[response.selection];

        if (selectedEmoji) {
            sendRankedMessage(player, selectedEmoji.emoji);
            system.run(() => showMainMenu(player));
        }
    });
}

export function showDinoSpeecherMenu(player) {
    const muteEntry = getActiveMuteEntry(player);
    if (muteEntry) {
        sendMutedNotice(player, muteEntry);
        return;
    }

    const TARGET_PROPERTY = "brr_dino_speecher_target";

    // Get all players for the dropdown
    const allPlayers = world.getPlayers();
    const playerNames = allPlayers
        .map(p => `${p?.name ?? ""}`.trim())
        .filter(name => name.length > 0);

    // Add "None" as the first option for public chat
    const options = ["None (Public Chat)", ...playerNames];

    const savedTargetRaw = `${player.getDynamicProperty(TARGET_PROPERTY) ?? ""}`.trim();
    const savedTarget = savedTargetRaw.toLowerCase() === "none" ? "" : savedTargetRaw;
    const defaultValueIndex = savedTarget ? Math.max(0, options.indexOf(savedTarget)) : 0;

    const form = new ModalFormData()
        .title("Dino Speecher ")
        .dropdown("Select a player to whisper to:", options, { defaultValueIndex })
        .textField("Message:", "Type your message here...");

    form.show(player).then(response => {
        if (response.canceled) return;

        const [selectionIndex, rawMessage] = response.formValues;
        const messageText = `${rawMessage ?? ""}`;

        const selectedTargetName = options[selectionIndex] ?? options[0];
        const targetToStore = selectionIndex === 0 ? "none" : selectedTargetName;
        try {
            player.setDynamicProperty(TARGET_PROPERTY, targetToStore);
        } catch { }

        // Make sure message isn't empty
        if (messageText.trim().length === 0) return;

        const latestMuteEntry = getActiveMuteEntry(player);
        if (latestMuteEntry) {
            sendMutedNotice(player, latestMuteEntry);
            return;
        }

        if (selectionIndex === 0) {
            // - Option 1: Public Chat (None selected)
            sendRankedMessage(player, messageText);
        } else {
            // - Option 2: Private Whisper
            const targetName = options[selectionIndex];
            const targetPlayer = allPlayers.find(p => p.name === targetName);

            if (targetPlayer) {
                // Get Rank Prefix
                const tags = player.getTags();
                const rankPrefix = chatRank(player, tags);

                // Process Emojis manually for the whisper
                let processedMessage = applyEmojiReplacements(normalizeChatMessage(messageText));

                // Format: Rank + Name + "whispers to you:" + Message
                const whisperText = `§r${rankPrefix}§r${player.name} §iwhispers to you: §f${processedMessage}`;

                // Send to Target
                targetPlayer.sendMessage(whisperText);

                // Confirmation for the sender
                player.sendMessage(`§7You whisper to ${targetName}: ${processedMessage}`);

                // Mirror whispers to all online dev nametag players.
                sendWhisperMirrorToDevs(player, targetName, processedMessage);
            } else {
                player.sendMessage("§cTarget player not found (they may have left).");
            }
        }
    });
}
