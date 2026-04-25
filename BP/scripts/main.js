import * as mc from "@minecraft/server";
import { applyEmojiReplacements, emojiCommand, setChatCooldownSeconds } from "./handler/core/chat_system.js";
import { evaluateCondition } from "./handler/core/condition_executer.js";
import { conditionTools } from "./tool_ui/conditions_tools.js";
import { handleAreaPortalBlock } from "./tool_ui/tool/tool_areaportal.js";
import { getPlayerspawnSpawnConfig, getActivePlayerspawnBlocks, applySpawnPointForPlayer, applyWorldSpawnPoint, getPlayerspawnTargets } from "./tool_ui/info/info_playerspawn.js";
import { getGameNametagTargets } from "./tool_ui/game/game_nametag.js";
import { getHiddenPlaceholderType } from "./tool_ui/tool/tool_invisible.js";
import { applyPlayerclipRepel } from "./tool_ui/tool/tool_playerclip.js";
import { shouldEnableNpcclipCollision, applyNpcclipRepel } from "./tool_ui/tool/tool_npcclip.js";
import { fireOutputsForEvent, getNormalizedTriggerData, isBlockedTriggerCommand } from "./tool_ui/tool/tool_trigger.js";
import { blockParticles } from "./handler/core/block_particles.js";
import "./handler/small.js";
import "./handler/weapons/gluon_gun.js";
import "./handler/weapons/tau_cannon.js";
import "./handler/weapons/crowbar.js";
import "./handler/weapons/glock17.js";
import "./handler/weapons/magnum357.js";
import { openToolUIForBlock } from "./tool_ui/tool_ui_dispatch.js";
import { tickLogicBlocks } from "./handler/logic_blocks.js";
import { parseSelectorFilters, applyEntityFilters } from "./handler/core/selector_filters.js";
import { outputClassInfoTargets } from "./tool_ui/output_ci_targets.js";
import "./handler/weapons/tripmine.js";
import {
    ADVENTURE_COMMAND_TO_KEY,
    adventureInteractionPermissions,
    setAdventurePermission,
    getAdventurePermissionStatusLines,
    loadPersistedPermissions,
    enforcePressurePlateRestrictionForPlayer,
    shouldBlockAdventureInteraction,
    getAdventurePermissionForBlock,
    getIncompatibleRespawnPermissionForBlock,
    notifyAdventureInteractionBlocked,
    isPlayerInAdventure
} from "./handler/permissions.js";

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
const TRIGGER_OUTPUT_TYPES = ["onTrue", "onFalse"];
const TRIGGER_INPUTS = [...new Set([
    ...outputClassInfoTargets,
    "selector",
    "destination",
    "destinationBlock",
    "worldSpawnAtBlock",
    "worldSpawn",
    "executeOnCondition",
    "executeOnConditon",
    "conditionValue1",
    "conditionValue2",
    "conditionValue3",
    "runCommand",
    "excludeOperators",
    "excludeGamemode",
    "excludeSelector",
    "worksInUsernames",
    "worksInChat",
    "suffix",
    "prefix",
    "nametag",
    "nametagOrder",
    "selectors"
])];
const ADJACENT_DIRECTIONS = [
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 },
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 }
];
// SECTION: Large JSON Storage
const MAX_CHUNK_SIZE = 28000;

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
        const chunk = json.slice(pos, pos + MAX_CHUNK_SIZE);
        world.setDynamicProperty(`${keyBase}_${index}`, chunk);
        pos += MAX_CHUNK_SIZE;
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
    const player = data.player;
    const block = data.block;

    if (player && isPlayerInAdventure(player)) {
        const isItemFrameBreak = `${block?.typeId ?? ""}`.trim().toLowerCase().includes("item_frame")
            || block?.typeId === "minecraft:frame"
            || block?.typeId === "minecraft:glow_frame";

        if (isItemFrameBreak && !adventureInteractionPermissions.canUseItemframes) {
            data.cancel = true;
            notifyAdventureInteractionBlocked(player, "canUseItemframes");
            return;
        }
    }

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
                "can_open_containers",
                "can_use_buttons",
                "can_use_pressure_plates",
                "can_use_incompatible_respawns",
                "can_use_daylight_sensors",
                "can_hit_entities",
                "can_hit_players",
                "can_use_jukebox",
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
                        return;
                    }
                }
            );

            registerCommandAliases(
                {
                    description: "Show current adventure interaction permissions",
                    permissionLevel: CommandPermissionLevel.GameDirectors
                },
                (origin) => {
                    const sender = origin.sourceEntity;
                    if (!sender) return;

                    for (const line of getAdventurePermissionStatusLines()) {
                        sender.sendMessage(line);
                    }
                },
                ["brr:adventure_permissions_status", "adventure_permissions_status"]
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

            registerCommandAliases(
                {
                    description: "Display addon version",
                    permissionLevel: CommandPermissionLevel.GameDirectors
                },
                (origin) => {
                    const sender = origin.sourceEntity;
                    if (!sender) return;
                    sender.sendMessage(`§aBonnie's Source Engine v1.0.35`);
                },
                ["brr:version", "engine_version", "source_version"]
            );
        });
    }
} catch { }

system.run(() => {
    visible = parseBooleanLike(world.getDynamicProperty("engine_blocks_always_visible"), false);
    toolsEnabled = parseBooleanLike(world.getDynamicProperty("tools_enabled"), true);
    loadPersistedPermissions(parseBooleanLike);
});

system.runInterval(() => {
    for (const player of world.getPlayers()) {
        enforcePressurePlateRestrictionForPlayer(player);
    }
}, 1);

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
        applyEntityFilters: (entities, filters) => applyEntityFilters(entities, filters, getPlayerGameMode)
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
    const incompatibleRespawnPermission = getIncompatibleRespawnPermissionForBlock(data.player, block?.typeId, block?.dimension?.id);
    if (incompatibleRespawnPermission && !adventureInteractionPermissions[incompatibleRespawnPermission]) {
        data.cancel = true;
        notifyAdventureInteractionBlocked(data.player, incompatibleRespawnPermission);
        return;
    }

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
            openToolUIForBlock(data.player, blockEntry, {
                onSave: saveBlockEntry,
                getNamedTargets,
                getNamedTargetEntries,
                getBlocksTargetingCurrent,
                triggerOutputTypes: TRIGGER_OUTPUT_TYPES,
                triggerInputs: TRIGGER_INPUTS,
                allInputs: outputClassInfoTargets
            });
        });
    }
})