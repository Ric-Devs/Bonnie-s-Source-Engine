# = TIMER =
scoreboard players remove timer_ms game 1
execute if score timer_ms game matches ..0 run scoreboard players remove timer_s game 1
execute if score timer_ms game matches ..0 run scoreboard players set timer_ms game 20
execute if score timer_s game matches ..0 run scoreboard players remove timer_m game 1
# // stop the game if there's 1 person only.
execute if score playercount game matches 0..1 if score started game matches 0 run tp @a[tag=game] 0 1 -1
execute if score playercount game matches 0..1 if score started game matches 0 run tellraw @a {"rawtext":[{"text": "§6§lThe game has been terminated. Not enough players"}]}
execute if score playercount game matches 0..1 if score started game matches 0 run function game_functions/reset
# // remaining time announcement
execute if score timer_m game matches 3 if score timer_s game matches 59 if score timer_ms game matches 20 run tellraw @a {"rawtext":[{"text": "§b§l4 Minutes remaining!"}]}
execute if score timer_m game matches 2 if score timer_s game matches 59 if score timer_ms game matches 20 run tellraw @a {"rawtext":[{"text": "§a§l3 Minutes remaining!"}]}
execute if score timer_m game matches 1 if score timer_s game matches 59 if score timer_ms game matches 20 run tellraw @a {"rawtext":[{"text": "§e§l2 Minutes remaining!"}]}
execute if score timer_m game matches 0 if score timer_s game matches 59 if score timer_ms game matches 20 run tellraw @a {"rawtext":[{"text": "§4§l1 Minute remaining!"}]}
execute if score timer_m game matches 0 if score timer_s game matches 30 if score timer_ms game matches 20 run tellraw @a {"rawtext":[{"text": "§4§l30 Seconds remaining!"}]}
execute if score timer_m game matches 0 if score timer_s game matches 10 if score timer_ms game matches 20 run tellraw @a {"rawtext":[{"text": "§4§l10 Seconds remaining!"}]}
execute if score timer_m game matches 0 if score timer_s game matches 5 if score timer_ms game matches 20 run tellraw @a {"rawtext":[{"text": "§4§l5!"}]}
execute if score timer_m game matches 0 if score timer_s game matches 4 if score timer_ms game matches 20 run tellraw @a {"rawtext":[{"text": "§6§l4!"}]}
execute if score timer_m game matches 0 if score timer_s game matches 3 if score timer_ms game matches 20 run tellraw @a {"rawtext":[{"text": "§e§l3!"}]}
execute if score timer_m game matches 0 if score timer_s game matches 2 if score timer_ms game matches 20 run tellraw @a {"rawtext":[{"text": "§2§l2!"}]}
execute if score timer_m game matches 0 if score timer_s game matches 1 if score timer_ms game matches 20 run tellraw @a {"rawtext":[{"text": "§a§l1!"}]}
# // beginning
execute if score timer_s game matches 11 if score timer_ms game matches 19 if score started game matches 0 run playsound music.game.skywars @a[tag=game, tag=!music_stop]
execute if score timer_s game matches ..0 if score started game matches 0 as @a[tag=game] at @s run structure load mystructure:cageD ~-2 ~-1 ~-2
execute if score timer_s game matches ..0 if score started game matches 0 as @a[tag=game, tag=copper_airship_cageE] at @s run structure load mystructure:cageD ~-2 ~-2 ~-2
execute if score timer_s game matches ..0 if score started game matches 0 as @a[tag=game, tag=bassalting_floater_cageE] at @s run structure load mystructure:cageD ~-2 ~-2 ~-2
execute if score timer_s game matches ..0 if score started game matches 0 as @a[tag=game, tag=candy_land_cageE] at @s run structure load mystructure:cageD ~-2 ~-2 ~-2
execute if score timer_s game matches ..0 if score started game matches 0 as @a[tag=game, tag=spawn_cageE] at @s run structure load mystructure:cageD ~-2 ~-2 ~-2
execute if score timer_s game matches ..0 if score started game matches 0 as @a[tag=game, tag=up2] at @s run structure load mystructure:cageD1 ~-5 ~-3 ~-5
execute if score timer_s game matches ..0 if score started game matches 0 if score inventory game matches 1 as @a[tag=game] at @s run function game_functions/setup/load_store_inventory
execute if score timer_s game matches ..0 if score started game matches 0 run gamerule dotiledrops true
execute if score timer_s game matches ..0 if score started game matches 0 run gamerule pvp true
execute if score timer_s game matches ..0 if score started game matches 0 run gamerule keepinventory false
execute if score timer_s game matches 55 if score started game matches 1 run gamerule falldamage true
execute if score timer_s game matches ..0 if score started game matches 0 run gamerule firedamage true
execute if score timer_s game matches ..0 if score started game matches 0 run gamerule freezedamage true
execute if score timer_s game matches ..0 if score started game matches 0 run gamerule naturalregeneration false
execute if score timer_s game matches ..0 if score started game matches 0 run gamerule tntexplodes true
execute if score timer_s game matches ..0 if score started game matches 0 run gamerule showdeathmessages false
execute if score timer_s game matches ..0 if score started game matches 0 run gamemode s @a[tag=game]
execute if score timer_s game matches ..0 if score started game matches 0 run difficulty hard
execute if score timer_s game matches ..0 if score started game matches 0 run inputpermission set @a movement enabled
execute if score timer_s game matches ..0 if score started game matches 0 run scoreboard players set started game 1
# // the rest of the timers
execute if score timer_s game matches ..0 run scoreboard players set timer_s game 60
execute if score timer_m game matches ..0 if score timer_s game matches 1 if score timer_ms game matches 1 run tellraw @a {"rawtext":[{"text": "§6§l§oGAME OVER"}]}
execute if score timer_m game matches ..0 if score timer_s game matches 1 if score timer_ms game matches 1 run tellraw @a {"rawtext":[{"text": "§b"}, {"selector": "@a[tag=game]"}, {"text": " §4Were still alive by the end of the timer, no winners"}]}
execute if score timer_m game matches ..0 if score timer_s game matches 1 if score timer_ms game matches 1 run tellraw @a[tag=game] {"rawtext":[{"text": "§4§o-30 Coins"}]}
execute if score timer_m game matches ..0 if score timer_s game matches 1 if score timer_ms game matches 1 run scoreboard players remove @a[tag=game] coins_storage 30
execute if score timer_m game matches ..0 if score timer_s game matches 1 if score timer_ms game matches 1 run tp @a[tag=game] 0 1 -1
execute if score timer_m game matches ..0 if score timer_s game matches 1 if score timer_ms game matches 1 run function game_functions/reset
# = IF ONLY 1 PLAYER IS LEFT =
execute if score timer_m game matches 1 if score timer_s game matches 1 run weather thunder
execute if score playercount game matches 2 run weather thunder
execute if score playercount game matches 1 run tag @a[tag=game] add win
execute as @a[tag=win] at @s run function game_functions/misc/victory_message
execute as @a[tag=win] at @s run tellraw @s {"rawtext":[{"text": "§e§l+150 Coins"}]}
execute as @a[tag=win] at @s run scoreboard players add @s win_storage 1
execute as @a[tag=win] at @s run scoreboard players add @s coins_storage 150
execute as @a[tag=win] at @s run function game_functions/reset
execute as @a[tag=win] at @s run tp @s 0 1 -1
# = refresh playercount =
scoreboard players set playercount game 0
execute as @a[tag=game] at @s run scoreboard players add playercount game 1
execute if score playercount game matches 0 run function game_functions/reset
# = player perks =
effect @a[tag=vip, tag=game] haste 1 1 true
effect @a[tag=megavip, tag=game] haste 1 2 true
effect @a[tag=megavip, tag=game] health_boost 1 2 true