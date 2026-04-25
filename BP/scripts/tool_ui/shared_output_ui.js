import { addDecorativeSection, addReadOnlyListSection } from "./ui_formatting.js";
import { getOutputTargetLabel, isOutputTargetSupportedByBlockType, outputClassInfoTargets } from "./output_ci_targets.js";

function formatBlockType(typeId) {
	const normalized = `${typeId ?? ""}`;
	if (!normalized) return "Unknown";
	return normalized.replace(/^brr:/, "").replace(/_/g, " ").replace(/\b\w/g, char => char.toUpperCase());
}

export function buildOutputSection(form, { outputTypes, namedTargetEntries, allInputs }) {
	const targetOptions = namedTargetEntries.length > 0
		? namedTargetEntries.map(entry => `${entry.name} (${formatBlockType(entry.typeId)})`)
		: ["(No named blocks)"];
	const classInfoOptions = (Array.isArray(allInputs) ? allInputs : outputClassInfoTargets).map(p => getOutputTargetLabel(p));

	addDecorativeSection(form, "Outputs");
	form.toggle("Add this output", { defaultValue: false });
	form.textField("Output Name (optional)", "Auto-generated if blank", { defaultValue: "" });
	form.dropdown("Output Type", outputTypes, { defaultValueIndex: 0 });
	form.dropdown("Output Target", targetOptions, { defaultValueIndex: 0 });
	form.dropdown("Target Class Info", classInfoOptions, { defaultValueIndex: 0 });
	form.textField("Target Info Value", "Use true/false for toggles", { defaultValue: "" });
	form.textField("Delay (in ticks)", "0", { defaultValue: "0" });
}

export function buildExistingOutputsSection(form, blockOutputs) {
	addDecorativeSection(form, "Existing Outputs");
	if (blockOutputs.length === 0) {
		form.label("No outputs exist.");
	} else {
		for (const output of blockOutputs) {
			form.label(`Output name: ${output?.name || "(unnamed)"}`);
			form.label(`Output type: ${output?.outputType || "none"}`);
			form.label(`Target: ${output?.targetName || "(none)"}`);
			form.label(`Target class info: ${getOutputTargetLabel(output?.targetProperty)}`);
			form.label(`Target value: ${output?.targetValue || ""}`);
			form.label(`Delay: ${output?.delay ?? 0}`);
			form.toggle(`Delete: ${output?.name || "(unnamed output)"}`, { defaultValue: false });
			form.divider();
		}
	}
}

export function buildInputsSection(form, blockName, getBlocksTargetingCurrent) {
	const inputsList = typeof getBlocksTargetingCurrent === "function" ? getBlocksTargetingCurrent(blockName) : [];
	const inputLines = inputsList.map(input => `  - ${input.outputName} from ${input.sourceBlockName}`);
	const emptyMessage = blockName
		? "No blocks have outputs saved for this block."
		: "This block needs a name to receive inputs.";
	addReadOnlyListSection(form, "Inputs", inputLines, emptyMessage);
}

export function parseOutputResponse(formValues, cursor, { outputTypes, namedTargetEntries, allInputs, blockOutputs }) {
	const shouldAddOutput = Boolean(formValues[cursor.value++]);
	const outputNameRaw = `${formValues[cursor.value++] ?? ""}`.trim();
	const outputTypeIndex = Number(formValues[cursor.value++]);
	const outputTargetIndex = Number(formValues[cursor.value++]);
	const outputTargetPropertyIndex = Number(formValues[cursor.value++]);
	const outputTargetValueRaw = `${formValues[cursor.value++] ?? ""}`;
	const outputDelayRaw = Number.parseInt(`${formValues[cursor.value++] ?? "0"}`, 10);
	const outputDelay = Number.isFinite(outputDelayRaw) ? Math.max(0, outputDelayRaw) : 0;

	const inputs = Array.isArray(allInputs) ? allInputs : outputClassInfoTargets;
	const outputTargetProperty = inputs[outputTargetPropertyIndex] ?? inputs[0] ?? "startDisabled";
	const selectedTargetEntry = namedTargetEntries[outputTargetIndex];
	const selectedTargetName = `${selectedTargetEntry?.name ?? ""}`.trim();
	const selectedTargetType = `${selectedTargetEntry?.typeId ?? ""}`.trim();
	const outputName = outputNameRaw || `out_${outputTypes[outputTypeIndex] ?? "none"}_${selectedTargetName || "target"}_${Date.now().toString().slice(-4)}`;

	let keptOutputs = [];
	for (let i = 0; i < blockOutputs.length; i++) {
		const shouldDelete = Boolean(formValues[cursor.value++]);
		if (!shouldDelete) keptOutputs.push(blockOutputs[i]);
	}

	if (shouldAddOutput) {
		if (!selectedTargetName) {
			return { error: "Choose a valid Output Target before adding an output." };
		}
		if (!isOutputTargetSupportedByBlockType(outputTargetProperty, selectedTargetType)) {
			return { error: `${getOutputTargetLabel(outputTargetProperty)} is not valid for target type ${formatBlockType(selectedTargetType)}.` };
		}
		keptOutputs.push({
			name: outputName,
			outputType: outputTypes[outputTypeIndex] ?? outputTypes[0],
			targetName: selectedTargetName,
			targetProperty: outputTargetProperty,
			targetValue: outputTargetValueRaw,
			delay: outputDelay
		});
	}

	return { outputs: keptOutputs };
}