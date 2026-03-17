import * as mc from "@minecraft/server";
import { ModalFormData, ActionFormData } from "@minecraft/server-ui";

const { world, system } = mc;
const CommandPermissionLevel = mc.CommandPermissionLevel;

const emojis = [
    { id: ":skull:", emoji: "", displayName: "Skull" },
    { id: ":pray:", emoji: "", displayName: "Pray" },
    { id: ":hh:", emoji: "", displayName: "Horrific housing" },
    { id: ":fire:", emoji: "", displayName: "Fire" },
    { id: ":coins:", emoji: "", displayName: "Coins" },
    { id: ":crane:", emoji: "", displayName: "Crane" },
    { id: ":bonnie:", emoji: "", displayName: "Bonnie" },
    { id: ":ninjaman:", emoji: "", displayName: "Niceninjapro" },
    { id: ":taco:", emoji: "", displayName: "Taco" },
    { id: ":subspace_taco:", emoji: "", displayName: "Subspace Taco" },
    { id: ":crown:", emoji: "", displayName: "Crown" },
    { id: ":ok:", emoji: "", displayName: "OK" },
    { id: ":speaking_head:", emoji: "", displayName: "Speaking Head" },
    { id: ":lil_john:", emoji: "", displayName: "Lil John" },
    { id: ":ice:", emoji: "", displayName: "Ice" },
    { id: ":deathnote:", emoji: "", displayName: "Deathnote" },
    { id: ":meteor:", emoji: "", displayName: "Meteor" },
    { id: ":nuke:", emoji: "", displayName: "Nuke" },
    { id: ":train:", emoji: "", displayName: "Train" },
    { id: ":lightning:", emoji: "", displayName: "Lightning" },
    { id: ":microwave:", emoji: "", displayName: "Microwave" },
    { id: ":amogus:", emoji: "", displayName: "Amogus" },
    { id: ":not_stonks:", emoji: "", displayName: "Not Stonks" },
    { id: ":subspace_tripmine:", emoji: "", displayName: "Subspace Tripmine" },
    { id: ":landmine:", emoji: "", displayName: "Landmine" },
    { id: ":skull_cry:", emoji: "", displayName: "Skull Cry" },
    { id: ":thumbs_up:", emoji: "", displayName: "Thumbs Up" },
    { id: ":thumbs_down:", emoji: "", displayName: "Thumbs Down" },
    { id: ":classic:", emoji: "", displayName: "Classic" },
    { id: ":blast:", emoji: "", displayName: "Blast" },
    { id: ":rapid:", emoji: "", displayName: "Rapid" },
    { id: ":stud:", emoji: "", displayName: "Stud" },
    { id: ":oneplate:", emoji: "", displayName: "One Plate" },
    { id: ":scattered:", emoji: "", displayName: "Scattered" },
    { id: ":lava:", emoji: "", displayName: "Lava" },
    { id: ":spleef:", emoji: "", displayName: "Spleef" },
    { id: ":line:", emoji: "", displayName: "Line" },
    { id: ":town:", emoji: "", displayName: "Town" },
    { id: ":ring:", emoji: "", displayName: "Ring" },
    { id: ":sweeper:", emoji: "", displayName: "Sweeper" },
    { id: ":twoplates:", emoji: "", displayName: "Two Plates" },
    { id: ":murdertown:", emoji: "", displayName: "Murder Town" },
    { id: ":sloweddown:", emoji: "", displayName: "Slowed Down" },
    { id: ":gear:", emoji: "", displayName: "Gear" },
    { id: ":hotel:", emoji: "", displayName: "Hotel" },
    { id: ":islands:", emoji: "", displayName: "Islands" },
    { id: ":cloud:", emoji: "", displayName: "Cloud" },
    { id: ":soda:", emoji: "", displayName: "Soda" },
    { id: ":red_soda:", emoji: "", displayName: "Red Soda" },
    { id: ":wolf:", emoji: "", displayName: "Wolf" },
    { id: ":cat:", emoji: "", displayName: "Cat" },
    { id: ":fox:", emoji: "", displayName: "Fox" },
    { id: ":titanic:", emoji: "", displayName: "Titanic" },
    { id: ":bunny:", emoji: "", displayName: "Bunny" },
    { id: ":wave:", emoji: "", displayName: "Wave" },
    { id: ":left:", emoji: "", displayName: "Left" },
    { id: ":down:", emoji: "", displayName: "Down" },
    { id: ":up:", emoji: "", displayName: "Up" },
    { id: ":right:", emoji: "", displayName: "Right" },
    { id: ":axolotl:", emoji: "", displayName: "Axolotl" },
    { id: ":frog:", emoji: "", displayName: "Frog" },
    { id: ":gun:", emoji: "", displayName: "Gun" },
    { id: ":panda:", emoji: "", displayName: "Panda" },
    { id: ":duck:", emoji: "", displayName: "Duck" },
    { id: ":parrot:", emoji: "", displayName: "Parrot" },
    { id: ":discord:", emoji: "", displayName: "Discord" },
    { id: ":bonnie_stare:", emoji: "", displayName: "Bonnie Stare" },
    { id: ":sip:", emoji: "", displayName: "Sip" },
    { id: ":cactus:", emoji: "", displayName: "Cactus" },
    { id: ":tree:", emoji: "", displayName: "Tree" },
    { id: ":win:", emoji: "", displayName: "Win" },
    { id: ":plant:", emoji: "", displayName: "Plant" },
    { id: ":bread:", emoji: "", displayName: "Bread" },
    { id: ":technoblade:", emoji: "", displayName: "Technoblade" },
    { id: ":bee:", emoji: "", displayName: "Bee" },
    { id: ":wah:", emoji: "", displayName: "Wah" },
    { id: ":doggo:", emoji: "", displayName: "Doggo" },
    { id: ":happy:", emoji: "", displayName: "Happy" },
    { id: ":dollar:", emoji: "", displayName: "Dollar" },
    { id: ":sandwich:", emoji: "", displayName: "Sandwich" },
    { id: ":test:", emoji: "", displayName: "Test" },
    { id: ":white_pigeon:", emoji: "", displayName: "White Pigeon" },
    { id: ":marsh:", emoji: "", displayName: "Marsh" },
    { id: ":couldron:", emoji: "", displayName: "Couldron" },
    { id: ":bat:", emoji: "", displayName: "Bat" },
    { id: ":candy:", emoji: "", displayName: "Candy" },
    { id: ":candy_heart:", emoji: "", displayName: "Candy Heart" },
    { id: ":grave:", emoji: "", displayName: "Grave" },
    { id: ":ghost:", emoji: "", displayName: "Ghost" },
    { id: ":pumpkin:", emoji: "", displayName: "Pumpkin" },
    { id: ":pie:", emoji: "", displayName: "Pie" },
    { id: ":knife:", emoji: "", displayName: "Knife" },
    { id: ":spookycat:", emoji: "", displayName: "Spooky Cat" },
    { id: ":alien:", emoji: "", displayName: "Alien" },
    { id: ":crow:", emoji: "", displayName: "Crow" },
    { id: ":ice_cream:", emoji: "", displayName: "Ice Cream" },
    { id: ":sad:", emoji: "", displayName: "Sad" },
    { id: ":laugh:", emoji: "", displayName: "Laugh" },
    { id: ":cool:", emoji: "", displayName: "Cool" },
    { id: ":moyai:", emoji: "", displayName: "Moyai" },
    { id: ":penguin:", emoji: "", displayName: "Penguin" },
    { id: ":popcorn:", emoji: "", displayName: "Popcorn" },
    { id: ":hammer:", emoji: "", displayName: "Hammer" },
    { id: ":robot:", emoji: "", displayName: "Robot" },
    { id: ":laundry:", emoji: "", displayName: "Laundry" },
    { id: ":star:", emoji: "", displayName: "Star" },
    { id: ":witch:", emoji: "", displayName: "Witch" },
    { id: ":spider:", emoji: "", displayName: "Spider" },
    { id: ":pot:", emoji: "", displayName: "Pot" },
    { id: ":lamp:", emoji: "", displayName: "Lamp" },
    { id: ":farmbales:", emoji: "", displayName: "Farm Bales" },
    { id: ":tree_ornament:", emoji: "", displayName: "Tree Ornament" },
    { id: ":carpet:", emoji: "", displayName: "Carpet" },
    { id: ":construction_site:", emoji: "", displayName: "Construction Site" },
    { id: ":yeeter:", emoji: "", displayName: "Yeeter" },
    { id: ":bushes:", emoji: "", displayName: "Bushes" },
    { id: ":snowy:", emoji: "", displayName: "Snowy" },
    { id: ":banana_ornament:", emoji: "", displayName: "Banana Ornament" },
    { id: ":sans:", emoji: "", displayName: "Sans" },
    { id: ":fan:", emoji: "", displayName: "Fan" },
    { id: ":mcdonalds:", emoji: "", displayName: "Mcdonalds" },
    { id: ":horns:", emoji: "", displayName: "Horns" },
    { id: ":melodie:", emoji: "", displayName: "Melodie" },
    { id: ":janet:", emoji: "", displayName: "Janet" },
    { id: ":halloween_theme:", emoji: "", displayName: "Halloween Theme" },
    { id: ":carved_pumpkin:", emoji: "", displayName: "Carved Pumpkin" },
    { id: ":engine:", emoji: "", displayName: "Engine" },
    { id: ":ufo:", emoji: "", displayName: "UFO" },
    { id: ":tropical_island:", emoji: "", displayName: "Tropical Island" },
    { id: ":yippie:", emoji: "", displayName: "Yippie" },
    { id: ":stonks:", emoji: "", displayName: "Stonks" },
    { id: ":antidote:", emoji: "", displayName: "Antidote" },
    { id: ":stack:", emoji: "", displayName: "Stack" },
    { id: ":heist:", emoji: "", displayName: "Heist" },
    { id: ":subspace:", emoji: "", displayName: "Subspace" },
    { id: ":subspace_town:", emoji: "", displayName: "Subspace Town" },
    { id: ":purple_ring:", emoji: "", displayName: "Purple Ring" },
    { id: ":blue_flame:", emoji: "", displayName: "Blue Flame" },
    { id: ":banana:", emoji: "", displayName: "Banana" },
    { id: ":subspace_soda:", emoji: "", displayName: "Subspace Soda" },
    { id: ":bonnie_plush:", emoji: "", displayName: "BonnieRobloxRIP Plush" },
    { id: ":ring_ornament:", emoji: "", displayName: "Ring Ornament" },
    { id: ":springtrap_plush:", emoji: "", displayName: "Springtrap Plush" },
    { id: ":alastor_plush:", emoji: "", displayName: "Alastor Plush" },
    { id: ":seal_plush:", emoji: "", displayName: "Seal Plush" },
    { id: ":world_trade_center:", emoji: "", displayName: "World Trade Center" },
    { id: ":baby_fox:", emoji: "", displayName: "Bany Fox" },
    { id: ":bed:", emoji: "", displayName: "Bed" },
    { id: ":bell:", emoji: "", displayName: "Bell" },
    { id: ":bms:", emoji: "", displayName: "Black Mesa" },
    { id: ":bouquet:", emoji: "", displayName: "Bouquet" },
    { id: ":hamburger:", emoji: "", displayName: "Hambuger" },
    { id: ":alert:", emoji: "", displayName: "Alert" },
    { id: ":bulgaria:", emoji: "", displayName: "Bulgaria" },
    { id: ":candy_cane:", emoji: "", displayName: "Candy Cane" },
    { id: ":car:", emoji: "", displayName: "Car" },
    { id: ":catblobhug:", emoji: "", displayName: "CatBlobHug" },
    { id: ":cheeseburger:", emoji: "", displayName: "Cheeseburger" },
    { id: ":christmas_bunny:", emoji: "", displayName: "Christmas Bunny" },
    { id: ":christmas_lights:", emoji: "", displayName: "Christmas Lights" },
    { id: ":christmas_tree:", emoji: "", displayName: "Christmas Tree" },
    { id: ":christmas_wreath:", emoji: "", displayName: "Christmas Wreath" },
    { id: ":clock:", emoji: "", displayName: "Clock" },
    { id: ":creeper:", emoji: "", displayName: "Creeper" },
    { id: ":dispatcher:", emoji: "", displayName: "Dispatcher" },
    { id: ":firework:", emoji: "", displayName: "Firework" },
    { id: ":friendly_campfire:", emoji: "", displayName: "Friendly Campfire" },
    { id: ":gingerbread_man:", emoji: "", displayName: "Gingerbread Man" },
    { id: ":grave_digger:", emoji: "", displayName: "Grave Digger" },
    { id: ":heart_on_fire:", emoji: "", displayName: "Heart on Fire" },
    { id: ":heartpulse:", emoji: "", displayName: "HeartPulse" },
    { id: ":heart_hands:", emoji: "", displayName: "Heart Hands" },
    { id: ":hot_chocolate:", emoji: "", displayName: "Hot Chocolate" },
    { id: ":kissing_face:", emoji: "", displayName: "Kissing Face" },
    { id: ":lambda:", emoji: "", displayName: "Lambda" },
    { id: ":frown:", emoji: "", displayName: "Frown" },
    { id: ":laugh_out_loud:", emoji: "", displayName: "Laugh out Loud" },
    { id: ":milk:", emoji: "", displayName: "Milk" },
    { id: ":christmas_ornament:", emoji: "", displayName: "Christmas Ornament" },
    { id: ":owl:", emoji: "", displayName: "Owl" },
    { id: ":phone:", emoji: "", displayName: "Phone" },
    { id: ":present:", emoji: "", displayName: "Present" },
    { id: ":present2:", emoji: "", displayName: "Present 2" },
    { id: ":crystal:", emoji: "", displayName: "Crystal" },
    { id: ":reindeer:", emoji: "", displayName: "Reindeer" },
    { id: ":ring2:", emoji: "", displayName: "Ring" },
    { id: ":santa:", emoji: "", displayName: "Santa" },
    { id: ":sleigh:", emoji: "", displayName: "Sleigh" },
    { id: ":snowglobe:", emoji: "", displayName: "Snowglobe" },
    { id: ":snowball:", emoji: "", displayName: "Snowball" },
    { id: ":snowflake:", emoji: "", displayName: "Snowflake" },
    { id: ":snowman:", emoji: "", displayName: "Snowman" },
    { id: ":strawberry:", emoji: "", displayName: "Strawberry" },
    { id: ":strawberry_cheesecake:", emoji: "", displayName: "Strawberry Cheesecake" },
    { id: ":smiling_face_with_3_hearts:", emoji: "", displayName: "Smiling Face with 3 Hearts" },
    { id: ":tomato:", emoji: "", displayName: "Tomato" },
    { id: ":2_hearts:", emoji: "", displayName: "2 Hearts" },
    { id: ":blue_heart:", emoji: "", displayName: "Blue Heart" },
    { id: ":orange_heart:", emoji: "", displayName: "Orange Heart" },
    { id: ":purple_heart:", emoji: "", displayName: "Purple Heart" },
    { id: ":red_heart:", emoji: "", displayName: "Red Heart" },
    { id: ":waa:", emoji: "", displayName: "Waa" },
    { id: ":usa:", emoji: "", displayName: "USA" },
    { id: ":subspace_plant:", emoji: "", displayName: "Subspace Plant" },
    { id: ":cat2:", emoji: "", displayName: "Cat 2" },
    { id: ":cat3:", emoji: "", displayName: "Cat 3" },
    { id: ":cat4:", emoji: "", displayName: "Cat 4" },
    { id: ":cat5:", emoji: "", displayName: "Cat 5" },
    { id: ":cat6:", emoji: "", displayName: "Cat 6" },
    { id: ":cat7:", emoji: "", displayName: "Cat 7" },
    { id: ":cat8:", emoji: "", displayName: "Cat 8" },
    { id: ":rabbit:", emoji: "", displayName: "Rabbit" },
    { id: ":rabbit2:", emoji: "", displayName: "Rabbit 2" },
    { id: ":rabbit3:", emoji: "", displayName: "Rabbit 3" },
    { id: ":rabbit4:", emoji: "", displayName: "Rabbit 4" },
    { id: ":rabbit5:", emoji: "", displayName: "Rabbit 5" },
    { id: ":rabbit6:", emoji: "", displayName: "Rabbit 6" }
]

