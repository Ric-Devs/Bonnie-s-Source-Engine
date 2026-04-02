import { world } from "@minecraft/server";
import { evaluateCondition } from "./condition_executer.js";
import { fireOutputsForEvent, fireNamedOutput } from "../tool_ui/tool_trigger.js";

// Runtime state maps (not persisted, in-memory only)
const autoStates = new Map();
const branchStates = new Map();
const caseStates = new Map();
const compareStates = new Map();
const coopStates = new Map();
const randomStates = new Map();
const timerStates = new Map();

let worldLoadProcessed = false;
let tickCounter = 0;

function blockKey(block) {
	return `${block.x}_${block.y}_${block.z}_${block.dimension}`;
}

function toBool(val) {
	if (typeof val === "boolean") return val;
	const s = `${val ?? ""}`.trim().toLowerCase();
	return s === "true" || s === "1" || s === "yes" || s === "on";
}

function isBlockedCommand(command) {
	const normalized = `${command ?? ""}`.trim().replace(/^\/+/, "").trim().toLowerCase();
	return normalized === "op" || normalized.startsWith("op ")
		|| normalized === "minecraft:op" || normalized.startsWith("minecraft:op ")
		|| normalized === "deop" || normalized.startsWith("deop ")
		|| normalized === "minecraft:deop" || normalized.startsWith("minecraft:deop ");
}

function runBlockCommand(block, command) {
	if (!command || isBlockedCommand(command)) return;
	try { world.getDimension(block.dimension).runCommand(command); } catch { }
}

function getDimensionPlayers(block, allPlayers) {
	return allPlayers.filter(p => {
		try { return p.dimension.id === block.dimension; } catch { return false; }
	});
}

function evaluateConditionForBlock(conditionData, block, allPlayers) {
	const condition = conditionData.executeCondition || "noCondition";
	if (condition === "noCondition") return true;

	const dimPlayers = getDimensionPlayers(block, allPlayers);
	if (dimPlayers.length === 0) return false;

	if (condition.startsWith("ifPlayer")) {
		for (const player of dimPlayers) {
			if (evaluateCondition(conditionData, player, world)) return true;
		}
		return false;
	}

	return evaluateCondition(conditionData, dimPlayers[0], world);
}

// ── logic_auto ──
function tickLogicAuto(block, outputOptions) {
	const key = blockKey(block);
	const automations = Array.isArray(block.data.automations) ? block.data.automations : [];
	if (automations.length === 0) return;

	if (!autoStates.has(key)) {
		autoStates.set(key, { entries: [] });
	}
	const state = autoStates.get(key);
	while (state.entries.length < automations.length) {
		state.entries.push({ hasFired: false, lastFireTick: 0 });
	}

	for (let i = 0; i < automations.length; i++) {
		const auto = automations[i];
		const entry = state.entries[i];

		if (auto.runOnce && entry.hasFired) continue;

		let shouldFire = false;

		if (auto.onWorldLoad && !worldLoadProcessed && !entry.hasFired) {
			shouldFire = true;
		}

		if (auto.runPeriodically) {
			const delay = Math.max(1, parseInt(auto.tickDelay) || 20);
			if (tickCounter - entry.lastFireTick >= delay) {
				shouldFire = true;
			}
		}

		if (shouldFire) {
			runBlockCommand(block, auto.runCommand);
			if (auto.runOutput) fireNamedOutput(block, auto.runOutput, outputOptions);
			fireOutputsForEvent(block, "onAutoFire", outputOptions);
			entry.hasFired = true;
			entry.lastFireTick = tickCounter;
		}
	}
}

// ── logic_branch ──
function tickLogicBranch(block, allPlayers, outputOptions) {
	const key = blockKey(block);

	if (!branchStates.has(key)) {
		branchStates.set(key, { lastResult: null, lastFireTick: 0 });
	}
	const state = branchStates.get(key);

	const conditionData = {
		executeCondition: block.data.executeCondition || "noCondition",
		conditionValue1: block.data.conditionValue1 || "",
		conditionValue2: block.data.conditionValue2 || "",
		conditionValue3: block.data.conditionValue3 || ""
	};

	const result = evaluateConditionForBlock(conditionData, block, allPlayers);
	const changed = result !== state.lastResult;
	state.lastResult = result;

	let shouldFire = false;

	if (changed) {
		shouldFire = true;
	} else if (!block.data.runOnce) {
		const interval = Math.max(1, parseInt(block.data.runInterval) || 0);
		if (interval > 0 && tickCounter - state.lastFireTick >= interval) {
			shouldFire = true;
		}
	}

	if (block.data.runOnce && state.lastFireTick > 0) shouldFire = false;

	if (shouldFire) {
		state.lastFireTick = tickCounter;

		if (result) {
			runBlockCommand(block, block.data.ifTrueRunCommand);
			if (block.data.ifTrueRunOutput) fireNamedOutput(block, block.data.ifTrueRunOutput, outputOptions);
			fireOutputsForEvent(block, "onTrue", outputOptions);
		} else {
			runBlockCommand(block, block.data.ifFalseRunCommand);
			if (block.data.ifFalseRunOutput) fireNamedOutput(block, block.data.ifFalseRunOutput, outputOptions);
			fireOutputsForEvent(block, "onFalse", outputOptions);
		}
	}
}

