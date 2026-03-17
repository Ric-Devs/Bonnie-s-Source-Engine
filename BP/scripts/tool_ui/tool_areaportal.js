import { ModalFormData } from "@minecraft/server-ui";
import { world } from "@minecraft/server";
import { outputClassInfoTargets, outputTypes, getOutputTargetLabel, isOutputTargetSupportedByBlockType } from "./output_ci_targets.js";
import { addDecorativeSection, addReadOnlyListSection } from "./ui_formatting.js";

// SECTION: AreaPortal Runtime Helpers
export function getAreaPortalTargets(block, selectorRaw, options) {
    const selector = `${selectorRaw ?? "minecraft:player"}`.trim();
    const normalized = selector.toLowerCase();

    const { parseSelectorFilters, applyEntityFilters } = options ?? {};

    let dimension;
    try {
        dimension = world.getDimension(block.dimension);
    } catch {
        return [];
    }

    const blockCenter = { x: block.x + 0.5, y: block.y + 0.5, z: block.z + 0.5 };

    if (normalized.startsWith("@")) {
        const filters = typeof parseSelectorFilters === "function" ? parseSelectorFilters(selector) : null;
        const base = normalized.slice(0, 2);

        if (base === "@a") {
            let players = Array.from(dimension.getPlayers());
            players = typeof applyEntityFilters === "function" ? applyEntityFilters(players, filters) : players;
            return players;
        }

        if (base === "@e") {
            let entities = Array.from(dimension.getEntities());
            entities = typeof applyEntityFilters === "function" ? applyEntityFilters(entities, filters) : entities;
            return entities;
        }

        if (base === "@p") {
            let players = Array.from(dimension.getPlayers());
            players = typeof applyEntityFilters === "function" ? applyEntityFilters(players, filters) : players;
            if (players.length === 0) return [];

            players.sort((a, b) => {
                const adx = a.location.x - blockCenter.x;
                const ady = a.location.y - blockCenter.y;
                const adz = a.location.z - blockCenter.z;
                const bdx = b.location.x - blockCenter.x;
                const bdy = b.location.y - blockCenter.y;
                const bdz = b.location.z - blockCenter.z;
                return (adx * adx + ady * ady + adz * adz) - (bdx * bdx + bdy * bdy + bdz * bdz);
            });

            return [players[0]];
        }

        if (base === "@r") {
            let players = Array.from(dimension.getPlayers());
            players = typeof applyEntityFilters === "function" ? applyEntityFilters(players, filters) : players;
            if (players.length === 0) return [];
            const randomIndex = Math.floor(Math.random() * players.length);
            return [players[randomIndex]];
        }

        if (base === "@s") {
            return [];
        }

        return [];
    }

    if (normalized === "minecraft:player") {
        return Array.from(dimension.getPlayers());
    }

    try {
        return Array.from(dimension.getEntities({ type: selector }));
    } catch {
        return [];
    }
}

export function handleAreaPortalBlock(block, blocks, options) {
    if (!block || !blocks) return;

    const { isEntityInsideBlock, parseSelectorFilters, applyEntityFilters } = options ?? {};
    if (typeof isEntityInsideBlock !== "function") return;

    const targets = getAreaPortalTargets(block, block.data?.selector, { parseSelectorFilters, applyEntityFilters });
    for (const entity of targets) {
        if (!isEntityInsideBlock(entity, block)) continue;

        let destCoords = null;
        const destDim = world.getDimension(block.dimension);

        if (block.data?.destinationBlock) {
            const targetBlock = blocks.find(b => b.typeId === "brr:info_target_areaportal_block" && b.data?.name === block.data.destinationBlock);
            if (targetBlock) {
                destCoords = { x: targetBlock.x + 0.5, y: targetBlock.y, z: targetBlock.z + 0.5 };
                const facingRaw = `${targetBlock.data?.targetFacingDirection ?? ""}`.trim();
                const facingParts = facingRaw.split(/\s+/).map(part => Number.parseFloat(part));
                const hasFacing = facingParts.length === 3 && facingParts.every(Number.isFinite);

                if (hasFacing) {
                    const fx = facingParts[0];
                    const fy = facingParts[1];
                    const fz = facingParts[2];
                    const dx = fx - destCoords.x;
                    const dy = fy - destCoords.y;
                    const dz = fz - destCoords.z;
                    const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
                    const yaw = Math.atan2(-dx, dz) * (180 / Math.PI);
                    const pitch = Math.atan2(dy, horizontalDistance) * (180 / Math.PI);

                    try {
                        entity.teleport(destCoords, {
                            dimension: destDim,
                            rotation: {
                                x: pitch,
                                y: yaw
                            }
                        });
                        continue;
                    } catch { }
                }
            }
        } else if (block.data?.destination) {
            const coords = `${block.data.destination}`.trim().split(/\s+/);
            if (coords.length === 3) {
                destCoords = { x: Number.parseFloat(coords[0]), y: Number.parseFloat(coords[1]), z: Number.parseFloat(coords[2]) };
            }
        }

        if (destCoords && destDim) {
            try {
                entity.teleport(destCoords, { dimension: destDim });
            } catch { }
        }
    }
}

