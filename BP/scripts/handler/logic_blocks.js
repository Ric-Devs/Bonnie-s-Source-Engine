import { world } from "@minecraft/server";
import { evaluateCondition } from "./core/condition_executer.js";
import { fireOutputsForEvent, fireNamedOutput } from "../tool_ui/tool/tool_trigger.js";

// SECTION: Runtime State
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

// SECTION: Shared Helpers
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

function normalizeLiteralSelector(rawSelector) {
	const raw = `${rawSelector ?? ""}`.trim();
	const quoted = raw.match(/^(["'])(.*)\1$/);
	return `${quoted ? quoted[2] : raw}`.trim().toLowerCase();
}

function parseSelectorFilters(selector) {
	const trimmed = `${selector ?? ""}`.trim();
	const match = trimmed.match(/^@[pares](?:\[(.*)\])?$/i);
	if (!match) return null;

	const entriesRaw = `${match[1] ?? ""}`.trim();
	if (!entriesRaw) return {};

	const filters = {};
	for (const entry of entriesRaw.split(",")) {
		const [rawKey, ...rawValueParts] = entry.split("=");
		const key = `${rawKey ?? ""}`.trim().toLowerCase();
		const value = rawValueParts.join("=").trim();
		if (!key || !value) continue;
		if (!Array.isArray(filters[key])) filters[key] = [];
		filters[key].push(value);
	}

	return filters;
}

function getSelectorFilterValues(filters, key) {
	const raw = filters?.[key];
	if (Array.isArray(raw)) return raw.filter(value => `${value ?? ""}`.trim().length > 0);
	if (typeof raw === "string" && raw.trim().length > 0) return [raw.trim()];
	return [];
}

function getPlayerGameModeQuick(player) {
	if (!player) return "";

	if (typeof player.getGameMode === "function") {
		try {
			return `${player.getGameMode()}`.trim().toLowerCase();
		} catch { }
	}

	return "";
}

function applyPlayerSelectorFilters(players, filters) {
	if (!filters || !players?.length) return players ?? [];

	let results = players;

	const typeFilters = getSelectorFilterValues(filters, "type");
	for (const rawType of typeFilters) {
		const trimmed = rawType.trim().toLowerCase();
		if (!trimmed) continue;

		const isNegated = trimmed.startsWith("!");
		const expectedType = isNegated ? trimmed.slice(1) : trimmed;
		if (!expectedType) continue;

		results = results.filter(player => {
			const actualType = `${player?.typeId ?? "minecraft:player"}`.trim().toLowerCase();
			const matches = actualType === expectedType;
			return isNegated ? !matches : matches;
		});
	}

	const nameFilters = getSelectorFilterValues(filters, "name");
	for (const rawName of nameFilters) {
		const trimmed = rawName.trim().toLowerCase();
		if (!trimmed) continue;

		const isNegated = trimmed.startsWith("!");
		const expectedName = isNegated ? trimmed.slice(1) : trimmed;
		if (!expectedName) continue;

		results = results.filter(player => {
			const tag = normalizeLiteralSelector(player?.nameTag);
			const playerName = normalizeLiteralSelector(player?.name);
			const matches = tag === expectedName || playerName === expectedName;
			return isNegated ? !matches : matches;
		});
	}

	const tagFilters = getSelectorFilterValues(filters, "tag");
	for (const rawTag of tagFilters) {
		const trimmed = rawTag.trim();
		if (!trimmed) continue;

		const isNegated = trimmed.startsWith("!");
		const tagName = isNegated ? trimmed.slice(1) : trimmed;
		if (!tagName) continue;

		results = results.filter(player => {
			let hasTag = false;
			try {
				hasTag = player.hasTag(tagName);
			} catch { }

			return isNegated ? !hasTag : hasTag;
		});
	}

	const gamemodeFilters = [
		...getSelectorFilterValues(filters, "gamemode"),
		...getSelectorFilterValues(filters, "m")
	];

	for (const rawGamemode of gamemodeFilters) {
		const trimmed = rawGamemode.trim().toLowerCase();
		if (!trimmed) continue;

		const isNegated = trimmed.startsWith("!");
		const expectedGamemode = isNegated ? trimmed.slice(1) : trimmed;
		if (!expectedGamemode) continue;

		results = results.filter(player => {
			const actualGamemode = getPlayerGameModeQuick(player);
			if (!actualGamemode) return false;

			const matches = actualGamemode === expectedGamemode;
			return isNegated ? !matches : matches;
		});
	}

	return results;
}

function resolvePlayersByCoopSelector(block, selectorRaw, allPlayers) {
	const selector = `${selectorRaw ?? ""}`.trim();
	if (!selector) return [];

	const normalized = selector.toLowerCase();
	let players = getDimensionPlayers(block, allPlayers);

	if (normalized.startsWith("@")) {
		const base = normalized.slice(0, 2);
		const filters = parseSelectorFilters(selector);
		players = applyPlayerSelectorFilters(players, filters);

		if (base === "@a" || base === "@e") return players;

		if (base === "@p") {
			if (players.length === 0) return [];
			const centerX = block.x + 0.5;
			const centerY = block.y + 0.5;
			const centerZ = block.z + 0.5;

			players.sort((a, b) => {
				const adx = a.location.x - centerX;
				const ady = a.location.y - centerY;
				const adz = a.location.z - centerZ;
				const bdx = b.location.x - centerX;
				const bdy = b.location.y - centerY;
				const bdz = b.location.z - centerZ;
				return (adx * adx + ady * ady + adz * adz) - (bdx * bdx + bdy * bdy + bdz * bdz);
			});

			return [players[0]];
		}

		if (base === "@r") {
			if (players.length === 0) return [];
			const randomIndex = Math.floor(Math.random() * players.length);
			return [players[randomIndex]];
		}

		return [];
	}

	const literal = normalizeLiteralSelector(selector);
	if (literal === "minecraft:player") return players;

	return players.filter(player => {
		const playerName = normalizeLiteralSelector(player?.name);
		const playerTag = normalizeLiteralSelector(player?.nameTag);
		return playerName === literal || playerTag === literal;
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

// SECTION: logic_auto
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

// SECTION: logic_branch
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

// SECTION: logic_case
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

// SECTION: logic_compare
function tickLogicCompare(block, outputOptions) {
	const key = blockKey(block);
	const comparisons = Array.isArray(block.data.comparisons) ? block.data.comparisons : [];
	if (comparisons.length === 0) return;

	if (!compareStates.has(key)) {
		// SECTION: logic_coop_manager
	}
	const state = compareStates.get(key);
	while (state.lastResults.length < comparisons.length) state.lastResults.push(null);

	for (let i = 0; i < comparisons.length; i++) {
		// SECTION: logic_random_outputs
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

	const selectorA = `${block.data.playerASelector ?? ""}`.trim();
	const selectorB = `${block.data.playerBSelector ?? ""}`.trim();

	const stateA = selectorA
		? resolvePlayersByCoopSelector(block, selectorA, allPlayers).length > 0
		: toBool(block.data.playerAState);
	const stateB = selectorB
		? resolvePlayersByCoopSelector(block, selectorB, allPlayers).length > 0
		: toBool(block.data.playerBState);

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

// SECTION: logic_timer
function tickLogicTimer(block, outputOptions) {
	const key = blockKey(block);
	const timerDelay = Math.max(1, parseInt(block.data.timer) || 20);

	if (!timerStates.has(key)) {
		// SECTION: Public Tick Entry
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