import { ModalFormData } from "@minecraft/server-ui";
import { addDecorativeSection, sendUiError, sendUiSaved } from "../ui_formatting.js";
import { conditionTools } from "../conditions_tools.js";
import { buildOutputSection, buildExistingOutputsSection, buildInputsSection, parseOutputResponse } from "../shared_output_ui.js";

// SECTION: Output Definitions
export const LOGIC_BRANCH_OUTPUT_TYPES = ["onTrue", "onFalse"];

// SECTION: Logic Branch UI
export function logicBranchUI(player, blockEntry, options) {
	const { onSave, getNamedTargetEntries, getBlocksTargetingCurrent, allInputs, validateConditionRequirements } = options;
	if (!blockEntry.data) blockEntry.data = {};
	if (!Array.isArray(blockEntry.data.outputs)) blockEntry.data.outputs = [];

	const blockOutputs = [...blockEntry.data.outputs];
	const namedTargetEntries = (typeof getNamedTargetEntries === "function" ? getNamedTargetEntries() : []).filter(e => e?.name);
	const outputNames = blockOutputs.map(o => o.name).filter(n => n);
	const runOutputOptions = ["(None)", ...outputNames];

	const form = new ModalFormData();
	form.title("Logic Branch");

	addDecorativeSection(form, "�1�1Logic Branch");
	const blockName = blockEntry.data?.name || `logic_branch_${Math.round(Math.random() * 10000)}`;
	form.textField("Name", "name", { defaultValue: blockName });
	form.toggle("Start disabled", { defaultValue: Boolean(blockEntry.data?.startDisabled) });
	form.dropdown("Output test", conditionTools, { defaultValueIndex: Math.max(0, conditionTools.indexOf(blockEntry.data?.executeCondition || "noCondition")) });
	form.textField("Condition Value 1", "Value 1 (leave blank if not needed)", { defaultValue: blockEntry.data?.conditionValue1 || "" });
	form.textField("Condition Value 2", "Value 2 (leave blank if not needed)", { defaultValue: blockEntry.data?.conditionValue2 || "" });
	form.textField("Condition Value 3", "Value 3 (leave blank if not needed)", { defaultValue: blockEntry.data?.conditionValue3 || "" });
	form.toggle("Run once?", { defaultValue: Boolean(blockEntry.data?.runOnce) });
	form.textField("Run interval (ticks)", "0 = only on change", { defaultValue: `${blockEntry.data?.runInterval || "0"}` });
	form.dropdown("If true run output", runOutputOptions, { defaultValueIndex: Math.max(0, runOutputOptions.indexOf(blockEntry.data?.ifTrueRunOutput || "(None)")) });
	form.dropdown("If false run output", runOutputOptions, { defaultValueIndex: Math.max(0, runOutputOptions.indexOf(blockEntry.data?.ifFalseRunOutput || "(None)")) });
	form.textField("If true run command", "Command (optional)", { defaultValue: blockEntry.data?.ifTrueRunCommand || "" });
	form.textField("If false run command", "Command (optional)", { defaultValue: blockEntry.data?.ifFalseRunCommand || "" });

	buildOutputSection(form, { outputTypes: LOGIC_BRANCH_OUTPUT_TYPES, namedTargetEntries, allInputs });
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
		const selectedCondition = conditionTools[Number(formValues[cursor.value++])] ?? "noCondition";
		const v1 = `${formValues[cursor.value++] ?? ""}`;
		const v2 = `${formValues[cursor.value++] ?? ""}`;
		const v3 = `${formValues[cursor.value++] ?? ""}`;
		const runOnce = Boolean(formValues[cursor.value++]);
		const runInterval = `${formValues[cursor.value++] ?? "0"}`.trim();
		const ifTrueRunOutputIndex = Number(formValues[cursor.value++]);
		const ifFalseRunOutputIndex = Number(formValues[cursor.value++]);
		const ifTrueRunCommand = `${formValues[cursor.value++] ?? ""}`.trim();
		const ifFalseRunCommand = `${formValues[cursor.value++] ?? ""}`.trim();

		if (typeof validateConditionRequirements === "function") {
			const validationError = validateConditionRequirements(selectedCondition, v1, v2, v3);
			if (validationError) {
				sendUiError(player, validationError);
				return;
			}
		}

		const outputResult = parseOutputResponse(formValues, cursor, {
			outputTypes: LOGIC_BRANCH_OUTPUT_TYPES, namedTargetEntries, allInputs, blockOutputs
		});
		if (outputResult.error) { sendUiError(player, outputResult.error); return; }

		blockEntry.data = {
			...blockEntry.data,
			name, startDisabled,
			executeCondition: selectedCondition,
			conditionValue1: v1, conditionValue2: v2, conditionValue3: v3,
			runOnce, runInterval,
			ifTrueRunOutput: ifTrueRunOutputIndex > 0 ? runOutputOptions[ifTrueRunOutputIndex] : "",
			ifFalseRunOutput: ifFalseRunOutputIndex > 0 ? runOutputOptions[ifFalseRunOutputIndex] : "",
			ifTrueRunCommand, ifFalseRunCommand,
			outputs: outputResult.outputs
		};

		if (onSave) onSave(blockEntry);
		sendUiSaved(player, "Logic Branch", name);
	});
}