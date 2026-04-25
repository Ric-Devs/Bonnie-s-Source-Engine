# = friends who need this item =
tag DinoDaniel21 add dino
tag FairerManx63002 add dino
tag FreeRocket90634 add dino
tag Marshmallow997 add dino
# = the part which gives the item =
execute as @a[tag=dino, hasitem={ item=brr:dino_speecher, quantity=0}] at @s run give @s brr:dino_speecher 1 0 {"minecraft:item_lock":{"mode": "lock_in_inventory"}}
# = other quirks for myself =
#gamemode c @a[tag=host, tag=!game, tag=!spectator]
#tp @a[tag=!lobby, tag=!game] 0 1 -1