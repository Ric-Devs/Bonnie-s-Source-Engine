# = HOST =
execute as @a[tag=lobby, tag=!game, tag=host] at @s if score enabled lobby matches 0 unless entity @s[x=0, y=1, z=-1, dx=0, dy=0, dz=0] unless score game lobby matches -1 run replaceitem entity @s slot.hotbar 8 brr:sk_game_start 1 0 {"minecraft:item_lock":{"mode": "lock_in_slot"}}
execute as @a[tag=lobby, tag=!game, tag=host] at @s if score enabled lobby matches 1 unless entity @s[x=0, y=1, z=-1, dx=0, dy=0, dz=0] unless score game lobby matches -1 run replaceitem entity @s slot.hotbar 8 brr:sk_game_stop 1 0 {"minecraft:item_lock":{"mode": "lock_in_slot"}}
execute as @a[tag=lobby, tag=!game, tag=music_stop, tag=host] at @s unless entity @s[x=0, y=1, z=-1, dx=0, dy=0, dz=0] unless score game lobby matches -1 run replaceitem entity @s slot.hotbar 7 brr:sk_music_yes 1 0 {"minecraft:item_lock":{"mode": "lock_in_slot"}}
execute as @a[tag=lobby, tag=!game, tag=!music_stop, tag=host] at @s unless entity @s[x=0, y=1, z=-1, dx=0, dy=0, dz=0] unless score game lobby matches -1 run replaceitem entity @s slot.hotbar 7 brr:sk_music_no 1 0 {"minecraft:item_lock":{"mode": "lock_in_slot"}}
execute as @a[tag=lobby, tag=!game, tag=host] at @s unless entity @s[x=0, y=1, z=-1, dx=0, dy=0, dz=0] unless score game lobby matches -1 run replaceitem entity @s slot.hotbar 6 brr:sk_store 1 0 {"minecraft:item_lock":{"mode": "lock_in_slot"}}
execute as @a[tag=lobby, tag=!game, tag=host] at @s unless entity @s[x=0, y=1, z=-1, dx=0, dy=0, dz=0] unless score game lobby matches -1 run replaceitem entity @s slot.hotbar 5 brr:sk_settings 1 0 {"minecraft:item_lock":{"mode": "lock_in_slot"}}
execute as @a[tag=lobby, tag=!game, tag=host] at @s unless entity @s[x=0, y=1, z=-1, dx=0, dy=0, dz=0] unless score game lobby matches -1..0 run replaceitem entity @s slot.hotbar 4 brr:sk_spectate 1 0 {"minecraft:item_lock":{"mode": "lock_in_slot"}}
# = NORMAL PLAYERS =
execute as @a[tag=lobby, tag=!game, tag=music_stop, tag=!host] at @s unless entity @s[x=0, y=1, z=-1, dx=0, dy=0, dz=0] unless score game lobby matches -1 run replaceitem entity @s slot.hotbar 8 brr:sk_music_yes 1 0 {"minecraft:item_lock":{"mode": "lock_in_slot"}}
execute as @a[tag=lobby, tag=!game, tag=!music_stop, tag=!host] at @s unless entity @s[x=0, y=1, z=-1, dx=0, dy=0, dz=0] unless score game lobby matches -1 run replaceitem entity @s slot.hotbar 8 brr:sk_music_no 1 0 {"minecraft:item_lock":{"mode": "lock_in_slot"}}
execute as @a[tag=lobby, tag=!game, tag=!host] at @s unless entity @s[x=0, y=1, z=-1, dx=0, dy=0, dz=0] unless score game lobby matches -1 run replaceitem entity @s slot.hotbar 7 brr:sk_store 1 0 {"minecraft:item_lock":{"mode": "lock_in_slot"}}
execute as @a[tag=lobby, tag=!game, tag=!host] at @s unless entity @s[x=0, y=1, z=-1, dx=0, dy=0, dz=0] unless score game lobby matches -1 run replaceitem entity @s slot.hotbar 6 brr:sk_settings 1 0 {"minecraft:item_lock":{"mode": "lock_in_slot"}}
execute as @a[tag=lobby, tag=!game, tag=!host] at @s unless entity @s[x=0, y=1, z=-1, dx=0, dy=0, dz=0] unless score game lobby matches -1..0 run replaceitem entity @s slot.hotbar 5 brr:sk_spectate 1 0 {"minecraft:item_lock":{"mode": "lock_in_slot"}}
# = CLEAR =
execute unless score game lobby matches 1 run clear @a brr:sk_spectate
clear @a[tag=voted] brr:sk_vote_skyblock
clear @a[tag=voted] brr:sk_vote_stoneyhaven

# = dino speecher =
execute as @a[tag=dino, hasitem={ item=brr:dino_speecher, quantity=0}] at @s unless entity @s[x=0, y=1, z=-1, dx=0, dy=0, dz=0] run give @s brr:dino_speecher 1 0 {"minecraft:item_lock":{"mode": "lock_in_inventory"}}
# = VOTING =
execute as @a[tag=lobby, tag=!game, tag=!voted] at @s unless entity @s[x=0, y=1, z=-1, dx=0, dy=0, dz=0] unless score game lobby matches -1 run replaceitem entity @s slot.hotbar 0 brr:sk_vote_skyblock 1 0 {"minecraft:item_lock":{"mode": "lock_in_slot"}}
execute as @a[tag=lobby, tag=!game, tag=!voted] at @s unless entity @s[x=0, y=1, z=-1, dx=0, dy=0, dz=0] unless score game lobby matches -1 run replaceitem entity @s slot.hotbar 1 brr:sk_vote_stoneyhaven 1 0 {"minecraft:item_lock":{"mode": "lock_in_slot"}}