// ── logic_case ──
function tickLogicCase(block, allPlayers, outputOptions) {
	const key = blockKey(block);
	const cases = Array.isArray(block.data.cases) ? block.data.cases : [];
	if (cases.length === 0) return;

	if (!caseStates.has(key)) {
		caseStates.set(key, { lastMatched: -1 });
	}
	const state = caseStates.get(key);

	let matchedIndex = -1;

	for (let i = 0; i < cases.length; i++) {
		const c = cases[i];
		const conditionData = {
			executeCondition: c.condition || "noCondition",
			conditionValue1: c.conditionValue1 || "",
			conditionValue2: c.conditionValue2 || "",
			conditionValue3: c.conditionValue3 || ""
		};

		if (evaluateConditionForBlock(conditionData, block, allPlayers)) {
			matchedIndex = i;
			break;
		}
	}

	if (matchedIndex !== state.lastMatched) {
		state.lastMatched = matchedIndex;

		if (matchedIndex >= 0) {
			const matched = cases[matchedIndex];
			runBlockCommand(block, matched.runCommand);
			if (matched.runOutput) fireNamedOutput(block, matched.runOutput, outputOptions);
			fireOutputsForEvent(block, `onCase${matchedIndex + 1}`, outputOptions);
		}
	}
}

// ── logic_compare ──
function tickLogicCompare(block, outputOptions) {
	const key = blockKey(block);
	const comparisons = Array.isArray(block.data.comparisons) ? block.data.comparisons : [];
	if (comparisons.length === 0) return;

	if (!compareStates.has(key)) {
		compareStates.set(key, { lastResults: comparisons.map(() => null) });
	}
	const state = compareStates.get(key);
	while (state.lastResults.length < comparisons.length) state.lastResults.push(null);

	for (let i = 0; i < comparisons.length; i++) {
		const comp = comparisons[i];
		const objective = comp.objective || "";
		const entity = comp.entity || "";
		const initialValue = parseInt(comp.initialValue) || 0;
		const comparingFor = comp.comparingFor || "";

		let currentScore = undefined;
		try {
			const obj = world.scoreboard.getObjective(objective);
			if (obj) {
				for (const participant of obj.getParticipants()) {
					if (`${participant.displayName ?? ""}`.trim() === entity) {
						currentScore = obj.getScore(participant);
						break;
					}
				}
			}
		} catch { }

		let matched = false;
		if (currentScore !== undefined && Number.isFinite(currentScore)) {
			switch (comparingFor) {
				case "OnLessThan": matched = currentScore < initialValue; break;
				case "OnEqualTo": matched = currentScore === initialValue; break;
				case "OnNotEqualTo": matched = currentScore !== initialValue; break;
				case "OnGreaterThan": matched = currentScore > initialValue; break;
			}
		}

		if (matched !== state.lastResults[i]) {
			state.lastResults[i] = matched;
			if (matched) {
				runBlockCommand(block, comp.runCommand);
				if (comp.runOutput) fireNamedOutput(block, comp.runOutput, outputOptions);
				fireOutputsForEvent(block, comparingFor, outputOptions);
			}
		}
	}
}

// ── logic_coop_manager ──
function tickLogicCoopManager(block, allPlayers, outputOptions, saveBlock) {
	const key = blockKey(block);

	let inputProcessed = false;
	if (toBool(block.data.coopSetStateATrue)) { block.data.playerAState = true; block.data.coopSetStateATrue = false; inputProcessed = true; }
	if (toBool(block.data.coopSetStateAFalse)) { block.data.playerAState = false; block.data.coopSetStateAFalse = false; inputProcessed = true; }
	if (toBool(block.data.coopToggleStateA)) { block.data.playerAState = !toBool(block.data.playerAState); block.data.coopToggleStateA = false; inputProcessed = true; }
	if (toBool(block.data.coopSetStateBTrue)) { block.data.playerBState = true; block.data.coopSetStateBTrue = false; inputProcessed = true; }
	if (toBool(block.data.coopSetStateBFalse)) { block.data.playerBState = false; block.data.coopSetStateBFalse = false; inputProcessed = true; }
	if (toBool(block.data.coopToggleStateB)) { block.data.playerBState = !toBool(block.data.playerBState); block.data.coopToggleStateB = false; inputProcessed = true; }

	if (inputProcessed && typeof saveBlock === "function") {
		saveBlock(block);
	}

	const stateA = toBool(block.data.playerAState);
	const stateB = toBool(block.data.playerBState);

	if (!coopStates.has(key)) {
		coopStates.set(key, { lastA: null, lastB: null });
	}
	const state = coopStates.get(key);

	const prevA = state.lastA;
	const prevB = state.lastB;

	if (stateA === prevA && stateB === prevB) return;

	const prevAllTrue = prevA === true && prevB === true;
	const prevAnyTrue = prevA === true || prevB === true;
	const prevAllFalse = prevA === false && prevB === false;
	const prevAnyFalse = prevA === false || prevB === false;

	const nowAllTrue = stateA && stateB;
	const nowAnyTrue = stateA || stateB;
	const nowAllFalse = !stateA && !stateB;
	const nowAnyFalse = !stateA || !stateB;

	if (nowAllTrue && !prevAllTrue) fireOutputsForEvent(block, "OnChangeToAllTrue", outputOptions);
	if (nowAnyTrue && !prevAnyTrue) fireOutputsForEvent(block, "OnChangeToAnyTrue", outputOptions);
	if (nowAllFalse && !prevAllFalse) fireOutputsForEvent(block, "OnChangeToAllFalse", outputOptions);
	if (nowAnyFalse && !prevAnyFalse) fireOutputsForEvent(block, "OnChangeToAnyFalse", outputOptions);

	state.lastA = stateA;
	state.lastB = stateB;
}

