# gamerules
gamerule commandblockoutput false
gamerule commandblocksenabled true
gamerule dodaylightcycle false
gamerule doentitydrops false
gamerule dofiretick false
gamerule doimmediaterespawn true
gamerule dolimitedcrafting false
gamerule domobloot false
gamerule domobspawning false
gamerule dotiledrops false
gamerule doweathercycle false
gamerule drowningdamage true
gamerule falldamage false
gamerule firedamage true
gamerule freezedamage true
gamerule keepinventory true
gamerule mobgriefing false
gamerule naturalregeneration true
gamerule pvp false
gamerule randomtickspeed 0
gamerule spawnradius 0
gamerule showbordereffect false
gamerule showcoordinates true
gamerule showdaysplayed false
gamerule showdeathmessages false
gamerule showtags false
gamerule sendcommandfeedback false
gamerule tntexplodes false
gamerule respawnblocksexplode false
gamerule recipesunlock false
gamerule doinsomnia false
gamerule showrecipemessages false
gamerule locatorbar false
difficulty peaceful
time set 500
setworldspawn 0 1 -1
clearspawnpoint @a
# scoreboards
scoreboard objectives add win_storage dummy
scoreboard objectives add coins_storage dummy
scoreboard objectives add lobby dummy
scoreboard objectives add game dummy
scoreboard objectives add music dummy
scoreboard objectives add coins dummy "§e§l Coins "
scoreboard objectives add wins dummy "§b§l Wins "
scoreboard objectives setdisplay belowname wins
scoreboard objectives setdisplay sidebar coins
# scores
scoreboard players set enabled lobby 0
scoreboard players set game lobby 0
scoreboard players set extended game 0
scoreboard players set playercount game 0
scoreboard players set timer_ms game 1
scoreboard players set timer_s game 10
scoreboard players set timer_m game 3
scoreboard players set started game 0
scoreboard players set skywars lobby 1
scoreboard players set inventory game 1
scoreboard players set map game 1
# tag
tag @s add host
tellraw @a {"rawtext":[{"text": "§aGame setted up successfully"}]}
tellraw @s {"rawtext":[{"text": "You are now the host of the world. You're granted the ability to manipulate the game via the items in your hotbar, only you have those."}]}