function getCustomNametagParts(player, context) {
    try {
        const raw = player.getDynamicProperty("brr_nametag");
        if (typeof raw !== "string" || raw.length === 0) return { prefix: "", suffix: "" };

        const data = JSON.parse(raw);
        if (context === "chat") {
            if (typeof data?.chatPrefix === "string" || typeof data?.chatSuffix === "string") {
                return {
                    prefix: `${data?.chatPrefix ?? ""}`,
                    suffix: `${data?.chatSuffix ?? ""}`
                };
            }
        }

        if (context === "username") {
            if (typeof data?.usernamePrefix === "string" || typeof data?.usernameSuffix === "string") {
                return {
                    prefix: `${data?.usernamePrefix ?? ""}`,
                    suffix: `${data?.usernameSuffix ?? ""}`
                };
            }
        }

        const legacyNametag = `${data?.nametag ?? ""}`.trim();
        if (!legacyNametag) return { prefix: "", suffix: "" };

        const formattedLegacyTag = `[${legacyNametag}§r] `;
        const isChatContext = context === "chat";
        const isUsernameContext = context === "username";
        const enabledForContext = (isChatContext && Boolean(data?.worksInChat)) || (isUsernameContext && Boolean(data?.worksInUsernames));
        if (!enabledForContext) return { prefix: "", suffix: "" };

        const wantsPrefix = data?.prefix !== false;
        const wantsSuffix = Boolean(data?.suffix);
        return {
            prefix: wantsPrefix ? formattedLegacyTag : "",
            suffix: wantsSuffix ? formattedLegacyTag : ""
        };
    } catch {
        return { prefix: "", suffix: "" };
    }
}

