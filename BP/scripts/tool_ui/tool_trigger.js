import { ModalFormData } from "@minecraft/server-ui";
import { addDecorativeSection, addReadOnlyListSection } from "./ui_formatting.js";
import { getOutputTargetLabel, isOutputTargetSupportedByBlockType } from "./output_ci_targets.js";

// SECTION: Trigger Runtime Helpers
export function isBlockedTriggerCommand(command) {
	const normalized = `${command ?? ""}`
		.trim()
		.replace(/^\/+/, "")
		.trim()
		.toLowerCase();

	return normalized === "op"
		|| normalized.startsWith("op ")
		|| normalized === "minecraft:op"
		|| normalized.startsWith("minecraft:op ")
		|| normalized === "deop"
		|| normalized.startsWith("deop ")
		|| normalized === "minecraft:deop"
		|| normalized.startsWith("minecraft:deop ");
}

export function getNormalizedTriggerData(data, conditionTools) {
	if (!data) return data;
	const normalized = { ...data };

	if (typeof normalized.executeCondition === "number") {
		normalized.executeCondition = conditionTools?.[normalized.executeCondition] ?? "noCondition";
	}

	if (typeof normalized.executeCondition !== "string" || !normalized.executeCondition) {
		normalized.executeCondition = "noCondition";
	}

	return normalized;
}

export function fireOutputsForEvent(sourceBlock, eventName, options) {
	if (!sourceBlock?.data || sourceBlock.data.startDisabled) return;
	const outputs = Array.isArray(sourceBlock.data.outputs) ? sourceBlock.data.outputs : [];
	if (outputs.length === 0) return;

	const { loadBlocks, saveBlocks, parseBooleanLike } = options ?? {};
	if (typeof loadBlocks !== "function" || typeof saveBlocks !== "function" || typeof parseBooleanLike !== "function") return;

	function resolveOutputTargetProperty(targetProperty) {
		const aliases = {
			playerspawnWorldSpawnAtBlock: "worldSpawnAtBlock",
			playerspawnWorldSpawn: "worldSpawn",
			playerspawnSetsPlayerSpawnPoint: "setsPlayerSpawnPoint",
			playerclipExcludeOperators: "excludeOperators",
			playerclipExcludeGamemode: "excludeGamemode",
			playerclipExcludeSelector: "excludeSelector",
			npcclipExcludeSelector: "excludeSelector",
			gameNametagWorksInUsernames: "worksInUsernames",
			gameNametagWorksInChat: "worksInChat",
			gameNametagSuffix: "suffix",
			gameNametagPrefix: "prefix",
			gameNametagNametag: "nametag",
			gameNametagOrder: "nametagOrder",
			gameNametagSelectors: "selectors"
		};

		return aliases[targetProperty] ?? targetProperty;
	}

	function coerceOutputTargetValue(targetProperty, rawValue) {
		if (targetProperty === "worldSpawnAtBlock"
			|| targetProperty === "setsPlayerSpawnPoint"
			|| targetProperty === "excludeOperators"
			|| targetProperty === "worksInUsernames"
			|| targetProperty === "worksInChat"
			|| targetProperty === "suffix"
			|| targetProperty === "prefix"
			|| targetProperty === "startDisabled") {
			return parseBooleanLike(rawValue, false);
		}

		return `${rawValue ?? ""}`;
	}

	const blocks = loadBlocks("blocks");
	let changed = false;

	for (const output of outputs) {
		if (`${output?.outputType ?? ""}` !== eventName) continue;

		const targetName = `${output?.targetName ?? ""}`.trim();
		const targetProperty = resolveOutputTargetProperty(`${output?.targetProperty ?? ""}`.trim());
		if (!targetName || !targetProperty) continue;

		const targetIndex = blocks.findIndex(block => `${block?.data?.name ?? ""}`.trim() === targetName);
		if (targetIndex === -1) continue;

		if (!blocks[targetIndex].data) blocks[targetIndex].data = {};
		blocks[targetIndex].data[targetProperty] = coerceOutputTargetValue(targetProperty, output?.targetValue);
		changed = true;
	}

	if (changed) saveBlocks("blocks", blocks);
}

