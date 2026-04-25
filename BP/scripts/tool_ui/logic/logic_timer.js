import { ModalFormData } from "@minecraft/server-ui";
import { addDecorativeSection, sendUiError, sendUiSaved } from "../ui_formatting.js";
import { buildOutputSection, buildExistingOutputsSection, buildInputsSection, parseOutputResponse } from "../shared_output_ui.js";

// SECTION: Output Definitions
export const LOGIC_TIMER_OUTPUT_TYPES = ["onTimerFired"];

// SECTION: Logic Timer UI
export function logicTimerUI(player, blockEntry, options) {
	const { onSave, getNamedTargetEntries, getBlocksTargetingCurrent, allInputs } = options;
	if (!blockEntry.data) blockEntry.data = {};
	if (!Array.isArray(blockEntry.data.outputs)) blockEntry.data.outputs = [];

	const blockOutputs = [...blockEntry.data.outputs];
	const namedTargetEntries = (typeof getNamedTargetEntries === "function" ? getNamedTargetEntries() : []).filter(e => e?.name);
	const outputNames = blockOutputs.map(o => o.name).filter(n => n);
	const runOutputOptions = ["(None)", ...outputNames];

	const form = new ModalFormData();
	form.title("Logic Timer");

	addDecorativeSection(form, "�1�1Logic Timer");
	const blockName = blockEntry.data?.name || `logic_timer_${Math.round(Math.random() * 10000)}`;
	form.textField("Name", "name", { defaultValue: blockName });
	form.toggle("Start disabled", { defaultValue: blockEntry.data?.startDisabled !== undefined ? Boolean(blockEntry.data.startDisabled) : true });
	form.textField("Timer (ticks)", "20", { defaultValue: `${blockEntry.data?.timer || "20"}` });
	form.dropdown("Run output", runOutputOptions, { defaultValueIndex: Math.max(0, runOutputOptions.indexOf(blockEntry.data?.runOutput || "(None)")) });
	form.textField("Run command", "Command (optional)", { defaultValue: blockEntry.data?.runCommand || "" });

	buildOutputSection(form, { outputTypes: LOGIC_TIMER_OUTPUT_TYPES, namedTargetEntries, allInputs });
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
		const timer = `${formValues[cursor.value++] ?? "20"}`.trim();
		const runOutputIndex = Number(formValues[cursor.value++]);
		const runCommand = `${formValues[cursor.value++] ?? ""}`.trim();

		if (!parseInt(timer) || parseInt(timer) < 1) {
			sendUiError(player, "Timer must be at least 1 tick.");
			return;
		}

		const outputResult = parseOutputResponse(formValues, cursor, {
			outputTypes: LOGIC_TIMER_OUTPUT_TYPES, namedTargetEntries, allInputs, blockOutputs
		});
		if (outputResult.error) { sendUiError(player, outputResult.error); return; }

		blockEntry.data = {
			...blockEntry.data,
			name, startDisabled,
			timer,
			runOutput: runOutputIndex > 0 ? runOutputOptions[runOutputIndex] : "",
			runCommand,
			outputs: outputResult.outputs
		};

		if (onSave) onSave(blockEntry);
		sendUiSaved(player, "Logic Timer", name);
	});
}