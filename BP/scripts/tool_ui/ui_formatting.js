
// SECTION: UI Decorative Helpers
export function addDecorativeSection(form, title) {
    form.divider();
    form.header(title);
    form.divider();
}

// SECTION: UI List Helpers
export function addReadOnlyListSection(form, title, lines, emptyMessage) {
    addDecorativeSection(form, title);
    if (!Array.isArray(lines) || lines.length === 0) {
        form.label(emptyMessage || "None");
        return;
    }
    form.label(lines.join("\n"));
}

// SECTION: UI Feedback Helpers
export function sendUiError(player, message) {
    const text = `${message ?? "An unknown error occurred."}`.trim() || "An unknown error occurred.";
    player?.sendMessage(`§c${text}`);
}

export function sendUiSaved(player, toolName, savedName) {
    const label = `${toolName ?? "Block"}`.trim() || "Block";
    const entryName = `${savedName ?? ""}`.trim();
    player?.sendMessage(entryName ? `§a${label} "${entryName}" saved.` : `§a${label} saved.`);
}