import { ModalFormData } from "@minecraft/server-ui";
import { addDecorativeSection, sendUiError, sendUiSaved } from "../ui_formatting.js";
import { conditionTools } from "../conditions_tools.js";
import { buildOutputSection, buildExistingOutputsSection, buildInputsSection, parseOutputResponse } from "../shared_output_ui.js";

// SECTION: Output Definitions
export const LOGIC_CASE_OUTPUT_TYPES = [
	"onCase1", "onCase2", "onCase3", "onCase4", "onCase5", "onCase6", "onCase7", "onCase8",
	"onCase9", "onCase10", "onCase11", "onCase12", "onCase13", "onCase14", "onCase15", "onCase16"
];

// SECTION: Logic Case UI
export function logicCaseUI(player, blockEntry, options) {
	const { onSave, getNamedTargetEntries, getBlocksTargetingCurrent, allInputs, validateConditionRequirements } = options;
	if (!blockEntry.data) blockEntry.data = {};
	if (!Array.isArray(blockEntry.data.outputs)) blockEntry.data.outputs = [];
	if (!Array.isArray(blockEntry.data.cases)) blockEntry.data.cases = [];

	const blockOutputs = [...blockEntry.data.outputs];
	const cases = [...blockEntry.data.cases];
	const namedTargetEntries = (typeof getNamedTargetEntries === "function" ? getNamedTargetEntries() : []).filter(e => e?.name);
	const outputNames = blockOutputs.map(o => o.name).filter(n => n);
	const runOutputOptions = ["(None)", ...outputNames];

	const form = new ModalFormData();
	form.title("Logic Case");

	addDecorativeSection(form, "�1�1Logic Case");
	const blockName = blockEntry.data?.name || `logic_case_${Math.round(Math.random() * 10000)}`;
	form.textField("Name", "name", { defaultValue: blockName });
	form.toggle("Start disabled", { defaultValue: Boolean(blockEntry.data?.startDisabled) });

	addDecorativeSection(form, "Cases");
	form.toggle("Add case?", { defaultValue: false });
	form.dropdown("Case condition", conditionTools, { defaultValueIndex: 0 });
	form.textField("Case condition value 1", "Value 1", { defaultValue: "" });
	form.textField("Case condition value 2", "Value 2", { defaultValue: "" });
	form.textField("Case condition value 3", "Value 3", { defaultValue: "" });
	form.dropdown("If case matches run output", runOutputOptions, { defaultValueIndex: 0 });
	form.textField("If case matches run command", "Command (optional)", { defaultValue: "" });

	addDecorativeSection(form, "Existing Cases");
	if (cases.length === 0) {
		form.label("No cases exist.");
	} else {
		for (let i = 0; i < cases.length; i++) {
			const c = cases[i];
			form.label(`Case ${i + 1}: ${c.condition || "noCondition"}`);
			form.label(`Values: ${c.conditionValue1 || "-"}, ${c.conditionValue2 || "-"}, ${c.conditionValue3 || "-"}`);
			form.label(`Run output: ${c.runOutput || "(none)"}`);
			form.label(`Run command: ${c.runCommand || "(none)"}`);
			form.toggle(`Delete case ${i + 1}`, { defaultValue: false });
			form.divider();
		}
	}

	buildOutputSection(form, { outputTypes: LOGIC_CASE_OUTPUT_TYPES, namedTargetEntries, allInputs });
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

		const shouldAddCase = Boolean(formValues[cursor.value++]);
		const caseConditionIndex = Number(formValues[cursor.value++]);
		const caseV1 = `${formValues[cursor.value++] ?? ""}`;
		const caseV2 = `${formValues[cursor.value++] ?? ""}`;
		const caseV3 = `${formValues[cursor.value++] ?? ""}`;
		const caseRunOutputIndex = Number(formValues[cursor.value++]);
		const caseRunCommand = `${formValues[cursor.value++] ?? ""}`.trim();

		if (shouldAddCase && cases.length >= 16) {
			sendUiError(player, "Maximum of 16 cases per block.");
			return;
		}

		const caseCondition = conditionTools[caseConditionIndex] ?? "noCondition";
		if (shouldAddCase && typeof validateConditionRequirements === "function") {
			const validationError = validateConditionRequirements(caseCondition, caseV1, caseV2, caseV3);
			if (validationError) {
				sendUiError(player, validationError);
				return;
			}
		}

		let keptCases = [];
		for (let i = 0; i < cases.length; i++) {
			const shouldDelete = Boolean(formValues[cursor.value++]);
			if (!shouldDelete) keptCases.push(cases[i]);
		}

		if (shouldAddCase) {
			keptCases.push({
				condition: caseCondition,
				conditionValue1: caseV1, conditionValue2: caseV2, conditionValue3: caseV3,
				runOutput: caseRunOutputIndex > 0 ? runOutputOptions[caseRunOutputIndex] : "",
				runCommand: caseRunCommand
			});
		}

		const outputResult = parseOutputResponse(formValues, cursor, {
			outputTypes: LOGIC_CASE_OUTPUT_TYPES, namedTargetEntries, allInputs, blockOutputs
		});
		if (outputResult.error) { sendUiError(player, outputResult.error); return; }

		blockEntry.data = {
			...blockEntry.data,
			name, startDisabled,
			cases: keptCases,
			outputs: outputResult.outputs
		};

		if (onSave) onSave(blockEntry);
		sendUiSaved(player, "Logic Case", name);
	});
}