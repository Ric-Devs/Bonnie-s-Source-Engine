import * as mc from "@minecraft/server";
import { applyEmojiReplacements, emojiCommand, setChatCooldownSeconds } from "./handler/chat_system.js";
import { evaluateCondition, validateConditionRequirements } from "./handler/condition_executer.js";
import { conditionTools } from "./tool_ui/conditions_tools.js";
import { areaPortalToolUI, handleAreaPortalBlock } from "./tool_ui/tool_areaportal.js";
import { infoPlayerspawnUI, getPlayerspawnSpawnConfig, getActivePlayerspawnBlocks, applySpawnPointForPlayer, applyWorldSpawnPoint, getPlayerspawnTargets } from "./tool_ui/info_playerspawn.js";
import { infoTargetAreaportalUI } from "./tool_ui/info_target_areaportal.js";
import { gameNametagUI, getGameNametagTargets } from "./tool_ui/game_nametag.js";
import { toolInvisibleUI, getHiddenPlaceholderType } from "./tool_ui/tool_invisible.js";
import { toolPlayerclipUI, applyPlayerclipRepel } from "./tool_ui/tool_playerclip.js";
import { toolNpcclipUI, shouldEnableNpcclipCollision, applyNpcclipRepel } from "./tool_ui/tool_npcclip.js";
import { triggerToolUI as showTriggerToolUI, fireOutputsForEvent, getNormalizedTriggerData, isBlockedTriggerCommand } from "./tool_ui/tool_trigger.js";
import { blockParticles } from "./handler/block_particles.js";
import "./handler/pet.js";
import "./handler/gluon_gun.js";
import "./handler/tau_cannon.js";
import "./handler/crowbar.js";
import "./handler/glock17.js";
import "./handler/magnum357.js";
import { logicAutoUI } from "./tool_ui/logic_auto.js";
import { logicBranchUI } from "./tool_ui/logic_branch.js";
import { logicCaseUI } from "./tool_ui/logic_case.js";
import { logicCompareUI } from "./tool_ui/logic_compare.js";
import { logicCoopManagerUI } from "./tool_ui/logic_coop_manager.js";
import { logicRandomOutputsUI } from "./tool_ui/logic_random_outputs.js";
import { logicTimerUI } from "./tool_ui/logic_timer.js";
import { tickLogicBlocks } from "./handler/logic_blocks.js";
import { outputClassInfoTargets } from "./tool_ui/output_ci_targets.js";

const { world, system } = mc;
const GameMode = mc.GameMode;
const PlayerPermissionLevel = mc.PlayerPermissionLevel;
const CommandPermissionLevel = mc.CommandPermissionLevel;
const CustomCommandParamType = mc.CustomCommandParamType;

// SECTION: Global State & Constants
let visible = false;
let toolsEnabled = true;
const PLAYERCLIP_PUSH_COOLDOWN_MS = 140;
const NPCCLIP_REPEL_COOLDOWN_MS = 140;
const TRIGGER_INTERACT_COOLDOWN_MS = 500;
const playerclipPushCooldowns = new Map();
const playerclipLastSafePositions = new Map();
const npcclipRepelCooldowns = new Map();
const npcclipLastSafePositions = new Map();
const TOOL_BLOCK_TYPES = ["brr:tool_areaportal", "brr:info_playerspawn_block", "brr:tool_invisible", "brr:tool_trigger", "brr:info_target_areaportal_block", "brr:tool_blocklight", "brr:tool_playerclip", "brr:tool_npcclip", "brr:game_nametag_block", "brr:logic_auto_block", "brr:logic_branch_block", "brr:logic_case_block", "brr:logic_compare_block", "brr:logic_coop_manager_block", "brr:logic_random_outputs_block", "brr:logic_timer_block"];
const COLLISION_BLOCK_TYPES = ["brr:tool_invisible", "brr:tool_playerclip", "brr:tool_npcclip"];
const LIGHT_BLOCK_TYPES = ["brr:tool_blocklight"];
const ITEM_TO_BLOCK_MAP = {
    "brr:info_playerspawn": "brr:info_playerspawn_block",
    "brr:info_target_areaportal": "brr:info_target_areaportal_block",
    "brr:game_nametag": "brr:game_nametag_block",
    "brr:logic_auto": "brr:logic_auto_block",
    "brr:logic_branch": "brr:logic_branch_block",
    "brr:logic_case": "brr:logic_case_block",
    "brr:logic_compare": "brr:logic_compare_block",
    "brr:logic_coop_manager": "brr:logic_coop_manager_block",
    "brr:logic_random_outputs": "brr:logic_random_outputs_block",
    "brr:logic_timer": "brr:logic_timer_block"
};
const MAX_SIZE = 28000;
const TRIGGER_OUTPUT_TYPES = ["onTrue", "onFalse"];
const TRIGGER_INPUTS = ["startDisabled", "selector", "destination", "destinationBlock", "targetFacingDirection", "worldSpawnAtBlock", "worldSpawn", "executeOnConditon", "triggerConditionValue1", "triggerConditionValue2", "triggerConditionValue3", "runCommand", "playerclipExcludeOperators", "playerclipExcludeGamemode", "playerclipExcludeSelector", "npcclipExcludeSelector", "worksInUsernames", "worksInChat", "suffix", "prefix", "nametag", "nametagOrder", "selectors"];
const ADVENTURE_PERMISSION_MESSAGE_COOLDOWN_MS = 1000;
const ADVENTURE_COMMAND_TO_KEY = {
    can_use_pots: "canUsePots",
    can_use_shelves: "canUseShelves",
    can_use_trapdoors: "canUseTrapdoors",
    can_use_doors: "canUseDoors",
    can_use_itemframes: "canUseItemframes",
    can_use_candles: "canUseCandles",
    can_use_all: "canUseAll"
};
const ADVENTURE_KEY_TO_PROPERTY = {
    canUsePots: "can_use_pots",
    canUseShelves: "can_use_shelves",
    canUseTrapdoors: "can_use_trapdoors",
    canUseDoors: "can_use_doors",
    canUseItemframes: "can_use_itemframes",
    canUseCandles: "can_use_candles",
    canUseAll: "can_use_all"
};
const ADVENTURE_BLOCKED_MESSAGES = {
    canUsePots: "You cannot use flower pots right now.",
    canUseShelves: "You cannot use shelves right now.",
    canUseTrapdoors: "You cannot use trapdoors right now.",
    canUseDoors: "You cannot use doors right now.",
    canUseItemframes: "You cannot use item frames right now.",
    canUseCandles: "You cannot use candles right now."
};
const ADJACENT_DIRECTIONS = [
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 },
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 }
];
const adventureInteractionMessageCooldowns = new Map();
const adventureInteractionPermissions = {
    canUsePots: true,
    canUseShelves: true,
    canUseTrapdoors: true,
    canUseDoors: true,
    canUseItemframes: true,
    canUseCandles: true,
    canUseAll: true
};