// ── logic_random_outputs ──
function tickLogicRandomOutputs(block, outputOptions, saveBlock) {
	const key = blockKey(block);

	const range = Math.max(1, Math.min(10, parseInt(block.data.randomChanceRange) || 2));
	const interval = Math.max(1, parseInt(block.data.randomnessInterval) || 20);
	const runOnce = toBool(block.data.runOnce);
	const runOnInput = toBool(block.data.runOnInput);
	const rerunSelection = toBool(block.data.rerunSelection);

	if (!randomStates.has(key)) {
		randomStates.set(key, { lastFireTick: 0, hasFired: false, lastRandom: -1 });
	}
	const state = randomStates.get(key);

	let triggerFromInput = false;
	if (toBool(block.data.randomChanceTrigger)) {
		triggerFromInput = true;
		block.data.randomChanceTrigger = false;
		if (typeof saveBlock === "function") saveBlock(block);
	}

	let shouldFire = false;

	if (runOnInput) {
		if (triggerFromInput) shouldFire = true;
	} else if (runOnce) {
		if (!state.hasFired) shouldFire = true;
	} else {
		if (tickCounter - state.lastFireTick >= interval) shouldFire = true;
	}

	if (runOnce && state.hasFired && !triggerFromInput) shouldFire = false;

	if (!shouldFire) return;

	let randomValue = Math.floor(Math.random() * range) + 1;

	if (rerunSelection) {
		let attempts = 0;
		while (randomValue === state.lastRandom && attempts < 20) {
			randomValue = Math.floor(Math.random() * range) + 1;
			attempts++;
		}
	}

	state.lastRandom = randomValue;
	state.lastFireTick = tickCounter;
	state.hasFired = true;

	const slots = Array.isArray(block.data.randomSlots) ? block.data.randomSlots : [];
	const slot = slots[randomValue - 1];
	if (slot) {
		runBlockCommand(block, slot.runCommand);
		if (slot.runOutput) fireNamedOutput(block, slot.runOutput, outputOptions);
	}
	fireOutputsForEvent(block, `onRandom${randomValue}`, outputOptions);
}

// ── logic_timer ──
function tickLogicTimer(block, outputOptions) {
	const key = blockKey(block);
	const timerDelay = Math.max(1, parseInt(block.data.timer) || 20);

	if (!timerStates.has(key)) {
		timerStates.set(key, { lastFireTick: tickCounter });
	}
	const state = timerStates.get(key);

	if (tickCounter - state.lastFireTick >= timerDelay) {
		state.lastFireTick = tickCounter;

		runBlockCommand(block, block.data.runCommand);
		if (block.data.runOutput) fireNamedOutput(block, block.data.runOutput, outputOptions);
		fireOutputsForEvent(block, "onTimerFired", outputOptions);
	}
}

// Main tick function called from main.js
export function tickLogicBlocks(blocks, outputOptions, saveBlock) {
	tickCounter++;
	const allPlayers = world.getPlayers();

	for (const block of blocks) {
		if (!block.data || block.data.startDisabled) continue;

		switch (block.typeId) {
			case "brr:logic_auto_block": tickLogicAuto(block, outputOptions); break;
			case "brr:logic_branch_block": tickLogicBranch(block, allPlayers, outputOptions); break;
			case "brr:logic_case_block": tickLogicCase(block, allPlayers, outputOptions); break;
			case "brr:logic_compare_block": tickLogicCompare(block, outputOptions); break;
			case "brr:logic_coop_manager_block": tickLogicCoopManager(block, allPlayers, outputOptions, saveBlock); break;
			case "brr:logic_random_outputs_block": tickLogicRandomOutputs(block, outputOptions, saveBlock); break;
			case "brr:logic_timer_block": tickLogicTimer(block, outputOptions); break;
		}
	}

	if (!worldLoadProcessed) worldLoadProcessed = true;
}