function normalizeChatMessage(rawMessage) {
    return `${rawMessage ?? ""}`
        .replaceAll("\n", " ")
        .replaceAll("%", "%%");
}

export function applyEmojiReplacements(message) {
    let processedMessage = message;
    for (const emoji of emojis) {
        processedMessage = processedMessage.replaceAll(emoji.id, emoji.emoji);
    }
    return processedMessage;
}

export function sendRankedMessage(player, rawMessage) {
    const tags = player.getTags();
    const rankPrefix = chatRank(player, tags);
    const nametagParts = getCustomNametagParts(player, "chat");

    const processedMessage = applyEmojiReplacements(normalizeChatMessage(rawMessage));

    const text = `§r${rankPrefix}${nametagParts.prefix}§r${player.name}${nametagParts.suffix}: §f${processedMessage}`;
    world.sendMessage({ rawtext: [{ text: text }] });
}

export function chatRank(player, tags) {
    let rankPrefix = "";

    // Dev Ranks
    if (["BonnieRobloxRIP", "Marshmallow997", "xXJustMaxXx7546"].includes(player.name)) {
        rankPrefix += "[§l§dDev§r] ";
    }

    // Special Tags
    if (tags.includes("mega_vip")) rankPrefix += "[§l§o§aM§2E§sG§bA §sV.§2I.§aP.§r] ";
    if (tags.includes("vip") && !tags.includes("mega_vip")) rankPrefix += "[§e§l§oV.§gI.§6P.§r] ";

    // Fun Tags
    if (tags.includes("begger")) rankPrefix += "[§d§lBegger§r]";
    if (tags.includes("sweat")) rankPrefix += "[§g§lSWEAT§r]";
    if (tags.includes("grinder")) rankPrefix += "[§6§lGRINDER§r]";
    if (tags.includes("mace_god")) rankPrefix += "[§5§lMace God§r]";
    if (tags.includes("frog")) rankPrefix += "[§2§lFr§ao§bg§r]";
    if (tags.includes("tank")) rankPrefix += "[§8§lTank§r]";
    if (tags.includes("icecream")) rankPrefix += "[§r]";
    if (tags.includes("skull")) rankPrefix += "[§r]";
    if (tags.includes("yt")) rankPrefix += "[§4You§fTuber§r]";
    if (tags.includes("strawberry")) rankPrefix += "[§r]";

    if (tags.includes("lobby") && !tags.includes("game")) rankPrefix += "[§b§lLobby§r] ";
    if (tags.includes("game")) rankPrefix += "[§a§lGamer§r] ";

    return rankPrefix;
}

