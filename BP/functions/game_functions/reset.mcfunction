# = GAMERULES =
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
gamerule firedamage false
gamerule freezedamage false
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
weather clear
# = MAP =
structure load mystructure:delete -63 -64 -63 0_degrees none block_by_block 5
structure load mystructure:delete 0 -64 -63 0_degrees none block_by_block 5
structure load mystructure:delete 0 -64 0 0_degrees none block_by_block 5
structure load mystructure:delete -63 -64 0 0_degrees none block_by_block 5
# = ENTITIES =
kill @e[type=!minecraft:player]
inputpermission set @a movement enabled
camera @a clear
camera @a fov_clear
tp @a[tag=spectator] 0 1 -1
tag @a remove voted
# = SCORES =
scoreboard objectives remove game_music
scoreboard objectives add game_music dummy
scoreboard players set game lobby 0
scoreboard players set playercount game 0
scoreboard players set timer_ms game 1
scoreboard players set timer_s game 12
scoreboard players set timer_m game 3
scoreboard players set extended game 0
scoreboard players set timer_s lobby 20
scoreboard players set timer_ms lobby 20
scoreboard players set started game 0
scoreboard objectives remove coins
scoreboard objectives remove wins
scoreboard objectives add coins dummy "§e§l Coins "
scoreboard objectives add wins dummy "§b§l Wins "
scoreboard objectives setdisplay belowname wins
scoreboard objectives setdisplay sidebar coins