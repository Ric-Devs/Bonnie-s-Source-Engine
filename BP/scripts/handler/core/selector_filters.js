function getSelectorFilterValues(filters, key) {
    const raw = filters?.[key];
    if (Array.isArray(raw)) return raw.filter(value => `${value ?? ""}`.trim().length > 0);
    if (typeof raw === "string" && raw.trim().length > 0) return [raw.trim()];
    return [];
}

export function parseSelectorFilters(selector) {
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

export function applyEntityFilters(entities, filters, getPlayerGameMode) {
    if (!filters || !entities?.length) return entities ?? [];

    let results = entities;

    const typeFilters = getSelectorFilterValues(filters, "type");
    for (const rawType of typeFilters) {
        const trimmed = rawType.trim().toLowerCase();
        if (!trimmed) continue;

        const isNegated = trimmed.startsWith("!");
        const expectedType = isNegated ? trimmed.slice(1) : trimmed;
        if (!expectedType) continue;

        results = results.filter(entity => {
            const actualType = `${entity.typeId ?? ""}`.trim().toLowerCase();
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

        results = results.filter(entity => {
            const tag = `${entity.nameTag ?? ""}`.trim().toLowerCase();
            const playerName = `${entity.name ?? ""}`.trim().toLowerCase();
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

        results = results.filter(entity => {
            let hasTag = false;
            try {
                hasTag = entity.hasTag(tagName);
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

        results = results.filter(entity => {
            if (`${entity?.typeId ?? ""}` !== "minecraft:player") {
                return false;
            }

            const actualGamemode = getPlayerGameMode(entity);
            if (!actualGamemode) return false;

            const matches = actualGamemode === expectedGamemode;
            return isNegated ? !matches : matches;
        });
    }

    return results;
}