export function nametagRank(player, tags) {
    let rankPrefix = "";

    if (player.name === "BonnieRobloxRIP") rankPrefix += " ";

    if (["BonnieRobloxRIP", "Marshmallow997", "xXJustMaxXx7546"].includes(player.name)) {
        rankPrefix += "[§l§dDev§r] ";
    }

    // Special tags
    if (tags.includes("mega_vip")) rankPrefix += "[§l§o§aM§2E§sG§bA §sV.§2I.§aP.§r] ";
    if (tags.includes("vip") && !tags.includes("mega_vip")) rankPrefix += "[§e§l§oV.§gI.§6P.§r] ";

    // Fun Tags
    if (tags.includes("begger")) rankPrefix += "[§d§lBegger§r]";
    if (tags.includes("sweat")) rankPrefix += "[§g§lSWEAT§r]";
    if (tags.includes("grinder")) rankPrefix += "[§6§lGRINDER§r]";
    if (tags.includes("mace_god")) rankPrefix += "[§5§lMace God§r]";
    if (tags.includes("frog")) rankPrefix += "[§2§lFr§ao§bg§r]";
    if (tags.includes("stop")) rankPrefix += "[§4§l§oAFK§r]";
    if (tags.includes("tank")) rankPrefix += "[§8§lTank§r]";
    if (tags.includes("icecream")) rankPrefix += "[§r]";
    if (tags.includes("skull")) rankPrefix += "[§r]";
    if (tags.includes("yt")) rankPrefix += "[§4You§fTuber§r]";
    if (tags.includes("strawberry")) rankPrefix += "[§r]";

    if (tags.includes("lobby") && !tags.includes("game")) rankPrefix += "[§b§lLobby§r] ";
    if (tags.includes("game")) rankPrefix += "[§a§lGamer§r] ";

    return rankPrefix;
}

