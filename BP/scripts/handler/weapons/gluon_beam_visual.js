// SECTION: Vector Math Helpers
function lengthOf(v) {
    return Math.sqrt((v.x * v.x) + (v.y * v.y) + (v.z * v.z));
}

function normalize(v) {
    const len = lengthOf(v);
    if (len <= 0.000001) return { x: 0, y: 0, z: 1 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function cross(a, b) {
    return {
        x: (a.y * b.z) - (a.z * b.y),
        y: (a.z * b.x) - (a.x * b.z),
        z: (a.x * b.y) - (a.y * b.x)
    };
}

function add(a, b) {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scale(v, s) {
    return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function makeBasis(direction) {
    const forward = normalize(direction);
    const seed = Math.abs(forward.y) > 0.92
        ? { x: 1, y: 0, z: 0 }
        : { x: 0, y: 1, z: 0 };

    const right = normalize(cross(forward, seed));
    const up = normalize(cross(right, forward));
    return { forward, right, up };
}

// SECTION: Path and Offset Helpers
function wobbleOffsets(distance, time, strandPhase, ampNear, ampFar, spiralTightness, spiralTimeScale) {
    const distanceT = Math.min(1, Math.max(0, distance / 28));
    const baseRadius = ampNear + ((ampFar - ampNear) * distanceT);
    const pulse = 0.68 + (0.32 * Math.sin((distance * 1.9) - (time * 0.2) + (strandPhase * 1.35)));
    const radius = baseRadius * pulse;

    const angle = (distance * spiralTightness) + (time * spiralTimeScale) + strandPhase;

    return {
        right: Math.cos(angle) * radius,
        up: Math.sin(angle) * radius
    };
}

function centerlineOffsets(
    distance,
    time,
    pathWobbleNear,
    pathWobbleFar,
    pathLength,
    pathSwayAmount,
    pathSwayFrequency,
    pathSwayTimeScale
) {
    const distanceT = Math.min(1, Math.max(0, distance / Math.max(1, pathLength)));
    const wobble = pathWobbleNear + ((pathWobbleFar - pathWobbleNear) * distanceT);

    const rightWaveA = Math.sin((distance * 0.62) + (time * 0.21));
    const rightWaveB = Math.sin((distance * 1.37) - (time * 0.33) + 1.2);
    const upWaveA = Math.cos((distance * 0.58) - (time * 0.27));
    const upWaveB = Math.sin((distance * 1.24) + (time * 0.29) + 2.1);

    const baseRight = wobble * ((rightWaveA * 0.62) + (rightWaveB * 0.45));
    const baseUp = wobble * ((upWaveA * 0.65) + (upWaveB * 0.4));

    // Adds a readable side-to-side sway so the beam feels alive instead of static.
    const swayWave = Math.sin((distance * pathSwayFrequency) - (time * pathSwayTimeScale));
    const swayRight = wobble * pathSwayAmount * swayWave;
    const swayUp = wobble * (pathSwayAmount * 0.3)
        * Math.cos((distance * (pathSwayFrequency * 0.78)) - (time * (pathSwayTimeScale * 0.9)));

    return {
        right: baseRight + swayRight,
        up: baseUp + swayUp
    };
}

// SECTION: Particle Spawn Helpers
function trySpawnWithFallback(dimension, preferredParticle, fallbackParticle, point) {
    const preferred = `${preferredParticle ?? ""}`.trim();
    if (preferred) {
        try {
            dimension.spawnParticle(preferred, point);
            return { ok: true, particle: preferred };
        } catch { }
    }

    const fallback = `${fallbackParticle ?? ""}`.trim();
    if (fallback && fallback !== preferred) {
        try {
            dimension.spawnParticle(fallback, point);
            return { ok: true, particle: fallback };
        } catch { }
    }

    return { ok: false, particle: preferred || fallback || "" };
}

// SECTION: Beam Visual Renderer
export function renderGluonBeamVisual(config) {
    const {
        dimension,
        origin,
        direction,
        length,
        tick,
        auraParticle = "minecraft:basic_flame_particle",
        coreParticle = "minecraft:basic_flame_particle",
        arcParticle = "minecraft:basic_flame_particle",
        fallbackAuraParticle = "minecraft:basic_flame_particle",
        fallbackCoreParticle = "minecraft:basic_flame_particle",
        fallbackArcParticle = "minecraft:basic_flame_particle",
        step = 0.8,
        stepGrowth = 0.75,
        strands = 3,
        ampNear = 0.04,
        ampFar = 0.3,
        spiralTightness = 2.1,
        spiralTimeScale = 0.36,
        forwardLeadNear = 0.05,
        forwardLeadFar = 0.9,
        pathWobbleNear = 0.01,
        pathWobbleFar = 3,
        pathSwayAmount = 3,
        pathSwayFrequency = 0.9,
        pathSwayTimeScale = 0.42,
        coreFollowNear = 0.01,
        coreFollowFar = 0.2,
        auraStride = 2,
        maxParticles = 2
    } = config;

    if (!dimension || !origin || !direction || !Number.isFinite(length) || length <= 0) {
        return {
            spawnedCount: 0,
            hasVisual: false,
            auraParticle: "",
            coreParticle: "",
            arcParticle: ""
        };
    }

    const { forward, right, up } = makeBasis(direction);
    const safeStep = Math.max(0.1, step);
    const safeStepGrowth = Math.max(0, stepGrowth);
    const strandCount = Math.max(1, Math.floor(strands));
    const safeAuraStride = Math.max(1, Math.floor(auraStride));
    const particleBudget = Math.max(1, Math.floor(maxParticles));
    const safePathSwayAmount = Math.max(0, pathSwayAmount);
    const safePathSwayFrequency = Math.max(0.01, pathSwayFrequency);
    const safePathSwayTimeScale = Math.max(0.01, pathSwayTimeScale);

    let spawnedCount = 0;
    let segmentIndex = 0;

    let auraParticleUsed = `${auraParticle ?? ""}`;
    let coreParticleUsed = `${coreParticle ?? ""}`;
    let arcParticleUsed = `${arcParticle ?? ""}`;

    const initialOffset = safeStep * 0.45;

    const auraStart = trySpawnWithFallback(dimension, auraParticleUsed, fallbackAuraParticle, origin);
    let canSpawnAura = auraStart.ok;
    if (canSpawnAura) {
        auraParticleUsed = auraStart.particle;
        spawnedCount++;
    }

    const coreStart = trySpawnWithFallback(dimension, coreParticleUsed, fallbackCoreParticle, origin);
    let canSpawnCore = coreStart.ok;
    if (canSpawnCore) {
        coreParticleUsed = coreStart.particle;
        spawnedCount++;
    }

    const arcStart = trySpawnWithFallback(dimension, arcParticleUsed, fallbackArcParticle, origin);
    let canSpawnArc = arcStart.ok;
    if (canSpawnArc) {
        arcParticleUsed = arcStart.particle;
        spawnedCount++;
    }

    if (!canSpawnAura && !canSpawnCore && !canSpawnArc) {
        return {
            spawnedCount,
            hasVisual: false,
            auraParticle: auraParticleUsed,
            coreParticle: coreParticleUsed,
            arcParticle: arcParticleUsed
        };
    }

    for (let distance = initialOffset; distance <= length;) {
        if (spawnedCount >= particleBudget) {
            return {
                spawnedCount,
                hasVisual: spawnedCount > 0,
                auraParticle: canSpawnAura ? auraParticleUsed : "",
                coreParticle: canSpawnCore ? coreParticleUsed : "",
                arcParticle: canSpawnArc ? arcParticleUsed : ""
            };
        }

        const distanceT = Math.min(1, Math.max(0, distance / Math.max(1, length)));
        const currentStep = safeStep * (1 + (distanceT * safeStepGrowth));
        const basePoint = add(origin, scale(forward, distance));

        const centerline = centerlineOffsets(
            distance,
            tick,
            pathWobbleNear,
            pathWobbleFar,
            length,
            safePathSwayAmount,
            safePathSwayFrequency,
            safePathSwayTimeScale
        );
        const distortedCenterPoint = add(
            basePoint,
            add(scale(right, centerline.right), scale(up, centerline.up))
        );

        if (canSpawnAura && (segmentIndex % safeAuraStride) === 0) {
            const auraSpawn = trySpawnWithFallback(dimension, auraParticleUsed, fallbackAuraParticle, distortedCenterPoint);
            canSpawnAura = auraSpawn.ok;
            if (canSpawnAura) {
                auraParticleUsed = auraSpawn.particle;
                spawnedCount++;
            }
        }

        if (canSpawnCore) {
            const coreDrift = wobbleOffsets(
                distance,
                tick * 0.9,
                0,
                coreFollowNear,
                coreFollowFar,
                spiralTightness * 0.85,
                spiralTimeScale * 0.9
            );

            const corePoint = add(
                distortedCenterPoint,
                add(scale(right, coreDrift.right), scale(up, coreDrift.up))
            );

            const coreSpawn = trySpawnWithFallback(dimension, coreParticleUsed, fallbackCoreParticle, corePoint);
            canSpawnCore = coreSpawn.ok;
            if (canSpawnCore) {
                coreParticleUsed = coreSpawn.particle;
                spawnedCount++;
            }
        }

        for (let strand = 0; strand < strandCount; strand++) {
            if (spawnedCount >= particleBudget) {
                return {
                    spawnedCount,
                    hasVisual: spawnedCount > 0,
                    auraParticle: canSpawnAura ? auraParticleUsed : "",
                    coreParticle: canSpawnCore ? coreParticleUsed : "",
                    arcParticle: canSpawnArc ? arcParticleUsed : ""
                };
            }

            const strandPhase = (strand / strandCount) * (Math.PI * 2);
            const jitterPhase = ((strand + 1) * 0.37) + ((tick % 31) * 0.03);
            const offsets = wobbleOffsets(
                distance,
                tick + jitterPhase,
                strandPhase,
                ampNear,
                ampFar,
                spiralTightness,
                spiralTimeScale
            );

            const leadAmount = forwardLeadNear + ((forwardLeadFar - forwardLeadNear) * distanceT);
            const leadPoint = add(distortedCenterPoint, scale(forward, leadAmount));
            const wobblePoint = add(
                leadPoint,
                add(scale(right, offsets.right), scale(up, offsets.up))
            );

            if (canSpawnArc) {
                const arcSpawn = trySpawnWithFallback(dimension, arcParticleUsed, fallbackArcParticle, wobblePoint);
                canSpawnArc = arcSpawn.ok;
                if (canSpawnArc) {
                    arcParticleUsed = arcSpawn.particle;
                    spawnedCount++;
                }
            }
        }

        if (!canSpawnAura && !canSpawnCore && !canSpawnArc) {
            return {
                spawnedCount,
                hasVisual: spawnedCount > 0,
                auraParticle: "",
                coreParticle: "",
                arcParticle: ""
            };
        }

        distance += currentStep;
        segmentIndex++;
    }

    return {
        spawnedCount,
        hasVisual: spawnedCount > 0,
        auraParticle: canSpawnAura ? auraParticleUsed : "",
        coreParticle: canSpawnCore ? coreParticleUsed : "",
        arcParticle: canSpawnArc ? arcParticleUsed : ""
    };
}