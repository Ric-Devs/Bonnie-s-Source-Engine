// SECTION: Output Target Keys
export let outputClassInfoTargets = [
    "startDisabled",

    "triggerConditionExecute",
    "triggerConditionValue1",
    "triggerConditionValue2",
    "triggerConditionValue3",
    "triggerRunCommand",

    "areaportalSelector",
    "areaportalDestination",
    "areaportalDestinationBlock",
    "targetFacingDirection",

    "playerspawnWorldSpawnAtBlock",
    "playerspawnWorldSpawn",
    "playerspawnSetsPlayerSpawnPoint",
    "playerspawnSelectors",

    "playerclipExcludeOperators",
    "playerclipExcludeGamemode",
    "playerclipExcludeSelector",

    "npcclipExcludeSelector"
    ,"gameNametagWorksInUsernames"
    ,"gameNametagWorksInChat"
    ,"gameNametagSuffix"
    ,"gameNametagPrefix"
    ,"gameNametagNametag"
    ,"gameNametagOrder"
    ,"gameNametagSelectors"

    ,"coopSetStateATrue"
    ,"coopSetStateAFalse"
    ,"coopToggleStateA"
    ,"coopSetStateBTrue"
    ,"coopSetStateBFalse"
    ,"coopToggleStateB"
    ,"randomChanceTrigger"
]

