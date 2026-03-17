import { ModalFormData } from "@minecraft/server-ui";
import { world } from "@minecraft/server";
import { outputClassInfoTargets, outputTypes, getOutputTargetLabel, isOutputTargetSupportedByBlockType } from "./output_ci_targets.js";
import { addDecorativeSection, addReadOnlyListSection } from "./ui_formatting.js";

// SECTION: Game Nametag Runtime Helpers
export function getGameNametagTargets(block, selectorRaw, options) {
    const selector = `${selectorRaw ?? "@a"}`.trim();
    const normalized = selector.toLowerCase();

    const { parseSelectorFilters, applyEntityFilters } = options ?? {};

    let dimension;
    try {
        dimension = world.getDimension(block.dimension);
    } catch {
        return [];
    }

    if (normalized.startsWith("@")) {
        const filters = typeof parseSelectorFilters === "function" ? parseSelectorFilters(selector) : null;
        const base = normalized.slice(0, 2);

        if (base === "@a" || base === "@p" || base === "@r") {
            let players = Array.from(dimension.getPlayers());
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

        if (base === "@e") {
            let entities = Array.from(dimension.getEntities());
            entities = typeof applyEntityFilters === "function" ? applyEntityFilters(entities, filters) : entities;
            return entities.filter(entity => entity?.typeId === "minecraft:player");
        }

        return [];
    }

    if (normalized === "minecraft:player") {
        return Array.from(dimension.getPlayers());
    }

    return [];
}

// SECTION: Game Nametag UI Data Helpers
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

// SECTION: Game Nametag UI
export function gameNametagUI(player, blockEntry, onSave) {
    if (!blockEntry.data) blockEntry.data = {};
    if (!Array.isArray(blockEntry.data.outputs)) blockEntry.data.outputs = [];

    const blockOutputs = [...blockEntry.data.outputs];
    const namedTargetEntries = getNamedTargetEntries();
    const targetOptions = namedTargetEntries.length > 0
        ? namedTargetEntries.map(entry => `${entry.name} (${`${entry.typeId ?? ""}`.replace(/^brr:/, "") || "Unknown"})`)
        : ["(No named blocks)"];
    const classInfoOptions = outputClassInfoTargets.map(target => getOutputTargetLabel(target));

    const nametagForm = new ModalFormData();
    nametagForm.title("Game Nametag Block");
    addDecorativeSection(nametagForm, "Class Info");

    const blockName = blockEntry.data?.name || `game_nametag${Math.round(Math.random() * 10000)}`;
    nametagForm.textField("Name", "name", { defaultValue: blockName });
    nametagForm.toggle("Start disabled", { defaultValue: Boolean(blockEntry.data?.startDisabled) });
    nametagForm.toggle("Works in usernames", { defaultValue: blockEntry.data?.worksInUsernames !== false });
    nametagForm.toggle("Works in chat", { defaultValue: blockEntry.data?.worksInChat !== false });
    nametagForm.toggle("Suffix", { defaultValue: Boolean(blockEntry.data?.suffix) });
    nametagForm.toggle("Prefix", { defaultValue: blockEntry.data?.prefix !== false });
    nametagForm.textField("Nametag", "Tag name", { defaultValue: blockEntry.data?.nametag || "" });
    nametagForm.textField("Nametag order", "0", { defaultValue: `${blockEntry.data?.nametagOrder ?? 0}` });
    nametagForm.textField("Selectors", "@a", { defaultValue: blockEntry.data?.selectors || "@a" });

    addDecorativeSection(nametagForm, "Outputs");
    nametagForm.toggle("Add this output", { defaultValue: false });
    nametagForm.textField("Output Name (optional)", "Auto-generated if blank", { defaultValue: "" });
    nametagForm.dropdown("Output Type", outputTypes, { defaultValueIndex: 0 });
    nametagForm.dropdown("Output Target", targetOptions, { defaultValueIndex: 0 });
    nametagForm.dropdown("Target Class Info", classInfoOptions, { defaultValueIndex: 0 });
    nametagForm.textField("Target Info Value", "Use true/false for toggles", { defaultValue: "" });
    nametagForm.textField("Delay (in ticks)", "0", { defaultValue: "0" });

    addDecorativeSection(nametagForm, "Existing Outputs");
    if (blockOutputs.length === 0) {
        nametagForm.label("No outputs exist.");
    } else {
        blockOutputs.forEach(output => {
            nametagForm.label(`Output name: ${output?.name || "(unnamed)"}`);
            nametagForm.label(`Output type: ${output?.outputType || "none"}`);
            nametagForm.label(`Target: ${output?.targetName || "(none)"}`);
            nametagForm.label(`Target class info: ${getOutputTargetLabel(output?.targetProperty)}`);
            nametagForm.label(`Target value: ${output?.targetValue || ""}`);
            nametagForm.label(`Delay: ${output?.delay ?? 0}`);
            nametagForm.toggle(`Delete: ${output?.name || "(unnamed output)"}`, { defaultValue: false });
            nametagForm.divider();
        });
    }

    const currentBlockName = blockEntry.data?.name;
    const inputsList = getBlocksTargetingCurrent(currentBlockName);
    const inputLines = inputsList.map(input => `  - ${input.outputName} from ${input.sourceBlockName}`);
    const emptyInputsMessage = currentBlockName
        ? "No blocks have outputs saved for this block."
        : "This block needs a name to receive inputs.";
    addReadOnlyListSection(nametagForm, "Inputs", inputLines, emptyInputsMessage);

    nametagForm.submitButton("Save");

    nametagForm.show(player).then((response) => {
        if (response.canceled) return;

        const formData = (response.formValues ?? []).filter(value => value !== undefined && value !== null);
        if (formData.length < 16) {
            player.sendMessage("§cSave failed: form data is incomplete.");
            return;
        }

        let cursor = 0;
        const name = `${formData[cursor++] ?? blockName}`;
        const startDisabled = Boolean(formData[cursor++]);
        const worksInUsernames = Boolean(formData[cursor++]);
        const worksInChat = Boolean(formData[cursor++]);
        const suffix = Boolean(formData[cursor++]);
        const prefix = Boolean(formData[cursor++]);
        const nametag = `${formData[cursor++] ?? ""}`.trim();
        const nametagOrderRaw = Number.parseInt(`${formData[cursor++] ?? "0"}`, 10);
        const nametagOrder = Number.isFinite(nametagOrderRaw) ? Math.max(0, nametagOrderRaw) : 0;
        const selectors = `${formData[cursor++] ?? "@a"}`.trim() || "@a";

        const addOutput = Boolean(formData[cursor++]);
        const outputNameRaw = `${formData[cursor++] ?? ""}`.trim();
        const outputTypeIndex = Number(formData[cursor++]);
        const outputTargetIndex = Number(formData[cursor++]);
        const outputTargetPropertyIndex = Number(formData[cursor++]);
        const outputTargetValue = `${formData[cursor++] ?? ""}`;
        const outputDelayRaw = Number.parseInt(`${formData[cursor++] ?? "0"}`, 10);
        const outputDelay = Number.isFinite(outputDelayRaw) ? Math.max(0, outputDelayRaw) : 0;

        let nextOutputs = blockOutputs;
        if (addOutput) {
            const outputTargetProperty = outputClassInfoTargets[outputTargetPropertyIndex] ?? outputClassInfoTargets[0] ?? "startDisabled";
            const selectedTargetEntry = namedTargetEntries[outputTargetIndex];
            const selectedTargetName = `${selectedTargetEntry?.name ?? ""}`.trim();
            const selectedTargetType = `${selectedTargetEntry?.typeId ?? ""}`.trim();

            if (!selectedTargetName) {
                player.sendMessage("§cChoose a valid Output Target before adding an output.");
                return;
            }

            if (!isOutputTargetSupportedByBlockType(outputTargetProperty, selectedTargetType)) {
                player.sendMessage(`§c${getOutputTargetLabel(outputTargetProperty)} is not valid for target type ${selectedTargetType.replace(/^brr:/, "") || "Unknown"}.`);
                return;
            }

            const outputName = outputNameRaw || `out_${outputTypes[outputTypeIndex] ?? "none"}_${selectedTargetName}_${Date.now().toString().slice(-4)}`;
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
        blockEntry.data.worksInUsernames = worksInUsernames;
        blockEntry.data.worksInChat = worksInChat;
        blockEntry.data.suffix = suffix;
        blockEntry.data.prefix = prefix;
        blockEntry.data.nametag = nametag;
        blockEntry.data.nametagOrder = nametagOrder;
        blockEntry.data.selectors = selectors;
        blockEntry.data.outputs = nextOutputs;

        if (onSave) onSave(blockEntry);
        player.sendMessage(`§aGame nametag \"${blockEntry.data.name}\" saved!`);
    });
}
