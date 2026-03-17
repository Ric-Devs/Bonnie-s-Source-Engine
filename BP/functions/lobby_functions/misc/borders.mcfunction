# = LOBBY =
# // parkour failure zone + rewarding
execute as @a[tag=lobby, tag=!spectator, x=-64, y=-10, z=-64, dx=128, dy=8, dz=128, tag=parkour1, tag=!parkour2, tag=!parkour3, tag=!parkour4] at @s run scoreboard players add @s coins_storage 1
execute as @a[tag=lobby, tag=!spectator, x=-64, y=-10, z=-64, dx=128, dy=8, dz=128, tag=parkour1, tag=parkour2, tag=!parkour3, tag=!parkour4] at @s run scoreboard players add @s coins_storage 6
execute as @a[tag=lobby, tag=!spectator, x=-64, y=-10, z=-64, dx=128, dy=8, dz=128, tag=parkour1, tag=parkour2, tag=parkour3, tag=!parkour4] at @s run scoreboard players add @s coins_storage 24
execute as @a[tag=lobby, tag=!spectator, x=-64, y=-10, z=-64, dx=128, dy=8, dz=128, tag=parkour1, tag=parkour2, tag=parkour3, tag=parkour4] at @s run scoreboard players add @s coins_storage 55
execute as @a[tag=lobby, tag=!spectator, x=-64, y=-10, z=-64, dx=128, dy=8, dz=128, tag=parkour1, tag=!parkour2, tag=!parkour3, tag=!parkour4] at @s run tellraw @s {"rawtext":[{"text": "§e§l+1 Coin §ffor getting this far into the parkour"}]}
execute as @a[tag=lobby, tag=!spectator, x=-64, y=-10, z=-64, dx=128, dy=8, dz=128, tag=parkour1, tag=parkour2, tag=!parkour3, tag=!parkour4] at @s run tellraw @s {"rawtext":[{"text": "§e§l+6 Coins §ffor getting this far into the parkour"}]}
execute as @a[tag=lobby, tag=!spectator, x=-64, y=-10, z=-64, dx=128, dy=8, dz=128, tag=parkour1, tag=parkour2, tag=parkour3, tag=!parkour4] at @s run tellraw @s {"rawtext":[{"text": "§e§l+24 Coins §ffor getting this far into the parkour"}]}
execute as @a[tag=lobby, tag=!spectator, x=-64, y=-10, z=-64, dx=128, dy=8, dz=128, tag=parkour1, tag=parkour2, tag=parkour3, tag=parkour4] at @s run tellraw @s {"rawtext":[{"text": "§e§l+55 Coins §ffor getting this far into the parkour"}]}
execute as @a[tag=lobby, tag=!spectator, x=-64, y=-10, z=-64, dx=128, dy=8, dz=128] at @s run tag @s remove parkour1
execute as @a[tag=lobby, tag=!spectator, x=-64, y=-10, z=-64, dx=128, dy=8, dz=128] at @s run tag @s remove parkour2
execute as @a[tag=lobby, tag=!spectator, x=-64, y=-10, z=-64, dx=128, dy=8, dz=128] at @s run tag @s remove parkour3
execute as @a[tag=lobby, tag=!spectator, x=-64, y=-10, z=-64, dx=128, dy=8, dz=128] at @s run tag @s remove parkour4
execute as @a[tag=lobby, tag=!spectator, x=-64, y=-10, z=-64, dx=128, dy=8, dz=128] at @s run tp @s 18 0 -6 facing 23 1 -6
# = GAME =
# // out of bounds trigger zones
execute as @a[tag=game, x=-63, y=-34, z=-63, dx=128, dy=5, dz=128] at @s run function game_functions/misc/out_of_bounds
execute as @a[tag=game, x=-63, y=-64, z=-63, dx=128, dy=30] at @s run function game_functions/misc/out_of_bounds
execute as @a[tag=game, x=-63, y=-64, z=-63, dy=30, dz=128] at @s run function game_functions/misc/out_of_bounds
execute as @a[tag=game, x=63, y=-64, z=-63, dx=128, dy=30] at @s run function game_functions/misc/out_of_bounds
execute as @a[tag=game, x=-63, y=64, z=63, dy=30, dz=128] at @s run function game_functions/misc/out_of_bounds

# // void kill zone
execute as @a[x=-64, y=-64, z=-64, dx=128, dy=2, dz=128] at @s if score map game matches 1 run kill @s
execute as @a[x=-64, y=-64, z=-64, dx=128, dz=128] at @s if score map game matches 2 run kill @s