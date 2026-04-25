import { ModalFormData } from "@minecraft/server-ui";
import { world } from "@minecraft/server";
import { addDecorativeSection, addReadOnlyListSection, sendUiError, sendUiSaved } from "../ui_formatting.js";

// SECTION: Playerclip Config
const gamemodeOptions = ["none", "survival", "creative", "adventure", "spectator"];

function normalizeLiteralSelector(value) {
    const raw = `${value ?? ""}`.trim();
    const quoted = raw.match(/^(["'])(.*)\1$/);
    return `${quoted ? quoted[2] : raw}`.trim().toLowerCase();
}

// SECTION: Playerclip Runtime Helpers
export function selectorTargetsPlayer(selectorRaw, player, block, options) {
    const selector = `${selectorRaw ?? ""}`.trim();
    if (!selector || !player || !block?.dimension) return false;

    const normalized = selector.toLowerCase();
    const { parseSelectorFilters, applyEntityFilters } = options ?? {};

    if (!normalized.startsWith("@")) {
        const expected = normalizeLiteralSelector(selector);
        const playerName = normalizeLiteralSelector(player?.name);
        const tagName = normalizeLiteralSelector(player?.nameTag);
        return expected === playerName || expected === tagName;
    }

    const base = normalized.slice(0, 2);
    if (!["@a", "@p", "@r", "@s", "@e"].includes(base)) return false;
    if (base === "@s") return false;

    let dimension;
    try {
        dimension = world.getDimension(block.dimension);
    } catch {
        return false;
    }

    const filters = typeof parseSelectorFilters === "function" ? parseSelectorFilters(selector) : null;
    let players = base === "@e"
        ? Array.from(dimension.getEntities()).filter(entity => `${entity?.typeId ?? ""}` === "minecraft:player")
        : Array.from(dimension.getPlayers());
    players = typeof applyEntityFilters === "function" ? applyEntityFilters(players, filters) : players;
    if (players.length === 0) return false;

    if (base === "@a" || base === "@r" || base === "@e") {
        return players.some(candidate => candidate?.id === player.id);
    }

    if (base === "@p") {
        const center = { x: block.x + 0.5, y: block.y + 0.5, z: block.z + 0.5 };
        players.sort((a, b) => {
            const adx = a.location.x - center.x;
            const ady = a.location.y - center.y;
            const adz = a.location.z - center.z;
            const bdx = b.location.x - center.x;
            const bdy = b.location.y - center.y;
            const bdz = b.location.z - center.z;
            return (adx * adx + ady * ady + adz * adz) - (bdx * bdx + bdy * bdy + bdz * bdz);
        });

        return players[0]?.id === player.id;
    }

    return false;
}

export function playerMatchesPlayerclipExclusion(player, block, options) {
    if (!player || !block?.data) return false;

    const {
        parseBooleanLike,
        isPlayerOperator,
        getPlayerGameMode,
        parseSelectorFilters,
        applyEntityFilters
    } = options ?? {};

    if (typeof parseBooleanLike !== "function") return false;
    if (parseBooleanLike(block.data.startDisabled, false)) return true;

    const excludesOperators = parseBooleanLike(block.data.excludeOperators, true);
    if (excludesOperators && typeof isPlayerOperator === "function" && isPlayerOperator(player)) {
        return true;
    }

    const excludedGamemode = `${block.data.excludeGamemode ?? ""}`.trim().toLowerCase();
    if (excludedGamemode && excludedGamemode !== "none" && typeof getPlayerGameMode === "function") {
        const playerMode = getPlayerGameMode(player);
        if (playerMode && playerMode === excludedGamemode) {
            return true;
        }
    }

    const excludeSelector = `${block.data.excludeSelector ?? ""}`.trim();
    if (excludeSelector && selectorTargetsPlayer(excludeSelector, player, block, { parseSelectorFilters, applyEntityFilters })) {
        return true;
    }

    return false;
}

export function shouldDisablePlayerclipCollision(block, options) {
    if (!block) return false;

    const {
        toolsEnabled,
        parseBooleanLike,
        isEntityNearBlock,
        isPlayerOperator,
        getPlayerGameMode,
        parseSelectorFilters,
        applyEntityFilters
    } = options ?? {};

    if (!toolsEnabled) return true;
    if (typeof parseBooleanLike !== "function" || typeof isEntityNearBlock !== "function") return false;
    if (parseBooleanLike(block?.data?.startDisabled, false)) return true;

    const players = world.getPlayers();
    for (const player of players) {
        if (player?.dimension?.id !== block.dimension) continue;
        if (!isEntityNearBlock(player, block, 0.45)) continue;
        if (playerMatchesPlayerclipExclusion(player, block, {
            parseBooleanLike,
            isPlayerOperator,
            getPlayerGameMode,
            parseSelectorFilters,
            applyEntityFilters
        })) {
            return true;
        }
    }

    return false;
}

export function applyPlayerclipRepel(player, block, options) {
    if (!player || !block) return;

    const {
        parseBooleanLike,
        isEntityNearBlock,
        isPlayerOperator,
        getPlayerGameMode,
        parseSelectorFilters,
        applyEntityFilters,
        playerclipPushCooldowns,
        playerclipLastSafePositions,
        cooldownMs
    } = options ?? {};

    if (player?.dimension?.id !== block.dimension) return;
    if (typeof parseBooleanLike !== "function" || typeof isEntityNearBlock !== "function") return;
    if (!(playerclipPushCooldowns instanceof Map)) return;
    if (!(playerclipLastSafePositions instanceof Map)) return;
    if (parseBooleanLike(block?.data?.startDisabled, false)) return;

    const isNearBlock = isEntityNearBlock(player, block, 0.45);
    const blockKey = `${block.dimension}|${block.x}|${block.y}|${block.z}`;
    const safePosKey = `${player.id}|${blockKey}`;

    if (!isNearBlock) {
        playerclipLastSafePositions.set(safePosKey, {
            x: player.location.x,
            y: player.location.y,
            z: player.location.z,
            dimension: player.dimension?.id
        });
        return;
    }

    if (playerMatchesPlayerclipExclusion(player, block, {
        parseBooleanLike,
        isPlayerOperator,
        getPlayerGameMode,
        parseSelectorFilters,
        applyEntityFilters
    })) return;

    const now = Date.now();
    const cooldownKey = `${player.id}|${blockKey}`;
    const lastPush = playerclipPushCooldowns.get(cooldownKey) ?? 0;
    if (now - lastPush < (Number.isFinite(cooldownMs) ? cooldownMs : 140)) return;
    playerclipPushCooldowns.set(cooldownKey, now);

    const lastSafePos = playerclipLastSafePositions.get(safePosKey);
    if (lastSafePos && lastSafePos.dimension === player.dimension?.id) {
        try {
            player.teleport(
                {
                    x: lastSafePos.x,
                    y: lastSafePos.y,
                    z: lastSafePos.z
                },
                { dimension: player.dimension }
            );
            return;
        } catch { }
    }

    const centerX = block.x + 0.5;
    const centerZ = block.z + 0.5;
    let dirX = player.location.x - centerX;
    let dirZ = player.location.z - centerZ;

    const magnitude = Math.sqrt((dirX * dirX) + (dirZ * dirZ));
    if (magnitude > 0.001) {
        dirX /= magnitude;
        dirZ /= magnitude;
    } else {
        try {
            const view = player.getViewDirection();
            dirX = -(view?.x ?? 0);
            dirZ = -(view?.z ?? 0);
        } catch {
            dirX = 0;
            dirZ = -1;
        }
    }

    try {
        player.applyKnockback(dirX, dirZ, 1.15, 0.1);
    } catch {
        try {
            player.teleport(
                {
                    x: player.location.x + (dirX * 0.6),
                    y: player.location.y,
                    z: player.location.z + (dirZ * 0.6)
                },
                { dimension: player.dimension }
            );
        } catch { }
    }
}

// SECTION: Playerclip UI Data Helpers
function loadLargeJSON(keyBase) {
    const count = world.getDynamicProperty(`${keyBase}_count`);
    if (typeof count !== "number") return [];

    let result = "";
    for (let i = 0; i < count; i++) {
        const chunk = world.getDynamicProperty(`${keyBase}_${i}`);
        if (typeof chunk === "string") result += chunk;
    }

    try {
        return JSON.parse(result);
    } catch {
        return [];
    }
}

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

// SECTION: Playerclip UI
export function toolPlayerclipUI(player, blockEntry, onSave) {
    if (!blockEntry.data) blockEntry.data = {};

    const form = new ModalFormData();
    form.title("Tool Playerclip");
    addDecorativeSection(form, "§1§1Tool Playerclip");

    const blockName = blockEntry.data?.name || `playerclip${Math.round(Math.random() * 10000)}`;
    const currentGamemode = `${blockEntry.data?.excludeGamemode ?? "none"}`.trim().toLowerCase();
    const gamemodeIndex = Math.max(0, gamemodeOptions.indexOf(currentGamemode));

    form.textField("Name", "name", { defaultValue: blockName });
    form.toggle("Start disabled", { defaultValue: Boolean(blockEntry.data?.startDisabled) });
    form.toggle("Exclude Operators", { defaultValue: blockEntry.data?.excludeOperators !== false });
    form.dropdown("Exclude Gamemode", gamemodeOptions, { defaultValueIndex: gamemodeIndex });
    form.textField("Exclude Selector", "@a[tag=lobby,tag=!game]", { defaultValue: `${blockEntry.data?.excludeSelector ?? ""}` });

    const currentBlockName = blockEntry.data?.name;
    const inputsList = getBlocksTargetingCurrent(currentBlockName);
    const inputLines = inputsList.map(input => `  - ${input.outputName} from ${input.sourceBlockName}`);
    const emptyInputsMessage = currentBlockName
        ? "No blocks have outputs saved for this block."
        : "This block needs a name to receive inputs.";
    addReadOnlyListSection(form, "Inputs", inputLines, emptyInputsMessage);

    form.submitButton("Save");

    form.show(player).then((response) => {
        if (response.canceled) return;

        const formData = (response.formValues ?? []).filter(value => value !== undefined && value !== null);
        if (formData.length < 5) {
            sendUiError(player, "Save failed: form data is incomplete.");
            return;
        }

        let cursor = 0;
        const name = `${formData[cursor++] ?? blockName}`;
        const startDisabled = Boolean(formData[cursor++]);
        const excludeOperators = Boolean(formData[cursor++]);
        const excludeGamemodeIndex = Number(formData[cursor++]);
        const excludeSelector = `${formData[cursor++] ?? ""}`;

        blockEntry.data = {
            ...blockEntry.data,
            name,
            startDisabled,
            excludeOperators,
            excludeGamemode: gamemodeOptions[excludeGamemodeIndex] ?? "none",
            excludeSelector
        };

        if (onSave) onSave(blockEntry);
        sendUiSaved(player, "Playerclip", blockEntry.data.name);
    });
}