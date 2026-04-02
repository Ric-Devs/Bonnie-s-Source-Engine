import { ModalFormData } from "@minecraft/server-ui";
import { addDecorativeSection } from "./ui_formatting.js";
import { buildOutputSection, buildExistingOutputsSection, buildInputsSection, parseOutputResponse } from "./shared_output_ui.js";

export const LOGIC_RANDOM_OUTPUT_TYPES = [
	"onRandom1", "onRandom2", "onRandom3", "onRandom4", "onRandom5",
	"onRandom6", "onRandom7", "onRandom8", "onRandom9", "onRandom10"
];

export function logicRandomOutputsUI(player, blockEntry, options) {
	const { onSave, getNamedTargetEntries, getBlocksTargetingCurrent, allInputs } = options;
	if (!blockEntry.data) blockEntry.data = {};
	if (!Array.isArray(blockEntry.data.outputs)) blockEntry.data.outputs = [];
	if (!Array.isArray(blockEntry.data.randomSlots)) blockEntry.data.randomSlots = [];

	while (blockEntry.data.randomSlots.length < 10) {
		blockEntry.data.randomSlots.push({ runOutput: "", runCommand: "" });
	}

	const blockOutputs = [...blockEntry.data.outputs];
	const randomSlots = blockEntry.data.randomSlots;
	const namedTargetEntries = (typeof getNamedTargetEntries === "function" ? getNamedTargetEntries() : []).filter(e => e?.name);
	const outputNames = blockOutputs.map(o => o.name).filter(n => n);
	const runOutputOptions = ["(None)", ...outputNames];

	const form = new ModalFormData();
	form.title("Logic Random Outputs");

	addDecorativeSection(form, "Class Info");
	const blockName = blockEntry.data?.name || `logic_random_${Math.round(Math.random() * 10000)}`;
	form.textField("Name", "name", { defaultValue: blockName });
	form.toggle("Start disabled", { defaultValue: Boolean(blockEntry.data?.startDisabled) });
	form.textField("Random Chance Range (1-10)", "2", { defaultValue: `${blockEntry.data?.randomChanceRange || "2"}` });
	form.textField("Randomness Interval in ticks", "20", { defaultValue: `${blockEntry.data?.randomnessInterval || "20"}` });
	form.toggle("Run once?", { defaultValue: Boolean(blockEntry.data?.runOnce) });
	form.toggle("Run on input?", { defaultValue: Boolean(blockEntry.data?.runOnInput) });
	form.toggle("Rerun selection?", { defaultValue: Boolean(blockEntry.data?.rerunSelection) });

	addDecorativeSection(form, "Random Chance Slots");
	for (let i = 0; i < 10; i++) {
		const slot = randomSlots[i] || {};
		form.dropdown(`On Random ${i + 1} fire output`, runOutputOptions, {
			defaultValueIndex: Math.max(0, runOutputOptions.indexOf(slot.runOutput || "(None)"))
		});
		form.textField(`On Random ${i + 1} fire command`, "Command (optional)", {
			defaultValue: slot.runCommand || ""
		});
	}

	buildOutputSection(form, { outputTypes: LOGIC_RANDOM_OUTPUT_TYPES, namedTargetEntries, allInputs });
	buildExistingOutputsSection(form, blockOutputs);
	buildInputsSection(form, blockEntry.data?.name, getBlocksTargetingCurrent);

	form.submitButton("Save");

	form.show(player).then((response) => {
		if (response.canceled) return;
		const formValues = (response.formValues ?? []).filter(v => v !== undefined && v !== null);
		let cursor = { value: 0 };

		const name = `${formValues[cursor.value++] ?? blockName}`;
		const startDisabled = Boolean(formValues[cursor.value++]);
		const randomChanceRange = `${formValues[cursor.value++] ?? "2"}`.trim();
		const randomnessInterval = `${formValues[cursor.value++] ?? "20"}`.trim();
		const runOnce = Boolean(formValues[cursor.value++]);
		const runOnInput = Boolean(formValues[cursor.value++]);
		const rerunSelection = Boolean(formValues[cursor.value++]);

		const range = parseInt(randomChanceRange) || 2;
		if (range < 1 || range > 10) {
			player.sendMessage("§cRandom Chance Range must be between 1 and 10.");
			return;
		}

		if (runOnce && parseInt(randomnessInterval) > 0 && !runOnInput) {
			player.sendMessage("§cRun once and Randomness Interval are mutually exclusive when Run on input is off.");
			return;
		}

		const newRandomSlots = [];
		for (let i = 0; i < 10; i++) {
			const slotOutputIndex = Number(formValues[cursor.value++]);
			const slotCommand = `${formValues[cursor.value++] ?? ""}`.trim();
			newRandomSlots.push({
				runOutput: slotOutputIndex > 0 ? runOutputOptions[slotOutputIndex] : "",
				runCommand: slotCommand
			});
		}

		const outputResult = parseOutputResponse(formValues, cursor, {
			outputTypes: LOGIC_RANDOM_OUTPUT_TYPES, namedTargetEntries, allInputs, blockOutputs
		});
		if (outputResult.error) { player.sendMessage(`§c${outputResult.error}`); return; }

		blockEntry.data = {
			...blockEntry.data,
			name, startDisabled,
			randomChanceRange, randomnessInterval,
			runOnce, runOnInput, rerunSelection,
			randomSlots: newRandomSlots,
			outputs: outputResult.outputs
		};

		if (onSave) onSave(blockEntry);
		player.sendMessage(`§aLogic Random Outputs "${name}" saved!`);
	});
}