// SECTION: Trigger UI
export function triggerToolUI(player, blockEntry, options) {
	if (!blockEntry.data) blockEntry.data = {};

	const {
		onSave,
		conditionTools,
		validateConditionRequirements,
		getNamedTargets,
		getNamedTargetEntries,
		getBlocksTargetingCurrent,
		outputTypes,
		inputs
	} = options;

	function formatBlockType(typeId) {
		const normalized = `${typeId ?? ""}`;
		if (!normalized) return "Unknown";

		return normalized
			.replace(/^brr:/, "")
			.replace(/_/g, " ")
			.replace(/\b\w/g, char => char.toUpperCase());
	}

	const triggerForm = new ModalFormData();
	triggerForm.title("Trigger Tool");
	if (!Array.isArray(blockEntry.data.outputs)) blockEntry.data.outputs = [];
	const blockOutputs = [...blockEntry.data.outputs];
	const namedTargetEntriesRaw = typeof getNamedTargetEntries === "function"
		? getNamedTargetEntries()
		: (typeof getNamedTargets === "function" ? getNamedTargets().map(name => ({ name, typeId: "" })) : []);
	const namedTargetEntries = namedTargetEntriesRaw.filter(entry => `${entry?.name ?? ""}`.trim().length > 0);
	const targetOptions = namedTargetEntries.length > 0
		? namedTargetEntries.map(entry => `${entry.name} (${formatBlockType(entry.typeId)})`)
		: ["(No named blocks)"];
	const classInfoOptions = (Array.isArray(inputs) ? inputs : []).map(property => getOutputTargetLabel(property));

	addDecorativeSection(triggerForm, "Class Info");
	const blockName = blockEntry.data?.name || `trigger${Math.round(Math.random() * 10000)}`;
	triggerForm.textField("Name", "name", { defaultValue: blockName });
	triggerForm.toggle("Start disabled", { defaultValue: Boolean(blockEntry.data?.startDisabled) });
	triggerForm.dropdown("Execute on condition", conditionTools, { defaultValueIndex: Math.max(0, conditionTools.indexOf(blockEntry.data?.executeCondition || "noCondition")) });
	triggerForm.textField("Condition value 1", "Value 1 (leave blank if not needed)", { defaultValue: blockEntry.data?.conditionValue1 || "" });
	triggerForm.textField("Condition value 2", "Value 2 (leave blank if not needed)", { defaultValue: blockEntry.data?.conditionValue2 || "" });
	triggerForm.textField("Condition value 3", "Value 3 (leave blank if not needed)", { defaultValue: blockEntry.data?.conditionValue3 || "" });
	triggerForm.textField("Run Command", "Command to execute", { defaultValue: blockEntry.data?.runCommand || "" });

	addDecorativeSection(triggerForm, "Outputs");
	triggerForm.toggle("Add this output", { defaultValue: false });
	triggerForm.textField("Output Name (optional)", "Auto-generated if blank", { defaultValue: "" });
	triggerForm.dropdown("Output Type", outputTypes, { defaultValueIndex: 0 });
	triggerForm.dropdown("Output Target", targetOptions, { defaultValueIndex: 0 });
	triggerForm.dropdown("Target Class Info", classInfoOptions, { defaultValueIndex: 0 });
	triggerForm.textField("Target Info Value", "Use true/false for toggles", { defaultValue: "" });
	triggerForm.textField("Delay (in ticks)", "0", { defaultValue: "0" });

	addDecorativeSection(triggerForm, "Existing Outputs");
	if (blockOutputs.length === 0) {
		triggerForm.label("No outputs exist.");
	} else {
		for (const output of blockOutputs) {
			triggerForm.label(`Output name: ${output?.name || "(unnamed)"}`);
			triggerForm.label(`Output type: ${output?.outputType || "none"}`);
			triggerForm.label(`Target: ${output?.targetName || "(none)"}`);
			triggerForm.label(`Target class info: ${getOutputTargetLabel(output?.targetProperty)}`);
			triggerForm.label(`Target value: ${output?.targetValue || ""}`);
			triggerForm.label(`Delay: ${output?.delay ?? 0}`);
			triggerForm.toggle(`Delete: ${output?.name || "(unnamed output)"}`, { defaultValue: false });
			triggerForm.divider();
		}
	}

	const currentBlockName = blockEntry.data?.name;
	const inputsList = getBlocksTargetingCurrent(currentBlockName);
	const inputLines = inputsList.map(input => `  - ${input.outputName} from ${input.sourceBlockName}`);
	const emptyInputsMessage = currentBlockName
		? "No blocks have outputs saved for this block."
		: "This block needs a name to receive inputs.";
	addReadOnlyListSection(triggerForm, "Inputs", inputLines, emptyInputsMessage);

	triggerForm.submitButton("Save");

	triggerForm.show(player).then((response) => {
		if (response.canceled) return;

		const formValues = (response.formValues ?? []).filter(value => value !== undefined && value !== null);
		if (formValues.length < 14) {
			player.sendMessage("§cSave failed: form data is incomplete.");
			return;
		}

		let cursor = 0;
		const name = `${formValues[cursor++] ?? blockName}`;
		const startDisabled = Boolean(formValues[cursor++]);
		const selectedCondition = conditionTools[Number(formValues[cursor++])] ?? "noCondition";
		const v1 = `${formValues[cursor++] ?? ""}`;
		const v2 = `${formValues[cursor++] ?? ""}`;
		const v3 = `${formValues[cursor++] ?? ""}`;
		const runCommand = `${formValues[cursor++] ?? ""}`;

		const shouldAddOutput = Boolean(formValues[cursor++]);
		const outputNameRaw = `${formValues[cursor++] ?? ""}`.trim();
		const outputTypeIndex = Number(formValues[cursor++]);
		const outputTargetIndex = Number(formValues[cursor++]);
		const outputTargetPropertyIndex = Number(formValues[cursor++]);
		const outputTargetValueRaw = `${formValues[cursor++] ?? ""}`;
		const outputDelayRaw = Number.parseInt(`${formValues[cursor++] ?? "0"}`, 10);
		const outputDelay = Number.isFinite(outputDelayRaw) ? Math.max(0, outputDelayRaw) : 0;
		const outputTargetProperty = inputs[outputTargetPropertyIndex] ?? inputs[0] ?? "startDisabled";
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
		if (shouldAddOutput) {
			if (!selectedTargetName) {
				player.sendMessage("§cChoose a valid Output Target before adding an output.");
				return;
			}

			if (!isOutputTargetSupportedByBlockType(outputTargetProperty, selectedTargetType)) {
				player.sendMessage(`§c${getOutputTargetLabel(outputTargetProperty)} is not valid for target type ${formatBlockType(selectedTargetType)}.`);
				return;
			}

			nextOutputs.push({
				name: outputName,
				outputType: outputTypes[outputTypeIndex] ?? outputTypes[0] ?? "onTrue",
				targetName: selectedTargetName,
				targetProperty: outputTargetProperty,
				targetValue: outputTargetValue,
				delay: outputDelay
			});
		}

		if (blockOutputs.length > 0) {
			const outputsToKeep = [];
			for (let i = 0; i < blockOutputs.length; i++) {
				const shouldDelete = Boolean(formValues[cursor++]);
				if (!shouldDelete) outputsToKeep.push(blockOutputs[i]);
			}
			nextOutputs = outputsToKeep;
		}

		const validationError = validateConditionRequirements(selectedCondition, v1, v2, v3);
		if (validationError) {
			player.sendMessage(`§c${validationError}`);
			return;
		}

		if (isBlockedTriggerCommand(runCommand)) {
			player.sendMessage("§cBlocked command: /op and /deop are blacklisted from Trigger blocks. Nice try kiddo");
			return;
		}

		blockEntry.data = {
			...blockEntry.data,
			name,
			startDisabled,
			executeCondition: selectedCondition,
			conditionValue1: v1,
			conditionValue2: v2,
			conditionValue3: v3,
			runCommand,
			outputs: nextOutputs
		};

		if (onSave) onSave(blockEntry);
		player.sendMessage(`§aTrigger "${blockEntry.data.name}" saved!`);
	});
}

