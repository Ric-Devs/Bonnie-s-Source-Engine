import { ModalFormData } from "@minecraft/server-ui";
import { addDecorativeSection } from "./ui_formatting.js";
import { buildOutputSection, buildExistingOutputsSection, buildInputsSection, parseOutputResponse } from "./shared_output_ui.js";

export const LOGIC_AUTO_OUTPUT_TYPES = ["onAutoFire"];

export function logicAutoUI(player, blockEntry, options) {
	const { onSave, getNamedTargetEntries, getBlocksTargetingCurrent, allInputs } = options;
	if (!blockEntry.data) blockEntry.data = {};
	if (!Array.isArray(blockEntry.data.outputs)) blockEntry.data.outputs = [];
	if (!Array.isArray(blockEntry.data.automations)) blockEntry.data.automations = [];

	const blockOutputs = [...blockEntry.data.outputs];
	const automations = [...blockEntry.data.automations];
	const namedTargetEntries = (typeof getNamedTargetEntries === "function" ? getNamedTargetEntries() : []).filter(e => e?.name);
	const outputNames = blockOutputs.map(o => o.name).filter(n => n);
	const runOutputOptions = ["(None)", ...outputNames];

	const form = new ModalFormData();
	form.title("Logic Auto");

	addDecorativeSection(form, "Class Info");
	const blockName = blockEntry.data?.name || `logic_auto_${Math.round(Math.random() * 10000)}`;
	form.textField("Name", "name", { defaultValue: blockName });
	form.toggle("Start disabled", { defaultValue: Boolean(blockEntry.data?.startDisabled) });

	addDecorativeSection(form, "Automations");
	form.toggle("Add this automation?", { defaultValue: false });
	form.dropdown("Run output", runOutputOptions, { defaultValueIndex: 0 });
	form.textField("Run command", "Command to execute (optional)", { defaultValue: "" });
	form.toggle("On world load", { defaultValue: true });
	form.toggle("Run once?", { defaultValue: false });
	form.toggle("Run periodically?", { defaultValue: false });
	form.textField("Tick delay", "20", { defaultValue: "20" });

	addDecorativeSection(form, "Existing Automations");
	if (automations.length === 0) {
		form.label("No automations exist.");
	} else {
		for (let i = 0; i < automations.length; i++) {
			const auto = automations[i];
			form.label(`Run output: ${auto.runOutput || "(none)"}`);
			form.label(`Run command: ${auto.runCommand || "(none)"}`);
			form.label(`On world load: ${auto.onWorldLoad ?? false}`);
			form.label(`Run once: ${auto.runOnce ?? false}`);
			form.label(`Run periodically: ${auto.runPeriodically ?? false}`);
			form.label(`Tick delay: ${auto.tickDelay ?? 20}`);
			form.toggle(`Delete automation ${i + 1}`, { defaultValue: false });
			form.divider();
		}
	}

	buildOutputSection(form, { outputTypes: LOGIC_AUTO_OUTPUT_TYPES, namedTargetEntries, allInputs });
	buildExistingOutputsSection(form, blockOutputs);
	buildInputsSection(form, blockEntry.data?.name, getBlocksTargetingCurrent);

	form.submitButton("Save");

	form.show(player).then((response) => {
		if (response.canceled) return;
		const formValues = (response.formValues ?? []).filter(v => v !== undefined && v !== null);
		let cursor = { value: 0 };

		const name = `${formValues[cursor.value++] ?? blockName}`;
		const startDisabled = Boolean(formValues[cursor.value++]);

		const shouldAddAutomation = Boolean(formValues[cursor.value++]);
		const autoRunOutputIndex = Number(formValues[cursor.value++]);
		const autoRunCommand = `${formValues[cursor.value++] ?? ""}`.trim();
		const autoOnWorldLoad = Boolean(formValues[cursor.value++]);
		const autoRunOnce = Boolean(formValues[cursor.value++]);
		const autoRunPeriodically = Boolean(formValues[cursor.value++]);
		const autoTickDelay = `${formValues[cursor.value++] ?? "20"}`.trim();

		if (shouldAddAutomation && autoRunOnce && autoRunPeriodically) {
			player.sendMessage("§cRun once and Run periodically are mutually exclusive.");
			return;
		}

		if (shouldAddAutomation && automations.length >= 16) {
			player.sendMessage("§cMaximum of 16 automations per block.");
			return;
		}

		let keptAutomations = [];
		for (let i = 0; i < automations.length; i++) {
			const shouldDelete = Boolean(formValues[cursor.value++]);
			if (!shouldDelete) keptAutomations.push(automations[i]);
		}

		if (shouldAddAutomation) {
			keptAutomations.push({
				runOutput: autoRunOutputIndex > 0 ? runOutputOptions[autoRunOutputIndex] : "",
				runCommand: autoRunCommand,
				onWorldLoad: autoOnWorldLoad,
				runOnce: autoRunOnce,
				runPeriodically: autoRunPeriodically,
				tickDelay: autoTickDelay
			});
		}

		const outputResult = parseOutputResponse(formValues, cursor, {
			outputTypes: LOGIC_AUTO_OUTPUT_TYPES, namedTargetEntries, allInputs, blockOutputs
		});

		if (outputResult.error) {
			player.sendMessage(`§c${outputResult.error}`);
			return;
		}

		blockEntry.data = {
			...blockEntry.data,
			name, startDisabled,
			automations: keptAutomations,
			outputs: outputResult.outputs
		};

		if (onSave) onSave(blockEntry);
		player.sendMessage(`§aLogic Auto "${name}" saved!`);
	});
}