export function handleMessage() {
    try {
        world.beforeEvents.chatSend.subscribe((data) => {
            const player = data.sender;
            const tags = player.getTags();
            let message = data.message;
            const nametagParts = getCustomNametagParts(player, "chat");

            if (message.toLowerCase() === "!emojis") {
                data.cancel = true;
                player.sendMessage("§cPlease use /brr:emojis instead.");
                return;
            }

            message = applyEmojiReplacements(normalizeChatMessage(message));

            const rankPrefix = chatRank(player, tags);

            // Send the message
            const text = `§r${rankPrefix}${nametagParts.prefix}§r${player.name}${nametagParts.suffix}: §f${message}`;
            world.sendMessage({ rawtext: [{ text: text }] });
            data.cancel = true;
        });
    } catch { }

    system.runInterval(() => {
        const allPlayers = world.getPlayers();
        const playerNames = allPlayers.map(p => p.name);
        const bothDevsOnline = playerNames.includes("BonnieRobloxRIP") && playerNames.includes("Marshmallow997");

        for (const player of allPlayers) {
            const tags = player.getTags();
            const rankPrefix = nametagRank(player, tags, bothDevsOnline);
            const nametagParts = getCustomNametagParts(player, "username");
            player.nameTag = `${rankPrefix}${nametagParts.prefix}${player.name}${nametagParts.suffix}`;
        }
    }, 20);
}
try {
    handleMessage();
} catch { }

