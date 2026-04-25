import { validateConditionRequirements } from "../handler/core/condition_executer.js";
import { conditionTools } from "./conditions_tools.js";
import { outputClassInfoTargets } from "./output_ci_targets.js";
import { triggerToolUI as showTriggerToolUI } from "./tool/tool_trigger.js";
import { areaPortalToolUI } from "./tool/tool_areaportal.js";
import { infoPlayerspawnUI } from "./info/info_playerspawn.js";
import { infoTargetAreaportalUI } from "./info/info_target_areaportal.js";
import { gameNametagUI } from "./game/game_nametag.js";
import { toolInvisibleUI } from "./tool/tool_invisible.js";
import { toolPlayerclipUI } from "./tool/tool_playerclip.js";
import { toolNpcclipUI } from "./tool/tool_npcclip.js";
import { logicAutoUI } from "./logic/logic_auto.js";
import { logicBranchUI } from "./logic/logic_branch.js";
import { logicCaseUI } from "./logic/logic_case.js";
import { logicCompareUI } from "./logic/logic_compare.js";
import { logicCoopManagerUI } from "./logic/logic_coop_manager.js";
import { logicRandomOutputsUI } from "./logic/logic_random_outputs.js";
import { logicTimerUI } from "./logic/logic_timer.js";

// SECTION: Block UI Dispatch
export function openToolUIForBlock(player, blockEntry, options = {}) {
    if (!player || !blockEntry?.typeId) return;

    const {
        onSave,
        getNamedTargets,
        getNamedTargetEntries,
        getBlocksTargetingCurrent,
        triggerOutputTypes = ["onTrue", "onFalse"],
        triggerInputs = outputClassInfoTargets,
        allInputs = outputClassInfoTargets
    } = options;

    if (blockEntry.typeId === "brr:tool_trigger") {
        showTriggerToolUI(player, blockEntry, {
            onSave,
            conditionTools,
            validateConditionRequirements,
            getNamedTargets,
            getNamedTargetEntries,
            getBlocksTargetingCurrent,
            outputTypes: triggerOutputTypes,
            inputs: triggerInputs
        });
        return;
    }

    const blockToolUIs = {
        "brr:tool_areaportal": areaPortalToolUI,
        "brr:info_playerspawn_block": infoPlayerspawnUI,
        "brr:info_target_areaportal_block": infoTargetAreaportalUI,
        "brr:game_nametag_block": gameNametagUI,
        "brr:tool_invisible": toolInvisibleUI,
        "brr:tool_playerclip": toolPlayerclipUI,
        "brr:tool_npcclip": toolNpcclipUI
    };

    const toolUI = blockToolUIs[blockEntry.typeId];
    if (typeof toolUI === "function") {
        toolUI(player, blockEntry, onSave);
        return;
    }

    const logicBlockUIs = {
        "brr:logic_auto_block": logicAutoUI,
        "brr:logic_branch_block": logicBranchUI,
        "brr:logic_case_block": logicCaseUI,
        "brr:logic_compare_block": logicCompareUI,
        "brr:logic_coop_manager_block": logicCoopManagerUI,
        "brr:logic_random_outputs_block": logicRandomOutputsUI,
        "brr:logic_timer_block": logicTimerUI
    };

    const logicUI = logicBlockUIs[blockEntry.typeId];
    if (typeof logicUI === "function") {
        logicUI(player, blockEntry, {
            onSave,
            conditionTools,
            validateConditionRequirements,
            getNamedTargetEntries,
            getBlocksTargetingCurrent,
            allInputs
        });
    }
}