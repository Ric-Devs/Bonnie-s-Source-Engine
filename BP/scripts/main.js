import * as mc from "@minecraft/server";
import { applyEmojiReplacements } from "./handler/chat_system.js";
import { evaluateCondition, validateConditionRequirements } from "./handler/condition_executer.js";
import { conditionTools } from "./tool_ui/conditions_tools.js";
import { areaPortalToolUI, handleAreaPortalBlock } from "./tool_ui/tool_areaportal.js";
import { infoPlayerspawnUI, getPlayerspawnSpawnConfig, getActivePlayerspawnBlocks, applySpawnPointForPlayer, applyWorldSpawnPoint } from "./tool_ui/info_playerspawn.js";
import { infoTargetAreaportalUI } from "./tool_ui/info_target_areaportal.js";
import { gameNametagUI, getGameNametagTargets } from "./tool_ui/game_nametag.js";
import { toolInvisibleUI, getHiddenPlaceholderType } from "./tool_ui/tool_invisible.js";
import { toolPlayerclipUI, applyPlayerclipRepel } from "./tool_ui/tool_playerclip.js";
import { toolNpcclipUI, shouldEnableNpcclipCollision, applyNpcclipRepel } from "./tool_ui/tool_npcclip.js";
import { triggerToolUI as showTriggerToolUI, fireOutputsForEvent, getNormalizedTriggerData, isBlockedTriggerCommand } from "./tool_ui/tool_trigger.js";
import { blockParticles } from "./handler/block_particles.js";
import "./handler/gluon_gun.js";
import "./handler/tau_cannon.js";
import "./handler/crowbar.js";
import "./handler/glock17.js";

const { world, system } = mc;
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
const TOOL_BLOCK_TYPES = ["brr:tool_areaportal", "brr:info_playerspawn_block", "brr:tool_invisible", "brr:tool_trigger", "brr:info_target_areaportal_block", "brr:tool_blocklight", "brr:tool_playerclip", "brr:tool_npcclip", "brr:game_nametag_block"];
const COLLISION_BLOCK_TYPES = ["brr:tool_invisible", "brr:tool_playerclip", "brr:tool_npcclip"];
const LIGHT_BLOCK_TYPES = ["brr:tool_blocklight"];
const ITEM_TO_BLOCK_MAP = {
    "brr:info_playerspawn": "brr:info_playerspawn_block",
    "brr:info_target_areaportal": "brr:info_target_areaportal_block",
    "brr:game_nametag": "brr:game_nametag_block"
};
const MAX_SIZE = 28000;
const TRIGGER_OUTPUT_TYPES = ["onTrue", "onFalse"];
const TRIGGER_INPUTS = ["startDisabled", "selector", "destination", "destinationBlock", "targetFacingDirection", "worldSpawnAtBlock", "worldSpawn", "executeOnConditon", "triggerConditionValue1", "triggerConditionValue2", "triggerConditionValue3", "runCommand", "playerclipExcludeOperators", "playerclipExcludeGamemode", "playerclipExcludeSelector", "npcclipExcludeSelector", "worksInUsernames", "worksInChat", "suffix", "prefix", "nametag", "nametagOrder", "selectors"];
const ADJACENT_DIRECTIONS = [
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 },
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 }
];

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

    if (typeof player.isOp === "function") {
        try {
            return Boolean(player.isOp());
        } catch { }
    }

    try {
        return (player.runCommand("testfor @s[haspermission={operator=true}]")?.successCount ?? 0) > 0;
    } catch { }

    return false;
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

        saveLargeJSON("blocks", blocks);
    }
})

// SECTION: Startup Commands & Persisted Toggles
try {
    if (system?.beforeEvents?.startup && CommandPermissionLevel && CustomCommandParamType) {
        system.beforeEvents.startup.subscribe((data) => {
            const registry = data?.customCommandRegistry;
            if (!registry) return;

            const commandsList = ["engine_blocks_always_visible", "tools_enabled"];

            registry.registerEnum("brr:cmds", commandsList);
            registry.registerCommand(
                {
                    name: "brr:brr",
                    description: "Bonnie's Source Engine Settings",
                    permissionLevel: CommandPermissionLevel.GameDirectors,
                    mandatoryParameters: [
                        { name: "brr:cmds", type: CustomCommandParamType.Enum },
                        { name: "value", type: CustomCommandParamType.Boolean }
                    ],
                },
                (origin, subcommand, value) => {
                    const sender = origin.sourceEntity;
                    if (!sender) return;

                    if (subcommand === "engine_blocks_always_visible") {
                        visible = value ?? false;
                        world.setDynamicProperty("engine_blocks_always_visible", visible);
                        sender.sendMessage(`Toggled tool blocks visibility to ${visible}`);
                        return;
                    }

                    if (subcommand === "tools_enabled") {
                        toolsEnabled = value ?? false;
                        world.setDynamicProperty("tools_enabled", toolsEnabled);
                        sender.sendMessage(`Toggled tools to ${toolsEnabled}`);
                    }
                }
            );
        });
    }
} catch { }

system.run(() => {
    visible = parseBooleanLike(world.getDynamicProperty("engine_blocks_always_visible"), false);
    toolsEnabled = parseBooleanLike(world.getDynamicProperty("tools_enabled"), true);
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
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off", ""].includes(normalized)) return false;
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
        for (const player of world.getPlayers()) {
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
        if (!spawnConfig || spawnConfig.setsPlayerSpawnPoint) return;

        try {
            player.teleport(spawnConfig.spawnCoords, { dimension: spawnConfig.spawnDim });
        } catch { }
    });
});

// SECTION: Tool Interaction & UI Opening
const lastTrigger = new Map();

world.beforeEvents.playerInteractWithBlock.subscribe((data) => {
    const block = data.block;
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


// hh

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