// Item use
try {
    world.afterEvents.itemUse.subscribe((eventData) => {
        const player = eventData.source;
        const itemId = eventData.itemStack.typeId;

        if (itemId === "brr:dino_speecher") {
            showDinoSpeecherMenu(player);
            return;
        }
    });
} catch { }

// Emoji command
export function emojiCommand(data) {
    if (!data?.customCommandRegistry || !CommandPermissionLevel) {
        return;
    }

    data.customCommandRegistry.registerCommand(
        {
            name: "brr:emojis",
            description: "Open the emoji list menu",
            permissionLevel: CommandPermissionLevel.Any,
            mandatoryParameters: [],
        },
        (origin) => {
            const player = origin.sourceEntity;
            if (player && player.typeId === "minecraft:player") {
                system.run(() => showMainMenu(player));
            }
        }
    );
}

export function getCategory(emoji) {
    const char = emoji.displayName.charAt(0).toUpperCase();
    return /[A-Z]/.test(char) ? char : "#";
}

export function showMainMenu(player) {
    // Get unique categories and sort them (# first, then A-Z)
    const categories = [...new Set(emojis.map(e => getCategory(e)))].sort((a, b) => {
        if (a === "#") return -1;
        if (b === "#") return 1;
        return a.localeCompare(b);
    });

    const form = new ActionFormData()
        .title(" Emoji List ")
        .body("Select a category:");

    for (const category of categories) {
        form.button(`${category}`);
    }

    form.show(player).then(response => {
        if (response.canceled) return;

        const selectedCategory = categories[response.selection];
        showCategoryMenu(player, selectedCategory);
    });
}

