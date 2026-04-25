import { ModalFormData } from "@minecraft/server-ui";
import { world } from "@minecraft/server";
import { outputClassInfoTargets, outputTypes, getOutputTargetLabel, isOutputTargetSupportedByBlockType } from "../output_ci_targets.js";
import { addDecorativeSection, addReadOnlyListSection, sendUiError, sendUiSaved } from "../ui_formatting.js";

function normalizeLiteralSelector(value) {
    const raw = `${value ?? ""}`.trim();
    const quoted = raw.match(/^("|')(.*)\1$/);
    return `${quoted ? quoted[2] : raw}`.trim().toLowerCase();
}

// SECTION: Playerspawn Runtime Helpers
export function parseSpawnCoordinates(raw) {
    const coords = `${raw ?? ""}`.trim().split(/\s+/);
    if (coords.length !== 3) return null;

    const x = Number.parseFloat(coords[0]);
    const y = Number.parseFloat(coords[1]);
    const z = Number.parseFloat(coords[2]);

    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
    return { x: x + 0.5, y: y + 0, z: z + 0.5 };
}

export function applyWorldSpawnPoint(spawnCoords) {
    const x = spawnCoords.x;
    const y = spawnCoords.y;
    const z = spawnCoords.z;

    try {
        world.setDefaultSpawnLocation({ x, y, z });
        return true;
    } catch { }

    try {
        world.getDimension("minecraft:overworld").runCommand(`setworldspawn ${x} ${y} ${z}`);
        return true;
    } catch { }

    return false;
}

export function applySpawnPointForPlayer(player, spawnCoords, dim) {
    try {
        player.setSpawnPoint(spawnCoords, dim);
        return true;
    } catch { }

    try {
        player.setSpawnPoint({
            x: spawnCoords.x,
            y: spawnCoords.y,
            z: spawnCoords.z,
            dimension: dim
        });
        return true;
    } catch { }

    try {
        player.runCommand(`spawnpoint @s ${Math.floor(spawnCoords.x)} ${Math.floor(spawnCoords.y)} ${Math.floor(spawnCoords.z)}`);
        return true;
    } catch { }

    return false;
}

export function getActivePlayerspawnBlocks(blocks) {
    return blocks.filter(block =>
        block.typeId === "brr:info_playerspawn_block" && !block.data?.startDisabled
    );
}

export function getPlayerspawnSpawnConfig(activeBlock, parseBooleanLikeFn) {
    if (!activeBlock || typeof parseBooleanLikeFn !== "function") return null;

    const worldSpawnAtBlock = parseBooleanLikeFn(activeBlock.data?.worldSpawnAtBlock, true);
    const setsPlayerSpawnPoint = parseBooleanLikeFn(activeBlock.data?.setsPlayerSpawnPoint, false);

    let spawnCoords = null;
    if (worldSpawnAtBlock) {
        spawnCoords = { x: activeBlock.x + 0.5, y: activeBlock.y + 0, z: activeBlock.z + 0.5 };
    } else if (activeBlock.data?.worldSpawn) {
        spawnCoords = parseSpawnCoordinates(activeBlock.data.worldSpawn);
    }

    if (!spawnCoords) return null;

    return {
        spawnCoords,
        setsPlayerSpawnPoint,
        spawnDim: world.getDimension(activeBlock.dimension)
    };
}

export function getPlayerspawnTargets(block, selectorRaw, options) {
    const selector = `${selectorRaw ?? "@a"}`.trim() || "@a";
    const normalized = selector.toLowerCase();
    const allPlayers = Array.from(world.getPlayers());

    const { parseSelectorFilters, applyEntityFilters } = options ?? {};

    if (normalized.startsWith("@")) {
        const filters = typeof parseSelectorFilters === "function" ? parseSelectorFilters(selector) : null;
        const base = normalized.slice(0, 2);

        if (base === "@a" || base === "@p" || base === "@r" || base === "@e") {
            let players = allPlayers;
            players = typeof applyEntityFilters === "function" ? applyEntityFilters(players, filters) : players;

            if (base === "@p") {
                return players.length > 0 ? [players[0]] : [];
            }

            if (base === "@r") {
                if (players.length === 0) return [];
                const randomIndex = Math.floor(Math.random() * players.length);
                return [players[randomIndex]];
            }

            return players;
        }

        return [];
    }

    const literal = normalizeLiteralSelector(selector);
    const players = allPlayers;

    if (literal === "minecraft:player") {
        return players;
    }

    return players.filter(player => {
        const playerName = normalizeLiteralSelector(player?.name);
        const playerTag = normalizeLiteralSelector(player?.nameTag);
        return playerName === literal || playerTag === literal;
    });
}

// SECTION: Playerspawn UI Data Helpers
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

// SECTION: Playerspawn UI
export function infoPlayerspawnUI(player, blockEntry, onSave) {
    if (!blockEntry.data) blockEntry.data = {};
    if (!Array.isArray(blockEntry.data.outputs)) blockEntry.data.outputs = [];

    const blockOutputs = [...blockEntry.data.outputs];
    const namedTargetEntries = getNamedTargetEntries();
    const targetOptions = namedTargetEntries.length > 0
        ? namedTargetEntries.map(entry => `${entry.name} (${`${entry.typeId ?? ""}`.replace(/^brr:/, "") || "Unknown"})`)
        : ["(No named blocks)"];
    const classInfoOptions = outputClassInfoTargets.map(target => getOutputTargetLabel(target));

    const playerspawnForm = new ModalFormData();
    playerspawnForm.title("Info Playerspawn Block");
    addDecorativeSection(playerspawnForm, "§1§1Info Playerspawn Block");

    const spawnName = blockEntry.data?.name || `playerspawn${Math.round(Math.random() * 10000)}`;
    playerspawnForm.textField("Name", "name", { defaultValue: spawnName });
    playerspawnForm.toggle("Start disabled", { defaultValue: Boolean(blockEntry.data?.startDisabled) });
    playerspawnForm.toggle("World spawn at block", { defaultValue: blockEntry.data?.worldSpawnAtBlock !== false });
    playerspawnForm.textField("World spawn coordinates", "Pos: XYZ (e.g., 0 64 0)", { defaultValue: blockEntry.data?.worldSpawn || "" });
    playerspawnForm.toggle("Set Player Spawn Point", { defaultValue: Boolean(blockEntry.data?.setsPlayerSpawnPoint) });
    playerspawnForm.textField("Selectors (used only when Set Player Spawn Point is on)", "@a", { defaultValue: blockEntry.data?.selectors || "@a" });

    addDecorativeSection(playerspawnForm, "Outputs");
    playerspawnForm.toggle("Add this output", { defaultValue: false });
    playerspawnForm.textField("Output Name (optional)", "Auto-generated if blank", { defaultValue: "" });
    playerspawnForm.dropdown("Output Type", outputTypes, { defaultValueIndex: 0 });
    playerspawnForm.dropdown("Output Target", targetOptions, { defaultValueIndex: 0 });
    playerspawnForm.dropdown("Target Class Info", classInfoOptions, { defaultValueIndex: 0 });
    playerspawnForm.textField("Target Info Value", "Use true/false for toggles", { defaultValue: "" });
    playerspawnForm.textField("Delay (in ticks)", "0", { defaultValue: "0" });

    addDecorativeSection(playerspawnForm, "Existing Outputs");
    if (blockOutputs.length === 0) {
        playerspawnForm.label("No outputs exist.");
    } else {
        blockOutputs.forEach(output => {
            playerspawnForm.label(`Output name: ${output?.name || "(unnamed)"}`);
            playerspawnForm.label(`Output type: ${output?.outputType || "none"}`);
            playerspawnForm.label(`Target: ${output?.targetName || "(none)"}`);
            playerspawnForm.label(`Target class info: ${getOutputTargetLabel(output?.targetProperty)}`);
            playerspawnForm.label(`Target value: ${output?.targetValue || ""}`);
            playerspawnForm.label(`Delay: ${output?.delay ?? 0}`);
            playerspawnForm.toggle(`Delete: ${output?.name || "(unnamed output)"}`, { defaultValue: false });
            playerspawnForm.divider();
        });
    }

    const currentBlockName = blockEntry.data?.name;
    const inputsList = getBlocksTargetingCurrent(currentBlockName);
    const inputLines = inputsList.map(input => `  - ${input.outputName} from ${input.sourceBlockName}`);
    const emptyInputsMessage = currentBlockName
        ? "No blocks have outputs saved for this block."
        : "This block needs a name to receive inputs.";
    addReadOnlyListSection(playerspawnForm, "Inputs", inputLines, emptyInputsMessage);

    playerspawnForm.submitButton("Save");

    playerspawnForm.show(player).then((response) => {
        if (response.canceled) return;

        const formData = (response.formValues ?? []).filter(value => value !== undefined && value !== null);
        if (formData.length < 13) {
            sendUiError(player, "Save failed: form data is incomplete.");
            return;
        }

        let cursor = 0;
        const name = `${formData[cursor++] ?? spawnName}`;
        const startDisabled = Boolean(formData[cursor++]);
        const worldSpawnAtBlock = Boolean(formData[cursor++]);
        const worldSpawn = `${formData[cursor++] ?? ""}`;
        const setsPlayerSpawnPoint = Boolean(formData[cursor++]);
        const selectors = `${formData[cursor++] ?? "@a"}`.trim() || "@a";

        const addOutput = Boolean(formData[cursor++]);
        const outputNameRaw = `${formData[cursor++] ?? ""}`.trim();
        const outputTypeIndex = Number(formData[cursor++]);
        const outputTargetIndex = Number(formData[cursor++]);
        const outputTargetPropertyIndex = Number(formData[cursor++]);
        const outputTargetValueRaw = `${formData[cursor++] ?? ""}`;
        const outputDelayRaw = Number.parseInt(`${formData[cursor++] ?? "0"}`, 10);
        const outputDelay = Number.isFinite(outputDelayRaw) ? Math.max(0, outputDelayRaw) : 0;
        const outputTargetProperty = outputClassInfoTargets[outputTargetPropertyIndex] ?? outputClassInfoTargets[0] ?? "startDisabled";
        const selectedTargetEntry = namedTargetEntries[outputTargetIndex];
        const selectedTargetName = `${selectedTargetEntry?.name ?? ""}`.trim();
        const selectedTargetType = `${selectedTargetEntry?.typeId ?? ""}`.trim();
        const outputName = outputNameRaw || `out_${outputTypes[outputTypeIndex] ?? "none"}_${selectedTargetName || "target"}_${Date.now().toString().slice(-4)}`;

        let outputTargetValue = outputTargetValueRaw;
        if (outputTargetProperty === "startDisabled"
            || outputTargetProperty === "playerspawnWorldSpawnAtBlock"
            || outputTargetProperty === "playerspawnSetsPlayerSpawnPoint"
            || outputTargetProperty === "playerclipExcludeOperators") {
            const normalized = outputTargetValueRaw.trim().toLowerCase();
            if (["1", "true", "yes", "on"].includes(normalized)) outputTargetValue = "true";
            if (["0", "false", "no", "off", ""].includes(normalized)) outputTargetValue = "false";
        }

        let nextOutputs = blockOutputs;
        if (addOutput) {
            if (!selectedTargetName) {
                sendUiError(player, "Choose a valid Output Target before adding an output.");
                return;
            }

            if (!isOutputTargetSupportedByBlockType(outputTargetProperty, selectedTargetType)) {
                sendUiError(player, `${getOutputTargetLabel(outputTargetProperty)} is not valid for the selected target block type.`);
                return;
            }

            nextOutputs.push({
                name: outputName,
                outputType: outputTypes[outputTypeIndex] ?? outputTypes[0] ?? "none",
                targetName: selectedTargetName,
                targetProperty: outputTargetProperty,
                targetValue: outputTargetValue,
                delay: outputDelay
            });
        }

        if (blockOutputs.length > 0) {
            const outputsToKeep = [];
            for (let i = 0; i < blockOutputs.length; i++) {
                const shouldDelete = Boolean(formData[cursor++]);
                if (!shouldDelete) outputsToKeep.push(blockOutputs[i]);
            }
            nextOutputs = outputsToKeep;
        }

        blockEntry.data.name = name;
        blockEntry.data.startDisabled = startDisabled;
        blockEntry.data.worldSpawnAtBlock = worldSpawnAtBlock;
        blockEntry.data.worldSpawn = worldSpawn;
        blockEntry.data.setsPlayerSpawnPoint = setsPlayerSpawnPoint;
        blockEntry.data.selectors = selectors;
        blockEntry.data.outputs = nextOutputs;

        // Call the save callback
        if (onSave) onSave(blockEntry);
        sendUiSaved(player, "Playerspawn block", blockEntry.data.name);
    });
}