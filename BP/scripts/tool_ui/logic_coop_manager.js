import { ModalFormData } from "@minecraft/server-ui";
import { addDecorativeSection } from "./ui_formatting.js";
import { buildOutputSection, buildExistingOutputsSection, buildInputsSection, parseOutputResponse } from "./shared_output_ui.js";

// SECTION: Output Definitions
export const LOGIC_COOP_MANAGER_OUTPUT_TYPES = ["OnChangeToAllTrue", "OnChangeToAnyTrue", "OnChangeToAllFalse", "OnChangeToAnyFalse"];

// SECTION: Logic Coop Manager UI
export function logicCoopManagerUI(player, blockEntry, options) {
	const { onSave, getNamedTargetEntries, getBlocksTargetingCurrent, allInputs } = options;
	if (!blockEntry.data) blockEntry.data = {};
	if (!Array.isArray(blockEntry.data.outputs)) blockEntry.data.outputs = [];

	const blockOutputs = [...blockEntry.data.outputs];
	const namedTargetEntries = (typeof getNamedTargetEntries === "function" ? getNamedTargetEntries() : []).filter(e => e?.name);

	const form = new ModalFormData();
	form.title("Logic Coop Manager");

	addDecorativeSection(form, "Class Info");
	const blockName = blockEntry.data?.name || `logic_coop_${Math.round(Math.random() * 10000)}`;
	form.textField("Name", "name", { defaultValue: blockName });
	form.toggle("Start disabled", { defaultValue: Boolean(blockEntry.data?.startDisabled) });
	form.textField("Player A selector", "@a[tag=playerA]", { defaultValue: blockEntry.data?.playerASelector || "" });
	form.toggle("Player A state", { defaultValue: Boolean(blockEntry.data?.playerAState) });
	form.textField("Player B selector", "@a[tag=playerB]", { defaultValue: blockEntry.data?.playerBSelector || "" });
	form.toggle("Player B state", { defaultValue: Boolean(blockEntry.data?.playerBState) });

	buildOutputSection(form, { outputTypes: LOGIC_COOP_MANAGER_OUTPUT_TYPES, namedTargetEntries, allInputs });
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
		const playerASelector = `${formValues[cursor.value++] ?? ""}`.trim();
		const playerAState = Boolean(formValues[cursor.value++]);
		const playerBSelector = `${formValues[cursor.value++] ?? ""}`.trim();
		const playerBState = Boolean(formValues[cursor.value++]);

		const outputResult = parseOutputResponse(formValues, cursor, {
			outputTypes: LOGIC_COOP_MANAGER_OUTPUT_TYPES, namedTargetEntries, allInputs, blockOutputs
		});
		if (outputResult.error) { player.sendMessage(`§c${outputResult.error}`); return; }

		blockEntry.data = {
			...blockEntry.data,
			name, startDisabled,
			playerASelector, playerAState,
			playerBSelector, playerBState,
			outputs: outputResult.outputs
		};

		if (onSave) onSave(blockEntry);
		player.sendMessage(`§aLogic Coop Manager "${name}" saved!`);
	});
}