export function showCategoryMenu(player, category) {
    // Filter emojis for this category
    const categoryEmojis = emojis.filter(e => getCategory(e) === category);

    // Sort emojis alphabetically by displayName
    categoryEmojis.sort((a, b) => a.displayName.localeCompare(b.displayName));

    const form = new ActionFormData()
        .title(` ${category} `);

    form.button("§l« Back to list");

    for (const emoji of categoryEmojis) {
        form.button(`${emoji.emoji} ${emoji.id} ${emoji.displayName}`);
    }

    form.show(player).then(response => {
        if (response.canceled) return;

        if (response.selection === 0) {
            showMainMenu(player);
            return;
        }

        const selectedEmoji = categoryEmojis[response.selection - 1];

        if (selectedEmoji) {
            // Send the ranked message
            sendRankedMessage(player, selectedEmoji.emoji);

            // Re-open this specific menu
            system.run(() => showCategoryMenu(player, category));
        }
    });
}

export function showDinoSpeecherMenu(player) {
    const TARGET_PROPERTY = "brr_dino_speecher_target";

    // Get all players for the dropdown
    const allPlayers = world.getPlayers();
    const playerNames = allPlayers
        .map(p => `${p?.name ?? ""}`.trim())
        .filter(name => name.length > 0);

    // Add "None" as the first option for public chat
    const options = ["None (Public Chat)", ...playerNames];

    const savedTargetRaw = `${player.getDynamicProperty(TARGET_PROPERTY) ?? ""}`.trim();
    const savedTarget = savedTargetRaw.toLowerCase() === "none" ? "" : savedTargetRaw;
    const defaultValueIndex = savedTarget ? Math.max(0, options.indexOf(savedTarget)) : 0;

    const form = new ModalFormData()
        .title("Dino Speecher ")
        .dropdown("Select a player to whisper to:", options, { defaultValueIndex })
        .textField("Message:", "Type your message here...");

    form.show(player).then(response => {
        if (response.canceled) return;

        const [selectionIndex, rawMessage] = response.formValues;
        const messageText = `${rawMessage ?? ""}`;

        const selectedTargetName = options[selectionIndex] ?? options[0];
        const targetToStore = selectionIndex === 0 ? "none" : selectedTargetName;
        try {
            player.setDynamicProperty(TARGET_PROPERTY, targetToStore);
        } catch { }

        // Make sure message isn't empty
        if (messageText.trim().length === 0) return;

        if (selectionIndex === 0) {
            // - Option 1: Public Chat (None selected)
            sendRankedMessage(player, messageText);
        } else {
            // - Option 2: Private Whisper
            const targetName = options[selectionIndex];
            const targetPlayer = allPlayers.find(p => p.name === targetName);

            if (targetPlayer) {
                // Get Rank Prefix
                const tags = player.getTags();
                const rankPrefix = chatRank(player, tags);

                // Process Emojis manually for the whisper
                let processedMessage = applyEmojiReplacements(normalizeChatMessage(messageText));

                // Format: Rank + Name + "whispers to you:" + Message
                const whisperText = `§r${rankPrefix}§r${player.name} §iwhispers to you: §f${processedMessage}`;

                // Send to Target
                targetPlayer.sendMessage(whisperText);

                // Confirmation for the sender
                player.sendMessage(`§7You whisper to ${targetName}: ${processedMessage}`);
            } else {
                player.sendMessage("§cTarget player not found (they may have left).");
            }
        }
    });
}