// SECTION: Output Target Metadata
export const outputTargetMetadata = {
    startDisabled: {
        label: "Start disabled",
        valueType: "boolean",
        supportedBlockTypes: ["*"]
    },
    triggerConditionExecute: {
        label: "Trigger: Execute on condition",
        valueType: "string",
        supportedBlockTypes: ["brr:tool_trigger"]
    },
    triggerConditionValue1: {
        label: "Trigger: Condition value 1",
        valueType: "string",
        supportedBlockTypes: ["brr:tool_trigger"]
    },
    triggerConditionValue2: {
        label: "Trigger: Condition value 2",
        valueType: "string",
        supportedBlockTypes: ["brr:tool_trigger"]
    },
    triggerConditionValue3: {
        label: "Trigger: Condition value 3",
        valueType: "string",
        supportedBlockTypes: ["brr:tool_trigger"]
    },
    triggerRunCommand: {
        label: "Trigger: Run command",
        valueType: "string",
        supportedBlockTypes: ["brr:tool_trigger"]
    },
    areaportalSelector: {
        label: "Area Portal: Selector",
        valueType: "string",
        supportedBlockTypes: ["brr:tool_areaportal"]
    },
    areaportalDestination: {
        label: "Area Portal: Destination",
        valueType: "string",
        supportedBlockTypes: ["brr:tool_areaportal"]
    },
    areaportalDestinationBlock: {
        label: "Area Portal: Destination block",
        valueType: "string",
        supportedBlockTypes: ["brr:tool_areaportal"]
    },
    targetFacingDirection: {
        label: "Target AreaPortal: Facing direction",
        valueType: "string",
        supportedBlockTypes: ["brr:info_target_areaportal_block"]
    },
    playerspawnWorldSpawnAtBlock: {
        label: "Playerspawn: World spawn at block",
        valueType: "boolean",
        supportedBlockTypes: ["brr:info_playerspawn_block"]
    },
    playerspawnWorldSpawn: {
        label: "Playerspawn: World spawn",
        valueType: "string",
        supportedBlockTypes: ["brr:info_playerspawn_block"]
    },
    playerspawnSetsPlayerSpawnPoint: {
        label: "Playerspawn: Set player spawn point",
        valueType: "boolean",
        supportedBlockTypes: ["brr:info_playerspawn_block"]
    },
    playerspawnSelectors: {
        label: "Playerspawn: Selectors",
        valueType: "string",
        supportedBlockTypes: ["brr:info_playerspawn_block"]
    },
    playerclipExcludeOperators: {
        label: "Playerclip: Exclude operators",
        valueType: "boolean",
        supportedBlockTypes: ["brr:tool_playerclip"]
    },
    playerclipExcludeGamemode: {
        label: "Playerclip: Exclude gamemode",
        valueType: "string",
        supportedBlockTypes: ["brr:tool_playerclip"]
    },
    playerclipExcludeSelector: {
        label: "Playerclip: Exclude selector",
        valueType: "string",
        supportedBlockTypes: ["brr:tool_playerclip"]
    },
    npcclipExcludeSelector: {
        label: "Npcclip: Exclude selector",
        valueType: "string",
        supportedBlockTypes: ["brr:tool_npcclip"]
    },
    gameNametagWorksInUsernames: {
        label: "Game Nametag: Works in usernames",
        valueType: "boolean",
        supportedBlockTypes: ["brr:game_nametag_block"]
    },
    gameNametagWorksInChat: {
        label: "Game Nametag: Works in chat",
        valueType: "boolean",
        supportedBlockTypes: ["brr:game_nametag_block"]
    },
    gameNametagSuffix: {
        label: "Game Nametag: Suffix",
        valueType: "boolean",
        supportedBlockTypes: ["brr:game_nametag_block"]
    },
    gameNametagPrefix: {
        label: "Game Nametag: Prefix",
        valueType: "boolean",
        supportedBlockTypes: ["brr:game_nametag_block"]
    },
    gameNametagNametag: {
        label: "Game Nametag: Nametag",
        valueType: "string",
        supportedBlockTypes: ["brr:game_nametag_block"]
    },
    gameNametagOrder: {
        label: "Game Nametag: Nametag order",
        valueType: "string",
        supportedBlockTypes: ["brr:game_nametag_block"]
    },
    gameNametagSelectors: {
        label: "Game Nametag: Selectors",
        valueType: "string",
        supportedBlockTypes: ["brr:game_nametag_block"]
    },
    coopSetStateATrue: {
        label: "Coop: Set State A True",
        valueType: "boolean",
        supportedBlockTypes: ["brr:logic_coop_manager_block"]
    },
    coopSetStateAFalse: {
        label: "Coop: Set State A False",
        valueType: "boolean",
        supportedBlockTypes: ["brr:logic_coop_manager_block"]
    },
    coopToggleStateA: {
        label: "Coop: Toggle State A",
        valueType: "boolean",
        supportedBlockTypes: ["brr:logic_coop_manager_block"]
    },
    coopSetStateBTrue: {
        label: "Coop: Set State B True",
        valueType: "boolean",
        supportedBlockTypes: ["brr:logic_coop_manager_block"]
    },
    coopSetStateBFalse: {
        label: "Coop: Set State B False",
        valueType: "boolean",
        supportedBlockTypes: ["brr:logic_coop_manager_block"]
    },
    coopToggleStateB: {
        label: "Coop: Toggle State B",
        valueType: "boolean",
        supportedBlockTypes: ["brr:logic_coop_manager_block"]
    },
    randomChanceTrigger: {
        label: "Random: Chance Trigger",
        valueType: "boolean",
        supportedBlockTypes: ["brr:logic_random_outputs_block"]
    }
};

// SECTION: Output Target Helpers
export function getOutputTargetLabel(targetProperty) {
    return outputTargetMetadata[targetProperty]?.label ?? targetProperty;
}

export function getOutputTargetValueType(targetProperty) {
    return outputTargetMetadata[targetProperty]?.valueType ?? "string";
}

export function isOutputTargetSupportedByBlockType(targetProperty, blockType) {
    const supportedTypes = outputTargetMetadata[targetProperty]?.supportedBlockTypes;
    if (!Array.isArray(supportedTypes) || supportedTypes.length === 0) return true;
    return supportedTypes.includes("*") || supportedTypes.includes(blockType);
}

// SECTION: Output Trigger Types
export const outputTypes = [
    "none",
    "onTrue",
    "onFalse",
]