// SECTION: Block Grouping & Placement Helpers
function getAdjacentPositions(x, y, z) {
    return ADJACENT_DIRECTIONS.map(dir => ({ x: x + dir.x, y: y + dir.y, z: z + dir.z }));
}

function generateGroupId() {
    return `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function isToolNamespaceBlock(typeId) {
    return typeof typeId === "string" && typeId.startsWith("brr:tool_");
}

function getAdjacentGroupIds(blocks, x, y, z, dimension, blockType) {
    const adjPositions = getAdjacentPositions(x, y, z);
    const adjBlocks = blocks.filter(b =>
        b.dimension === dimension &&
        adjPositions.some(pos => pos.x === b.x && pos.y === b.y && pos.z === b.z) &&
        b.typeId === blockType
    );

    return [...new Set(adjBlocks.map(b => b.groupId).filter(id => id))];
}

function mergeToolGroups(blocks, blockType, groupIds, newGroupId) {
    if (!Array.isArray(groupIds) || groupIds.length <= 1) return;

    const sourceBlock = blocks.find(b => b.groupId === newGroupId && b.typeId === blockType && b.data);
    const sharedData = sourceBlock?.data ? JSON.parse(JSON.stringify(sourceBlock.data)) : null;

    blocks.forEach(block => {
        if (groupIds.includes(block.groupId) && block.typeId === blockType) {
            block.groupId = newGroupId;
            if (sharedData) {
                block.data = JSON.parse(JSON.stringify(sharedData));
            }
        }
    });
}

function getActiveVisibleBlockTypes() {
    const activeTypes = new Set();

    for (const player of world.getPlayers()) {
        const equip = player.getComponent("minecraft:equippable");
        const mainhand = equip?.getEquipment("Mainhand");
        const heldType = mainhand?.typeId ?? "minecraft:air";

        if (TOOL_BLOCK_TYPES.includes(heldType)) {
            activeTypes.add(heldType);
        }

        if (ITEM_TO_BLOCK_MAP[heldType]) {
            activeTypes.add(ITEM_TO_BLOCK_MAP[heldType]);
        }
    }

    return activeTypes;
}

// SECTION: Player & Proximity Helpers
function isPlayerInCreative(player) {
    if (!player) return false;

    if (typeof player.getGameMode === "function") {
        try {
            return `${player.getGameMode()}`.toLowerCase() === "creative";
        } catch { }
    }

    try {
        return (player.runCommand("testfor @s[m=creative]")?.successCount ?? 0) > 0;
    } catch { }

    try {
        return (player.runCommand("testfor @s[m=1]")?.successCount ?? 0) > 0;
    } catch { }

    return false;
}

function isPlayerOperator(player) {
    if (!player) return false;

    try {
        if (PlayerPermissionLevel) {
            return player.playerPermissionLevel === PlayerPermissionLevel.Operator;
        }
    } catch { }

    try {
        return (player.runCommand("testfor @s[haspermission={operator=true}]")?.successCount ?? 0) > 0;
    } catch { }

    return false;
}

function isPlayerInAdventure(player) {
    return player?.getGameMode?.() === GameMode.Adventure;
}

function getPlayerGameMode(player) {
    if (!player) return "";

    if (typeof player.getGameMode === "function") {
        try {
            return `${player.getGameMode()}`.trim().toLowerCase();
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

function persistAdventurePermissions() {
    for (const [permissionKey, propertyId] of Object.entries(ADVENTURE_KEY_TO_PROPERTY)) {
        world.setDynamicProperty(propertyId, adventureInteractionPermissions[permissionKey]);
    }
}

function setAdventurePermission(permissionKey, enabled) {
    const normalizedValue = !!enabled;

    if (permissionKey === "canUseAll") {
        adventureInteractionPermissions.canUsePots = normalizedValue;
        adventureInteractionPermissions.canUseShelves = normalizedValue;
        adventureInteractionPermissions.canUseTrapdoors = normalizedValue;
        adventureInteractionPermissions.canUseDoors = normalizedValue;
        adventureInteractionPermissions.canUseItemframes = normalizedValue;
        adventureInteractionPermissions.canUseCandles = normalizedValue;
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
        && adventureInteractionPermissions.canUseCandles;
    persistAdventurePermissions();
}

function getAdventurePermissionForBlock(blockTypeId) {
    const normalizedTypeId = `${blockTypeId ?? ""}`;
    if (!normalizedTypeId) return undefined;

    if (normalizedTypeId === "minecraft:flower_pot") return "canUsePots";
    if (normalizedTypeId === "minecraft:chiseled_bookshelf" || normalizedTypeId === "minecraft:bookshelf") return "canUseShelves";
    if (normalizedTypeId.endsWith("_trapdoor")) return "canUseTrapdoors";
    if (normalizedTypeId.endsWith("_door")) return "canUseDoors";
    if (normalizedTypeId.includes("_candle") || normalizedTypeId === "minecraft:candle") return "canUseCandles";

    return undefined;
}

function getAdventurePermissionForEntityInteraction(entityTypeId) {
    const normalizedTypeId = `${entityTypeId ?? ""}`;
    if (!normalizedTypeId) return undefined;

    if (normalizedTypeId === "minecraft:item_frame" || normalizedTypeId === "minecraft:glow_item_frame") {
        return "canUseItemframes";
    }

    return undefined;
}

function shouldBlockAdventureInteraction(player, blockTypeId) {
    if (!isPlayerInAdventure(player)) return false;

    const permissionKey = getAdventurePermissionForBlock(blockTypeId);
    if (!permissionKey) return false;

    return !adventureInteractionPermissions[permissionKey];
}

function notifyAdventureInteractionBlocked(player, permissionKey) {
    if (!player?.id || !permissionKey) return;

    const now = Date.now();
    const previous = adventureInteractionMessageCooldowns.get(player.id) ?? 0;
    if (now - previous < ADVENTURE_PERMISSION_MESSAGE_COOLDOWN_MS) return;

    adventureInteractionMessageCooldowns.set(player.id, now);
    player.sendMessage(ADVENTURE_BLOCKED_MESSAGES[permissionKey] ?? "You cannot use that block right now.");
}

function isPositionNearBlock(pos, block, expand = 0.35) {
    if (!pos || !block) return false;

    return pos.x >= block.x - expand && pos.x <= block.x + 1 + expand
        && pos.y >= block.y - expand && pos.y <= block.y + 1 + expand
        && pos.z >= block.z - expand && pos.z <= block.z + 1 + expand;
}

function isEntityNearBlock(entity, block, expand = 0.35) {
    const probes = getEntityProbeLocations(entity);
    for (const probe of probes) {
        if (isPositionNearBlock(probe, block, expand)) return true;
    }
    return false;
}

// SECTION: Dynamic Property Storage Helpers
function saveLargeJSON(keyBase, value) {
    const json = JSON.stringify(value);
    let index = 0;
    let pos = 0;

    while (world.getDynamicProperty(`${keyBase}_${index}`) !== undefined) {
        world.setDynamicProperty(`${keyBase}_${index}`, undefined);
        index++;
    }

    index = 0;
    while (pos < json.length) {
        const chunk = json.slice(pos, pos + MAX_SIZE);
        world.setDynamicProperty(`${keyBase}_${index}`, chunk);
        pos += MAX_SIZE;
        index++;
    }

    world.setDynamicProperty(`${keyBase}_count`, index);
}

function loadLargeJSON(keyBase) {
    const count = world.getDynamicProperty(`${keyBase}_count`);
    if (typeof count !== "number") return [];

    let result = "";
    for (let i = 0; i < count; i++) {
        const chunk = world.getDynamicProperty(`${keyBase}_${i}`);
        if (chunk) result += chunk;
    }

    try {
        return JSON.parse(result);
    } catch {
        return [];
    }
}

// SECTION: Block Visibility & Placeholder Updates
system.runInterval(() => {
    const blocks = loadLargeJSON("blocks");
    const activeTypes = getActiveVisibleBlockTypes();
    for (const block of blocks) {
        const dim = world.getDimension(block.dimension);
        const pos = { x: block.x, y: block.y, z: block.z };
        const current = dim.getBlock(pos);
        if (visible) {
            try { dim.setBlockType(pos, block.typeId); } catch { }
            continue;
        }
        if (activeTypes.has(block.typeId)) {
            try { dim.setBlockType(pos, block.typeId); } catch { }
        }
        else {
            if (current && (current.typeId === block.typeId || current.typeId === "brr:data" || current.typeId === "brr:data_collision" || current.typeId === "brr:data_blocklight")) {
                try {
                    const hiddenType = getHiddenPlaceholderType(block, {
                        toolsEnabled,
                        collisionBlockTypes: COLLISION_BLOCK_TYPES,
                        lightBlockTypes: LIGHT_BLOCK_TYPES,
                        parseBooleanLike,
                        shouldEnableNpcclipCollision,
                        npcclipOptions: getNpcclipRuntimeOptions()
                    });
                    if (current.typeId !== hiddenType) {
                        dim.setBlockType(pos, hiddenType);
                    }
                } catch { }
            }
        }
    }
}, 5);

// SECTION: Block Registry Sync Events
world.beforeEvents.playerBreakBlock.subscribe((data) => {
    const block = data.block;
    let blocks = loadLargeJSON("blocks");
    if (TOOL_BLOCK_TYPES.includes(block.typeId)) {
        const beforeCount = blocks.length;
        blocks = blocks.filter((b) => !(b.x === block.x && b.y === block.y && b.z === block.z && b.dimension === block.dimension.id));
        if (blocks.length !== beforeCount) {
            saveLargeJSON("blocks", blocks);
        }
    }
})

world.afterEvents.playerPlaceBlock.subscribe((data) => {
    const block = data.block;
    if (TOOL_BLOCK_TYPES.includes(block.typeId)) {
        let blocks = loadLargeJSON("blocks");

        let newGroupId = null;
        let sharedData = {};

        if (isToolNamespaceBlock(block.typeId)) {
            const adjacentGroupIds = getAdjacentGroupIds(blocks, block.x, block.y, block.z, block.dimension.id, block.typeId);

            if (adjacentGroupIds.length > 0) {
                newGroupId = adjacentGroupIds[0];
                const adjacentBlock = blocks.find(b => b.groupId === newGroupId);
                if (adjacentBlock && adjacentBlock.data) {
                    sharedData = JSON.parse(JSON.stringify(adjacentBlock.data));
                }

                if (adjacentGroupIds.length > 1) {
                    mergeToolGroups(blocks, block.typeId, adjacentGroupIds, newGroupId);
                }
            } else {
                newGroupId = generateGroupId();
            }
        }

        blocks.push({
            x: block.x,
            y: block.y,
            z: block.z,
            typeId: block.typeId,
            dimension: block.dimension.id,
            groupId: newGroupId,
            data: { ...sharedData, startDisabled: false }
        });

        if (block.typeId === "brr:tool_playerclip") {
            const newIndex = blocks.length - 1;
            if (blocks[newIndex]?.data?.excludeOperators === undefined) {
                blocks[newIndex].data.excludeOperators = true;
            }
        }

        if (block.typeId === "brr:logic_timer_block") {
            blocks[blocks.length - 1].data.startDisabled = true;
        }

        saveLargeJSON("blocks", blocks);
    }
})

// SECTION: Startup Commands & Persisted Toggles
try {
    if (system?.beforeEvents?.startup && CommandPermissionLevel && CustomCommandParamType) {
        system.beforeEvents.startup.subscribe((data) => {
            const registry = data?.customCommandRegistry;
            if (!registry) return;

            emojiCommand(data);

            const commandsList = [
                "engine_blocks_always_visible",
                "tools_enabled",
                "can_use_pots",
                "can_use_shelves",
                "can_use_trapdoors",
                "can_use_doors",
                "can_use_itemframes",
                "can_use_candles",
                "can_use_all"
            ];

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
                        // Skip duplicate alias registration.
                    }
                }
            }

            registry.registerEnum("brr:cmds", commandsList);
            registry.registerCommand(
                {
                    name: "brr:brr",
                    description: "Bonnie's Source Engine Settings",
                    permissionLevel: CommandPermissionLevel.GameDirectors,
                    mandatoryParameters: [
                        { name: "brr:cmds", type: CustomCommandParamType.Enum },
                        { name: "value", type: CustomCommandParamType.Boolean }
                    ]
                },
                (origin, subcommand, value) => {
                    const sender = origin.sourceEntity;
                    if (!sender) return;

                    const parsedBoolean = typeof value === "boolean" ? value : undefined;

                    if (subcommand === "engine_blocks_always_visible") {
                        if (parsedBoolean === undefined) {
                            sender.sendMessage("§cInvalid value. Use true/false for engine_blocks_always_visible.");
                            return;
                        }

                        visible = parsedBoolean;
                        world.setDynamicProperty("engine_blocks_always_visible", visible);
                        sender.sendMessage(`Toggled tool blocks visibility to ${visible}`);
                        return;
                    }

                    if (subcommand === "tools_enabled") {
                        if (parsedBoolean === undefined) {
                            sender.sendMessage("§cInvalid value. Use true/false for tools_enabled.");
                            return;
                        }

                        toolsEnabled = parsedBoolean;
                        world.setDynamicProperty("tools_enabled", toolsEnabled);
                        sender.sendMessage(`Toggled tools to ${toolsEnabled}`);
                        return;
                    }

                    const adventurePermissionKey = ADVENTURE_COMMAND_TO_KEY[subcommand];
                    if (adventurePermissionKey) {
                        if (parsedBoolean === undefined) {
                            sender.sendMessage(`§cInvalid value. Use true/false for ${subcommand}.`);
                            return;
                        }

                        setAdventurePermission(adventurePermissionKey, parsedBoolean);

                        if (adventurePermissionKey === "canUseAll") {
                            sender.sendMessage(`Set all adventure interaction permissions to ${parsedBoolean}.`);
                            return;
                        }

                        sender.sendMessage(`Set ${subcommand} to ${parsedBoolean}.`);
                    }
                }
            );

            registerCommandAliases(
                {
                    description: "Adjust chat cooldown in seconds",
                    permissionLevel: CommandPermissionLevel.GameDirectors,
                    mandatoryParameters: [
                        { name: "cooldown_seconds", type: CustomCommandParamType.Float }
                    ]
                },
                (origin, cooldownSeconds) => {
                    const sender = origin.sourceEntity;
                    if (!sender) return;

                    const appliedSeconds = setChatCooldownSeconds(cooldownSeconds);
                    if (appliedSeconds === undefined) {
                        sender.sendMessage("§cInvalid value. Use a number >= 0 (examples: 0, 0.1, 1).");
                        return;
                    }

                    const formattedSeconds = appliedSeconds
                        .toFixed(3)
                        .replace(/\.0+$/, "")
                        .replace(/(\.\d*?)0+$/, "$1");

                    sender.sendMessage(`§aChat cooldown set to ${formattedSeconds} second(s).`);
                },
                ["brr:adjust_chat_cooldown", "adjust_chat_cooldown"]
            );
        });
    }
} catch { }

system.run(() => {
    visible = parseBooleanLike(world.getDynamicProperty("engine_blocks_always_visible"), false);
    toolsEnabled = parseBooleanLike(world.getDynamicProperty("tools_enabled"), true);

    adventureInteractionPermissions.canUsePots = parseBooleanLike(world.getDynamicProperty("can_use_pots"), true);
    adventureInteractionPermissions.canUseShelves = parseBooleanLike(world.getDynamicProperty("can_use_shelves"), true);
    adventureInteractionPermissions.canUseTrapdoors = parseBooleanLike(world.getDynamicProperty("can_use_trapdoors"), true);
    adventureInteractionPermissions.canUseDoors = parseBooleanLike(world.getDynamicProperty("can_use_doors"), true);
    adventureInteractionPermissions.canUseItemframes = parseBooleanLike(world.getDynamicProperty("can_use_itemframes"), true);
    adventureInteractionPermissions.canUseCandles = parseBooleanLike(world.getDynamicProperty("can_use_candles"), true);
    adventureInteractionPermissions.canUseAll =
        adventureInteractionPermissions.canUsePots
        && adventureInteractionPermissions.canUseShelves
        && adventureInteractionPermissions.canUseTrapdoors
        && adventureInteractionPermissions.canUseDoors
        && adventureInteractionPermissions.canUseItemframes
        && adventureInteractionPermissions.canUseCandles;
});

// SECTION: Named Target & Block Data Helpers
function getBlocksTargetingCurrent(currentBlockName) {
    const allBlocks = loadLargeJSON("blocks");
    const inputsList = [];
    if (!currentBlockName) return inputsList;

    allBlocks.forEach(block => {
        if (block.data && block.data.outputs) {
            block.data.outputs.forEach(output => {
                if (output.targetName === currentBlockName) {
                    inputsList.push({
                        sourceBlockName: block.data.name || `[Block at ${block.x},${block.y},${block.z}]`,
                        outputName: output.name,
                    });
                }
            });
        }
    });

    return inputsList;
}

function getNamedTargets() {
    const blocks = loadLargeJSON("blocks");
    const namedBlocks = blocks.filter(b => b.data && b.data.name).map(b => b.data.name);
    return [...new Set(namedBlocks)];
}

function getNamedTargetEntries() {
    const blocks = loadLargeJSON("blocks");
    const seen = new Set();
    const entries = [];

    for (const block of blocks) {
        const name = `${block?.data?.name ?? ""}`.trim();
        if (!name || seen.has(name)) continue;

        seen.add(name);
        entries.push({
            name,
            typeId: `${block?.typeId ?? ""}`
        });
    }

    return entries;
}

function saveBlockEntry(blockEntry) {
    let blocks = loadLargeJSON("blocks");
    const index = blocks.findIndex(b =>
        b.x === blockEntry.x &&
        b.y === blockEntry.y &&
        b.z === blockEntry.z &&
        b.dimension === blockEntry.dimension
    );

    if (index !== -1) {
        blocks[index] = blockEntry;

        if (blocks[index].groupId && isToolNamespaceBlock(blocks[index].typeId)) {
            const groupId = blocks[index].groupId;
            blocks.forEach(block => {
                if (block.groupId === groupId && block.typeId === blocks[index].typeId) {
                    block.data = JSON.parse(JSON.stringify(blockEntry.data));
                }
            });
        }

        saveLargeJSON("blocks", blocks);
    }
}

// SECTION: Selector & Block Hitbox Helpers
function isPositionInsideBlock(pos, block) {
    if (!pos || !block) return false;
    return pos.x >= block.x && pos.x < block.x + 1
        && pos.y >= block.y && pos.y < block.y + 1
        && pos.z >= block.z && pos.z < block.z + 1;
}

function getEntityProbeLocations(entity) {
    const loc = entity?.location;
    if (!loc) return [];

    const probes = [{ x: loc.x, y: loc.y, z: loc.z }];

    if (entity?.typeId === "minecraft:player") {
        probes.push(
            { x: loc.x, y: loc.y + 0.9, z: loc.z },
            { x: loc.x, y: loc.y + 1.5, z: loc.z }
        );
    }

    return probes;
}

function isEntityInsideBlock(entity, block) {
    const probes = getEntityProbeLocations(entity);
    for (const probe of probes) {
        if (isPositionInsideBlock(probe, block)) return true;
    }
    return false;
}

function parseSelectorFilters(selector) {
    const trimmed = `${selector ?? ""}`.trim();
    const match = trimmed.match(/^@[pares](?:\[(.*)\])?$/i);
    if (!match) return null;

    const entriesRaw = `${match[1] ?? ""}`.trim();
    if (!entriesRaw) return {};

    const filters = {};
    for (const entry of entriesRaw.split(",")) {
        const [rawKey, ...rawValueParts] = entry.split("=");
        const key = `${rawKey ?? ""}`.trim().toLowerCase();
        const value = rawValueParts.join("=").trim();
        if (!key || !value) continue;
        if (!Array.isArray(filters[key])) filters[key] = [];
        filters[key].push(value);
    }

    return filters;
}

function getSelectorFilterValues(filters, key) {
    const raw = filters?.[key];
    if (Array.isArray(raw)) return raw.filter(value => `${value ?? ""}`.trim().length > 0);
    if (typeof raw === "string" && raw.trim().length > 0) return [raw.trim()];
    return [];
}

function applyEntityFilters(entities, filters) {
    if (!filters || !entities?.length) return entities ?? [];

    let results = entities;

    const typeFilters = getSelectorFilterValues(filters, "type");
    for (const rawType of typeFilters) {
        const trimmed = rawType.trim().toLowerCase();
        if (!trimmed) continue;

        const isNegated = trimmed.startsWith("!");
        const expectedType = isNegated ? trimmed.slice(1) : trimmed;
        if (!expectedType) continue;

        results = results.filter(entity => {
            const actualType = `${entity.typeId ?? ""}`.trim().toLowerCase();
            const matches = actualType === expectedType;
            return isNegated ? !matches : matches;
        });
    }

    const nameFilters = getSelectorFilterValues(filters, "name");
    for (const rawName of nameFilters) {
        const trimmed = rawName.trim().toLowerCase();
        if (!trimmed) continue;

        const isNegated = trimmed.startsWith("!");
        const expectedName = isNegated ? trimmed.slice(1) : trimmed;
        if (!expectedName) continue;

        results = results.filter(entity => {
            const tag = `${entity.nameTag ?? ""}`.trim().toLowerCase();
            const playerName = `${entity.name ?? ""}`.trim().toLowerCase();
            const matches = tag === expectedName || playerName === expectedName;
            return isNegated ? !matches : matches;
        });
    }

    const tagFilters = getSelectorFilterValues(filters, "tag");
    for (const rawTag of tagFilters) {
        const trimmed = rawTag.trim();
        if (!trimmed) continue;

        const isNegated = trimmed.startsWith("!");
        const tagName = isNegated ? trimmed.slice(1) : trimmed;
        if (!tagName) continue;

        results = results.filter(entity => {
            let hasTag = false;
            try {
                hasTag = entity.hasTag(tagName);
            } catch { }

            return isNegated ? !hasTag : hasTag;
        });
    }

    const gamemodeFilters = [
        ...getSelectorFilterValues(filters, "gamemode"),
        ...getSelectorFilterValues(filters, "m")
    ];

    for (const rawGamemode of gamemodeFilters) {
        const trimmed = rawGamemode.trim().toLowerCase();
        if (!trimmed) continue;

        const isNegated = trimmed.startsWith("!");
        const expectedGamemode = isNegated ? trimmed.slice(1) : trimmed;
        if (!expectedGamemode) continue;

        results = results.filter(entity => {
            if (`${entity?.typeId ?? ""}` !== "minecraft:player") {
                return false;
            }

            const actualGamemode = getPlayerGameMode(entity);
            if (!actualGamemode) return false;

            const matches = actualGamemode === expectedGamemode;
            return isNegated ? !matches : matches;
        });
    }

    return results;
}

// SECTION: Runtime Option Builders
function parseBooleanLike(value, defaultValue = false) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;

    const normalized = `${value ?? ""}`.trim().toLowerCase();
    if (normalized === "") return defaultValue;
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
    return defaultValue;
}

function getSelectorRuntimeOptions() {
    return {
        parseSelectorFilters,
        applyEntityFilters
    };
}

function getNpcclipRuntimeOptions() {
    return {
        toolsEnabled,
        parseBooleanLike,
        isEntityNearBlock,
        ...getSelectorRuntimeOptions()
    };
}

function getPlayerclipRuntimeOptions() {
    return {
        parseBooleanLike,
        isEntityNearBlock,
        isPlayerOperator,
        getPlayerGameMode,
        ...getSelectorRuntimeOptions(),
        playerclipPushCooldowns,
        playerclipLastSafePositions,
        cooldownMs: PLAYERCLIP_PUSH_COOLDOWN_MS
    };
}

function getNpcclipRepelRuntimeOptions() {
    return {
        parseBooleanLike,
        isEntityNearBlock,
        ...getSelectorRuntimeOptions(),
        npcclipRepelCooldowns,
        npcclipLastSafePositions,
        cooldownMs: NPCCLIP_REPEL_COOLDOWN_MS
    };
}

function getOutputRuntimeOptions() {
    return {
        loadBlocks: loadLargeJSON,
        saveBlocks: saveLargeJSON,
        parseBooleanLike
    };
}


// SECTION: Block UI Dispatch
function openToolUIForBlock(player, blockEntry) {
    if (!player || !blockEntry?.typeId) return;

    if (blockEntry.typeId === "brr:tool_trigger") {
        showTriggerToolUI(player, blockEntry, {
            onSave: saveBlockEntry,
            conditionTools,
            validateConditionRequirements,
            getNamedTargets,
            getNamedTargetEntries,
            getBlocksTargetingCurrent,
            outputTypes: TRIGGER_OUTPUT_TYPES,
            inputs: TRIGGER_INPUTS
        });
        return;
    }

    const blockToolUIs = {
        "brr:tool_areaportal": areaPortalToolUI,
        "brr:info_playerspawn_block": infoPlayerspawnUI,
        "brr:info_target_areaportal_block": infoTargetAreaportalUI,
        "brr:game_nametag_block": gameNametagUI,
        "brr:tool_invisible": toolInvisibleUI,
        "brr:tool_playerclip": toolPlayerclipUI,
        "brr:tool_npcclip": toolNpcclipUI
    };

    const toolUI = blockToolUIs[blockEntry.typeId];
    if (typeof toolUI === "function") {
        toolUI(player, blockEntry, saveBlockEntry);
        return;
    }

    const logicBlockUIs = {
        "brr:logic_auto_block": logicAutoUI,
        "brr:logic_branch_block": logicBranchUI,
        "brr:logic_case_block": logicCaseUI,
        "brr:logic_compare_block": logicCompareUI,
        "brr:logic_coop_manager_block": logicCoopManagerUI,
        "brr:logic_random_outputs_block": logicRandomOutputsUI,
        "brr:logic_timer_block": logicTimerUI
    };

    const logicUI = logicBlockUIs[blockEntry.typeId];
    if (typeof logicUI === "function") {
        logicUI(player, blockEntry, {
            onSave: saveBlockEntry,
            conditionTools,
            validateConditionRequirements,
            getNamedTargetEntries,
            getBlocksTargetingCurrent,
            allInputs: outputClassInfoTargets
        });
    }
}

// SECTION: Playerspawn Runtime State
let playerspawnWarningShown = false;
let lastAppliedWorldSpawnKey = "";

// SECTION: Trigger & AreaPortal Runtime Loop
system.runInterval(() => {
    if (!toolsEnabled) return;

    const blocks = loadLargeJSON("blocks");
    const players = world.getPlayers();
    const outputRuntimeOptions = getOutputRuntimeOptions();

    for (const block of blocks) {
        if (block.typeId === "brr:tool_trigger" && !block.data?.startDisabled) {
            const triggerData = getNormalizedTriggerData(block.data, conditionTools);

            for (const player of players) {
                if (!isEntityInsideBlock(player, block)) continue;

                if (evaluateCondition(triggerData, player, world)) {
                    if (triggerData.runCommand) {
                        if (!isBlockedTriggerCommand(triggerData.runCommand)) {
                            try {
                                player.runCommand(triggerData.runCommand);
                            } catch { }
                        }
                    }
                    fireOutputsForEvent(block, "onTrue", outputRuntimeOptions);
                } else {
                    fireOutputsForEvent(block, "onFalse", outputRuntimeOptions);
                }
            }
        }

        if (block.typeId === "brr:tool_areaportal" && !block.data?.startDisabled) {
            handleAreaPortalBlock(block, blocks, {
                isEntityInsideBlock,
                ...getSelectorRuntimeOptions()
            });
        }
    }
}, 2);

// SECTION: Logic Blocks Runtime Loop
system.runInterval(() => {
    if (!toolsEnabled) return;

    const blocks = loadLargeJSON("blocks");
    const logicBlocks = blocks.filter(b => b?.typeId?.startsWith("brr:logic_"));
    if (logicBlocks.length === 0) return;

    const outputRuntimeOptions = getOutputRuntimeOptions();
    tickLogicBlocks(logicBlocks, outputRuntimeOptions, saveBlockEntry);
}, 2);

// SECTION: Npcclip Runtime Loop
system.runInterval(() => {
    if (!toolsEnabled) return;

    const blocks = loadLargeJSON("blocks");
    const npcclipBlocks = blocks.filter(block =>
        block?.typeId === "brr:tool_npcclip" && !parseBooleanLike(block?.data?.startDisabled, false)
    );
    if (npcclipBlocks.length === 0) return;

    const npcclipRepelRuntimeOptions = getNpcclipRepelRuntimeOptions();
    for (const block of npcclipBlocks) {
        let dimension;
        try {
            dimension = world.getDimension(block.dimension);
        } catch {
            continue;
        }

        const entities = Array.from(dimension.getEntities()).filter(entity => `${entity?.typeId ?? ""}` !== "minecraft:player");
        for (const entity of entities) {
            applyNpcclipRepel(entity, block, npcclipRepelRuntimeOptions);
        }
    }
}, 2);

// SECTION: Playerclip Runtime Loop
system.runInterval(() => {
    if (!toolsEnabled) return;

    const blocks = loadLargeJSON("blocks");
    const playerclipBlocks = blocks.filter(block =>
        block?.typeId === "brr:tool_playerclip" && !parseBooleanLike(block?.data?.startDisabled, false)
    );
    if (playerclipBlocks.length === 0) return;

    const players = world.getPlayers();
    const playerclipRuntimeOptions = getPlayerclipRuntimeOptions();
    for (const block of playerclipBlocks) {
        for (const player of players) {
            applyPlayerclipRepel(player, block, playerclipRuntimeOptions);
        }
    }
}, 2);

// SECTION: Playerspawn Runtime Loop
system.runInterval(() => {
    if (!toolsEnabled) {
        playerspawnWarningShown = false;
        return;
    }

    const blocks = loadLargeJSON("blocks");
    const activePlayerspawnBlocks = getActivePlayerspawnBlocks(blocks);

    if (activePlayerspawnBlocks.length !== 1) {
        if (activePlayerspawnBlocks.length > 1 && !playerspawnWarningShown) {
            playerspawnWarningShown = true;
            try {
                world.sendMessage("§eYou can have only 1 info_playerspawn block active at a time bro.");
            } catch { }
        }
        if (activePlayerspawnBlocks.length <= 1) {
            playerspawnWarningShown = false;
        }
        return;
    }

    playerspawnWarningShown = false;

    const activeBlock = activePlayerspawnBlocks[0];
    const spawnConfig = getPlayerspawnSpawnConfig(activeBlock, parseBooleanLike);
    if (!spawnConfig) return;

    const { spawnDim, spawnCoords, setsPlayerSpawnPoint } = spawnConfig;

    if (setsPlayerSpawnPoint) {
        lastAppliedWorldSpawnKey = "";
        const selector = `${activeBlock?.data?.selectors ?? "@a"}`.trim() || "@a";
        const targetPlayers = getPlayerspawnTargets(activeBlock, selector, getSelectorRuntimeOptions());
        for (const player of targetPlayers) {
            applySpawnPointForPlayer(player, spawnCoords, spawnDim);
        }
        return;
    }

    const spawnKey = `${Math.floor(spawnCoords.x)}|${Math.floor(spawnCoords.y)}|${Math.floor(spawnCoords.z)}`;
    if (spawnKey === lastAppliedWorldSpawnKey) return;

    if (applyWorldSpawnPoint(spawnCoords)) {
        lastAppliedWorldSpawnKey = spawnKey;
    }
}, 100);

// SECTION: Game Nametag Runtime Loop
system.runInterval(() => {
    const blocks = loadLargeJSON("blocks");
    const activeNametagBlocks = blocks.filter(block =>
        block?.typeId === "brr:game_nametag_block" && !parseBooleanLike(block?.data?.startDisabled, false)
    );

    const allPlayers = world.getPlayers();
    const playerBuckets = new Map();

    function parseOrder(value) {
        const parsed = Number.parseInt(`${value ?? "0"}`, 10);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function formatNametag(rawNametag) {
        const trimmed = `${rawNametag ?? ""}`.trim();
        if (!trimmed) return "";
        const withEmoji = applyEmojiReplacements(trimmed);
        return `[§r${withEmoji}§r]`;
    }

    for (const block of activeNametagBlocks) {
        const tag = formatNametag(block?.data?.nametag);
        if (!tag) continue;

        const worksInUsernames = parseBooleanLike(block?.data?.worksInUsernames, true);
        const worksInChat = parseBooleanLike(block?.data?.worksInChat, true);
        const usesPrefix = parseBooleanLike(block?.data?.prefix, true);
        const usesSuffix = parseBooleanLike(block?.data?.suffix, false);
        const order = parseOrder(block?.data?.nametagOrder);
        const selector = `${block?.data?.selectors ?? "@a"}`.trim() || "@a";

        const targets = getGameNametagTargets(block, selector, {
            parseSelectorFilters,
            applyEntityFilters
        });

        for (const player of targets) {
            const playerId = `${player?.id ?? ""}`;
            if (!playerId) continue;

            if (!playerBuckets.has(playerId)) {
                playerBuckets.set(playerId, {
                    player,
                    entries: []
                });
            }

            playerBuckets.get(playerId).entries.push({
                order,
                worksInUsernames,
                worksInChat,
                usesPrefix,
                usesSuffix,
                tag
            });
        }
    }

    for (const player of allPlayers) {
        const playerId = `${player?.id ?? ""}`;
        const bucket = playerBuckets.get(playerId);

        if (!bucket || bucket.entries.length === 0) {
            try {
                player.setDynamicProperty("brr_nametag", undefined);
            } catch { }
            continue;
        }

        const entries = bucket.entries.sort((a, b) => a.order - b.order);
        const chatPrefix = entries
            .filter(entry => entry.worksInChat && entry.usesPrefix)
            .map(entry => `${entry.tag} `)
            .join("");
        const chatSuffix = entries
            .filter(entry => entry.worksInChat && entry.usesSuffix)
            .map(entry => ` ${entry.tag}`)
            .join("");
        const usernamePrefix = entries
            .filter(entry => entry.worksInUsernames && entry.usesPrefix)
            .map(entry => `${entry.tag} `)
            .join("");
        const usernameSuffix = entries
            .filter(entry => entry.worksInUsernames && entry.usesSuffix)
            .map(entry => ` ${entry.tag}`)
            .join("");

        const payload = {
            chatPrefix,
            chatSuffix,
            usernamePrefix,
            usernameSuffix
        };

        try {
            player.setDynamicProperty("brr_nametag", JSON.stringify(payload));
        } catch { }
    }
}, 10);

// SECTION: Tool Particle Rendering Loop
system.runInterval(() => {
    const blocks = loadLargeJSON("blocks");
    const activeTypes = visible ? null : getActiveVisibleBlockTypes();

    for (const block of blocks) {
        if (!visible && activeTypes && !activeTypes.has(block.typeId)) {
            continue;
        }

        const particleId = blockParticles[block.typeId];
        if (!particleId) continue;

        const dim = world.getDimension(block.dimension);
        const particlePos = {
            x: block.x + 0.5,
            y: block.y + 0.5,
            z: block.z + 0.5
        };

        try {
            dim.spawnParticle(particleId, particlePos);
        } catch { }
    }
}, 2);

// SECTION: Player Spawn Handling
world.afterEvents.playerSpawn.subscribe((event) => {
    if (!toolsEnabled) return;

    const player = event.player;
    if (!player) return;

    system.run(() => {
        const blocks = loadLargeJSON("blocks");
        const activePlayerspawnBlocks = getActivePlayerspawnBlocks(blocks);

        if (activePlayerspawnBlocks.length !== 1) return;

        const activeBlock = activePlayerspawnBlocks[0];
        const spawnConfig = getPlayerspawnSpawnConfig(activeBlock, parseBooleanLike);
        if (!spawnConfig) return;

        if (spawnConfig.setsPlayerSpawnPoint) {
            const selector = `${activeBlock?.data?.selectors ?? "@a"}`.trim() || "@a";
            const targets = getPlayerspawnTargets(activeBlock, selector, getSelectorRuntimeOptions());
            if (targets.some(target => `${target?.id ?? ""}` === `${player?.id ?? ""}`)) {
                applySpawnPointForPlayer(player, spawnConfig.spawnCoords, spawnConfig.spawnDim);
            }
            return;
        }

        try {
            player.teleport(spawnConfig.spawnCoords, { dimension: spawnConfig.spawnDim });
        } catch { }
    });
});

// SECTION: Tool Interaction & UI Opening
const lastTrigger = new Map();

world.beforeEvents.playerInteractWithBlock.subscribe((data) => {
    if (data.cancel) return;

    const block = data.block;
    const blockedPermission = getAdventurePermissionForBlock(block?.typeId);
    if (blockedPermission && shouldBlockAdventureInteraction(data.player, block.typeId)) {
        data.cancel = true;
        notifyAdventureInteractionBlocked(data.player, blockedPermission);
        return;
    }

    if (TOOL_BLOCK_TYPES.includes(block.typeId)) {
        if (!toolsEnabled) {
            return;
        }

        if (data.player.isSneaking) return;

        if (!isPlayerInCreative(data.player)) {
            data.player.sendMessage("§cOnly players in Creative mode can configure these blocks.");
            data.cancel = true;
            return;
        }

        const now = Date.now();
        const previous = lastTrigger.get(data.player.id) ?? 0;
        if (now - previous < TRIGGER_INTERACT_COOLDOWN_MS) return;
        lastTrigger.set(data.player.id, now);

        let blocks = loadLargeJSON("blocks");
        let blockEntry = blocks.find(b =>
            b.x === block.x && b.y === block.y && b.z === block.z && b.dimension === block.dimension.id
        );

        if (!blockEntry) {
            blockEntry = {
                x: block.x,
                y: block.y,
                z: block.z,
                typeId: block.typeId,
                dimension: block.dimension.id,
                data: { startDisabled: false }
            };
            blocks.push(blockEntry);
            saveLargeJSON("blocks", blocks);
        }

        data.cancel = true;
        system.run(() => {
            openToolUIForBlock(data.player, blockEntry);
        });
    }
})

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

// SECTION: Tripmine Runtime Events
world.afterEvents.playerPlaceBlock.subscribe((data) => {
    const blockId = data.block.typeId
    if (blockId === "brr:subspace_tripmine_block") {
        let pos = data.block.location
        data.player.runCommand(`summon brr:subspace_tripmine_entity ${pos.x} ${pos.y} ${pos.z}`)
        data.player.runCommand(`setblock ${pos.x} ${pos.y} ${pos.z} air`)
        data.player.runCommand(`title @a[tag=game] title §5§kSubspace Tripmine`)
    }
});

world.afterEvents.entitySpawn.subscribe((data) => {
    let entityId = data.entity.typeId
    if (entityId === "brr:subspace_tripmine_entity") {
        let pos = data.entity.location
        system.runTimeout(() => {
            world.getDimension("overworld").runCommand(`execute positioned ${pos.x} ${pos.y} ${pos.z} run playanimation @e[type=brr:subspace_tripmine_entity, r=0.5] explode`)
            system.runTimeout(() => {
                world.getDimension("overworld").runCommand(`execute positioned ${pos.x} ${pos.y} ${pos.z} run tag @a[r=12, tag=game, tag=!spectator, tag=!duel1, tag=!duel2] add subspace1`)
                system.runTimeout(() => {
                    world.getDimension("overworld").runCommand(`execute positioned ${pos.x} ${pos.y} ${pos.z} run tp @e[type=brr:subspace_tripmine_entity, r=1] 0 -10 0`)
                    world.getDimension("overworld").runCommand(`execute positioned 0 -10 0 run kill @e[type=brr:subspace_tripmine_entity, r=1]`)
                }, 50);
            }, 295);
        }, 5);
    }
})