import { ModalFormData } from "@minecraft/server-ui";
import { world } from "@minecraft/server";
import { outputClassInfoTargets, outputTypes } from "../output_ci_targets.js";
import { addDecorativeSection, addReadOnlyListSection, sendUiError, sendUiSaved } from "../ui_formatting.js";

// SECTION: Target AreaPortal UI Data Helpers
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

// SECTION: Target AreaPortal UI
export function infoTargetAreaportalUI(player, blockEntry, onSave) {
    if (!blockEntry.data) blockEntry.data = {};
    if (!Array.isArray(blockEntry.data.outputs)) blockEntry.data.outputs = [];

    const blockOutputs = [...blockEntry.data.outputs];
    const namedTargets = getNamedTargets();
    const targetOptions = namedTargets.length > 0 ? namedTargets : ["(No named blocks)"];

    const targetForm = new ModalFormData();
    targetForm.title("Info Target AreaPortal Block");
    addDecorativeSection(targetForm, "§1§1Info Target AreaPortal Block");

    const targetName = blockEntry.data?.name || `target_areaportal${Math.round(Math.random() * 10000)}`;
    targetForm.textField("Name", "name", { defaultValue: targetName });
    targetForm.toggle("Start disabled", { defaultValue: Boolean(blockEntry.data?.startDisabled) });
    targetForm.textField("Facing Direction", "Pos: XYZ (optional)", { defaultValue: blockEntry.data?.targetFacingDirection || "" });

    addDecorativeSection(targetForm, "Outputs");
    targetForm.toggle("Add this output", { defaultValue: false });
    targetForm.textField("Output Name", "name", { defaultValue: `output${Math.round(Math.random() * 10000)}` });
    targetForm.dropdown("Output Type", outputTypes, { defaultValueIndex: 0 });
    targetForm.dropdown("Output Target", targetOptions, { defaultValueIndex: 0 });
    targetForm.dropdown("Target Class Info", outputClassInfoTargets, { defaultValueIndex: 0 });
    targetForm.textField("Target Info Value", "Value", { defaultValue: "" });
    targetForm.textField("Delay (in ticks)", "0", { defaultValue: "0" });

    addDecorativeSection(targetForm, "Existing Outputs");
    if (blockOutputs.length === 0) {
        targetForm.label("No outputs exist.");
    } else {
        blockOutputs.forEach(output => {
            targetForm.label(`Output name: ${output?.name || "(unnamed)"}`);
            targetForm.label(`Output type: ${output?.outputType || "none"}`);
            targetForm.label(`Target: ${output?.targetName || "(none)"}`);
            targetForm.label(`Target class info: ${output?.targetProperty || "(none)"}`);
            targetForm.label(`Target value: ${output?.targetValue || ""}`);
            targetForm.label(`Delay: ${output?.delay ?? 0}`);
            targetForm.toggle(`Delete: ${output?.name || "(unnamed output)"}`, { defaultValue: false });
            targetForm.divider();
        });
    }

    const currentBlockName = blockEntry.data?.name;
    const inputsList = getBlocksTargetingCurrent(currentBlockName);
    const inputLines = inputsList.map(input => `  - ${input.outputName} from ${input.sourceBlockName}`);
    const emptyInputsMessage = currentBlockName
        ? "No blocks have outputs saved for this block."
        : "This block needs a name to receive inputs.";
    addReadOnlyListSection(targetForm, "Inputs", inputLines, emptyInputsMessage);

    targetForm.submitButton("Save");

    targetForm.show(player).then((response) => {
        if (response.canceled) return;

        const formData = (response.formValues ?? []).filter(value => value !== undefined && value !== null);
        if (formData.length < 10) {
            sendUiError(player, "Save failed: form data is incomplete.");
            return;
        }

        let cursor = 0;
        const name = `${formData[cursor++] ?? targetName}`;
        const startDisabled = Boolean(formData[cursor++]);
        const targetFacingDirection = `${formData[cursor++] ?? ""}`.trim();

        const addOutput = Boolean(formData[cursor++]);
        const outputName = `${formData[cursor++] ?? ""}`.trim();
        const outputTypeIndex = Number(formData[cursor++]);
        const outputTargetIndex = Number(formData[cursor++]);
        const outputTargetPropertyIndex = Number(formData[cursor++]);
        const outputTargetValue = `${formData[cursor++] ?? ""}`;
        const outputDelayRaw = Number.parseInt(`${formData[cursor++] ?? "0"}`, 10);
        const outputDelay = Number.isFinite(outputDelayRaw) ? Math.max(0, outputDelayRaw) : 0;

        let nextOutputs = blockOutputs;
        if (addOutput && outputName) {
            const selectedTarget = targetOptions[outputTargetIndex] ?? "";
            if (selectedTarget && selectedTarget !== "(No named blocks)") {
                nextOutputs.push({
                    name: outputName,
                    outputType: outputTypes[outputTypeIndex] ?? outputTypes[0] ?? "none",
                    targetName: selectedTarget,
                    targetProperty: outputClassInfoTargets[outputTargetPropertyIndex] ?? outputClassInfoTargets[0] ?? "startDisabled",
                    targetValue: outputTargetValue,
                    delay: outputDelay
                });
            }
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
        blockEntry.data.targetFacingDirection = targetFacingDirection;
        blockEntry.data.outputs = nextOutputs;

        // Call the save callback
        if (onSave) onSave(blockEntry);
        sendUiSaved(player, "AreaPortal target", blockEntry.data.name);
    });
}