// SECTION: AreaPortal UI Data Helpers
function getNamedAreaPortals() {
    const blocks = loadLargeJSON("blocks");
    return blocks.filter(b => b.typeId === "brr:info_target_areaportal_block" && b.data?.name).map(b => b.data.name);
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

// SECTION: AreaPortal UI
export function areaPortalToolUI(player, blockEntry, onSave) {
    if (!blockEntry.data) blockEntry.data = {};
    if (!Array.isArray(blockEntry.data.outputs)) blockEntry.data.outputs = [];

    const namedPortals = getNamedAreaPortals();
    const portalOptions = ["(None)"].concat(namedPortals);
    const blockOutputs = [...blockEntry.data.outputs];
    const namedTargetEntries = getNamedTargetEntries();
    const targetOptions = namedTargetEntries.length > 0
        ? namedTargetEntries.map(entry => `${entry.name} (${`${entry.typeId ?? ""}`.replace(/^brr:/, "") || "Unknown"})`)
        : ["(No named blocks)"];
    const classInfoOptions = outputClassInfoTargets.map(target => getOutputTargetLabel(target));

    const portalForm = new ModalFormData();
    portalForm.title("Area Portal Tool");
    addDecorativeSection(portalForm, "Class Info");

    const portalName = blockEntry.data?.name || `areaportal${Math.round(Math.random() * 10000)}`;
    portalForm.textField("Name", "name", { defaultValue: portalName });
    portalForm.toggle("Start disabled", { defaultValue: Boolean(blockEntry.data?.startDisabled) });
    portalForm.textField("Selector", "Selector (e.g., minecraft:player)", { defaultValue: blockEntry.data?.selector || "minecraft:player" });
    portalForm.textField("Destination", "Pos: XYZ (leave blank if using Destination Block)", { defaultValue: blockEntry.data?.destination || "" });
    portalForm.dropdown("Destination Block", portalOptions, { defaultValueIndex: blockEntry.data?.destinationBlock ? namedPortals.indexOf(blockEntry.data.destinationBlock) + 1 : 0 });

    addDecorativeSection(portalForm, "Outputs");
    portalForm.toggle("Add this output", { defaultValue: false });
    portalForm.textField("Output Name (optional)", "Auto-generated if blank", { defaultValue: "" });
    portalForm.dropdown("Output Type", outputTypes, { defaultValueIndex: 0 });
    portalForm.dropdown("Output Target", targetOptions, { defaultValueIndex: 0 });
    portalForm.dropdown("Target Class Info", classInfoOptions, { defaultValueIndex: 0 });
    portalForm.textField("Target Info Value", "Use true/false for toggles", { defaultValue: "" });
    portalForm.textField("Delay (in ticks)", "0", { defaultValue: "0" });

    addDecorativeSection(portalForm, "Existing Outputs");
    if (blockOutputs.length === 0) {
        portalForm.label("No outputs exist.");
    } else {
        blockOutputs.forEach(output => {
            portalForm.label(`Output name: ${output?.name || "(unnamed)"}`);
            portalForm.label(`Output type: ${output?.outputType || "none"}`);
            portalForm.label(`Target: ${output?.targetName || "(none)"}`);
            portalForm.label(`Target class info: ${getOutputTargetLabel(output?.targetProperty)}`);
            portalForm.label(`Target value: ${output?.targetValue || ""}`);
            portalForm.label(`Delay: ${output?.delay ?? 0}`);
            portalForm.toggle(`Delete: ${output?.name || "(unnamed output)"}`, { defaultValue: false });
            portalForm.divider();
        });
    }

    const currentBlockName = blockEntry.data?.name;
    const inputsList = getBlocksTargetingCurrent(currentBlockName);
    const inputLines = inputsList.map(input => `  - ${input.outputName} from ${input.sourceBlockName}`);
    const emptyInputsMessage = currentBlockName
        ? "No blocks have outputs saved for this block."
        : "This block needs a name to receive inputs.";
    addReadOnlyListSection(portalForm, "Inputs", inputLines, emptyInputsMessage);

    portalForm.submitButton("Save");

    portalForm.show(player).then((response) => {
        if (response.canceled) return;

        const formData = (response.formValues ?? []).filter(value => value !== undefined && value !== null);
        if (formData.length < 12) {
            player.sendMessage("§cSave failed: form data is incomplete.");
            return;
        }

        let cursor = 0;

        const name = `${formData[cursor++] ?? portalName}`;
        const startDisabled = Boolean(formData[cursor++]);
        const selector = `${formData[cursor++] ?? "minecraft:player"}`;
        const destination = `${formData[cursor++] ?? ""}`;
        const selectedPortalIndex = Number(formData[cursor++]);

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
                player.sendMessage("§cChoose a valid Output Target before adding an output.");
                return;
            }

            if (!isOutputTargetSupportedByBlockType(outputTargetProperty, selectedTargetType)) {
                player.sendMessage(`§c${getOutputTargetLabel(outputTargetProperty)} is not valid for the selected target block type.`);
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
        blockEntry.data.selector = selector;
        blockEntry.data.destination = destination;
        if (selectedPortalIndex > 0) {
            blockEntry.data.destinationBlock = namedPortals[selectedPortalIndex - 1];
            // Clear destination if using destinationBlock
            blockEntry.data.destination = "";
        } else {
            blockEntry.data.destinationBlock = "";
        }
        blockEntry.data.outputs = nextOutputs;

        // Validate that at least one destination method is chosen
        if (!blockEntry.data.destination && !blockEntry.data.destinationBlock) {
            player.sendMessage("§cError: You must specify either a Destination or Destination Block!");
            return;
        }

        // Call the save callback
        if (onSave) onSave(blockEntry);
        player.sendMessage(`§aArea Portal "${blockEntry.data.name}" saved!`);
    });
}
