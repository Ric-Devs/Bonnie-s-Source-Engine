music stop
execute as @a[tag=dino, hasitem={ item=brr:dino_speecher, quantity=0}] at @s run give @s brr:dino_speecher 1 0 {"minecraft:item_lock":{"mode": "lock_in_inventory"}}
gamemode c @a[tag=host, tag=!game, tag=!spectator]
tp @a[tag=!game, tag=!lobby] 0 1 -1