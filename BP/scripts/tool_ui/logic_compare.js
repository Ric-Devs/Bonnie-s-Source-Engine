import { ModalFormData } from "@minecraft/server-ui";
import { addDecorativeSection } from "./ui_formatting.js";
import { buildOutputSection, buildExistingOutputsSection, buildInputsSection, parseOutputResponse } from "./shared_output_ui.js";

// SECTION: Output Definitions
export const LOGIC_COMPARE_OUTPUT_TYPES = ["OnLessThan", "OnEqualTo", "OnNotEqualTo", "OnGreaterThan"];
const COMPARE_CONDITIONS = ["OnLessThan", "OnEqualTo", "OnNotEqualTo", "OnGreaterThan"];

// SECTION: Logic Compare UI
export function logicCompareUI(player, blockEntry, options) {
	const { onSave, getNamedTargetEntries, getBlocksTargetingCurrent, allInputs } = options;
	if (!blockEntry.data) blockEntry.data = {};
	if (!Array.isArray(blockEntry.data.outputs)) blockEntry.data.outputs = [];
	if (!Array.isArray(blockEntry.data.comparisons)) blockEntry.data.comparisons = [];

	const blockOutputs = [...blockEntry.data.outputs];
	const comparisons = [...blockEntry.data.comparisons];
	const namedTargetEntries = (typeof getNamedTargetEntries === "function" ? getNamedTargetEntries() : []).filter(e => e?.name);
	const outputNames = blockOutputs.map(o => o.name).filter(n => n);
	const runOutputOptions = ["(None)", ...outputNames];

	const form = new ModalFormData();
	form.title("Logic Compare");

	addDecorativeSection(form, "Class Info");
	const blockName = blockEntry.data?.name || `logic_compare_${Math.round(Math.random() * 10000)}`;
	form.textField("Name", "name", { defaultValue: blockName });
	form.toggle("Start disabled", { defaultValue: Boolean(blockEntry.data?.startDisabled) });

	addDecorativeSection(form, "Comparisons");
	form.toggle("Add comparison?", { defaultValue: false });
	form.textField("Scoreboard objective", "objective name", { defaultValue: "" });
	form.textField("Scoreboard entity", "selector or fake player name", { defaultValue: "" });
	form.textField("Scoreboard initial value", "0", { defaultValue: "0" });
	form.dropdown("Comparing for", COMPARE_CONDITIONS, { defaultValueIndex: 0 });
	form.dropdown("Run output", runOutputOptions, { defaultValueIndex: 0 });
	form.textField("Run command", "Command (optional)", { defaultValue: "" });

	addDecorativeSection(form, "Existing Comparisons");
	if (comparisons.length === 0) {
		form.label("No comparisons exist.");
	} else {
		for (let i = 0; i < comparisons.length; i++) {
			const comp = comparisons[i];
			form.label(`Comparison ${i + 1}: ${comp.objective || "(no objective)"}`);
			form.label(`Entity: ${comp.entity || "(none)"}`);
			form.label(`Initial value: ${comp.initialValue ?? 0}`);
			form.label(`Comparing for: ${comp.comparingFor || "(none)"}`);
			form.label(`Run output: ${comp.runOutput || "(none)"}`);
			form.label(`Run command: ${comp.runCommand || "(none)"}`);
			form.toggle(`Delete comparison ${i + 1}`, { defaultValue: false });
			form.divider();
		}
	}

	buildOutputSection(form, { outputTypes: LOGIC_COMPARE_OUTPUT_TYPES, namedTargetEntries, allInputs });
	buildExistingOutputsSection(form, blockOutputs);
	buildInputsSection(form, blockEntry.data?.name, getBlocksTargetingCurrent);

	form.submitButton("Save");

	// SECTION: Form Submission Handling
	form.show(player).then((response) => {
		if (response.canceled) return;
		const formValues = (response.formValues ?? []).filter(v => v !== undefined && v !== null);
		let cursor = { value: 0 };

		const name = `${formValues[cursor.value++] ?? blockName}`;
		const startDisabled = Boolean(formValues[cursor.value++]);

		const shouldAddComparison = Boolean(formValues[cursor.value++]);
		const compObjective = `${formValues[cursor.value++] ?? ""}`.trim();
		const compEntity = `${formValues[cursor.value++] ?? ""}`.trim();
		const compInitialValue = `${formValues[cursor.value++] ?? "0"}`.trim();
		const compComparingForIndex = Number(formValues[cursor.value++]);
		const compRunOutputIndex = Number(formValues[cursor.value++]);
		const compRunCommand = `${formValues[cursor.value++] ?? ""}`.trim();

		if (shouldAddComparison && !compObjective) {
			player.sendMessage("§cScoreboard objective is required.");
			return;
		}

		let keptComparisons = [];
		for (let i = 0; i < comparisons.length; i++) {
			const shouldDelete = Boolean(formValues[cursor.value++]);
			if (!shouldDelete) keptComparisons.push(comparisons[i]);
		}

		if (shouldAddComparison) {
			keptComparisons.push({
				objective: compObjective,
				entity: compEntity,
				initialValue: compInitialValue,
				comparingFor: COMPARE_CONDITIONS[compComparingForIndex] ?? "OnEqualTo",
				runOutput: compRunOutputIndex > 0 ? runOutputOptions[compRunOutputIndex] : "",
				runCommand: compRunCommand
			});
		}

		const outputResult = parseOutputResponse(formValues, cursor, {
			outputTypes: LOGIC_COMPARE_OUTPUT_TYPES, namedTargetEntries, allInputs, blockOutputs
		});
		if (outputResult.error) { player.sendMessage(`§c${outputResult.error}`); return; }

		blockEntry.data = {
			...blockEntry.data,
			name, startDisabled,
			comparisons: keptComparisons,
			outputs: outputResult.outputs
		};

		if (onSave) onSave(blockEntry);
		player.sendMessage(`§aLogic Compare "${name}" saved!`);
	});
}
