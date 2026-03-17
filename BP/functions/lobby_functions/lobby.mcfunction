# = MAIN THINGS =
# // if bro lacks both things
execute as @a[tag=!game, tag=!lobby] at @s run tp @s 0 1 -1
# // if you're standing where you belong
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run clear @s
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run effect @s clear
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run gamemode a @s
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run stopsound @s music.game.skywars
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run tag @s add lobby
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run tag @s remove game
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run tag @s remove spectator
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run tag @s remove i1
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run tag @s remove i2
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run tag @s remove i3
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run tag @s remove i4
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run tag @s remove i5
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run tag @s remove i6
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run tag @s remove i7
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run tag @s remove i8
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run tag @s remove i9
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run tag @s remove i10
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run tag @s remove i11
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run tag @s remove i12
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run tag @s remove i13
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run tag @s remove i14
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run tag @s remove i15
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run tag @s remove i16
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run tag @s remove i17
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run tag @s remove i18
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run tag @s remove i19
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run tag @s remove i20
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run tag @s remove i21
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run tag @s remove i22
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run tag @s remove i23
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run tag @s remove i24
execute as @a[x=0, y=1, z=-1, dx=0, dy=0, dz=0] at @s unless score game lobby matches -1 run tag @s remove win
# // necessary
scoreboard players add @a coins_storage 0
scoreboard players add @a win_storage 0
execute if score game lobby matches 1 run function game_functions/game_run
gamemode spectator @a[tag=spectator]
function lobby_functions/misc/borders
function lobby_functions/misc/actionbar
function lobby_functions/misc/parkour
function lobby_functions/misc/music
function lobby_functions/misc/items
execute if score game lobby matches 1 run effect @a[tag=lobby] weakness 1 255 true
# // store cage importants
execute as @a[tag=copper_airship_cageE] at @s run tag @s add up1
execute as @a[tag=bassalting_floater_cageE] at @s run tag @s add up1
execute as @a[tag=candy_land_cageE] at @s run tag @s add up1
execute as @a[tag=spawn_cageE] at @s run tag @s add up1

execute as @a[tag=antimass_spectrometer_cageE] at @s run tag @s add up2
execute as @a[tag=heavenly_cageE] at @s run tag @s add up2
execute as @a[tag=] at @s run tag @s add up2

execute as @a[tag=!copper_airship_cageE, tag=!bassalting_floater_cageE, tag=!candy_land_cageE, tag=!spawn_cageE] at @s run tag @s remove up1
execute as @a[tag=!antimass_spectrometer_cageE, tag=!heavenly_cageE] at @s run tag @s remove up2
# // scoreboards
execute as @a at @s run scoreboard players operation @s coins = @s coins_storage
execute as @a at @s run scoreboard players operation @s wins = @s win_storage
# // scoreboard display rotation
scoreboard players add display lobby 1
execute if score display lobby matches 200 run scoreboard objectives setdisplay sidebar wins
execute if score display lobby matches 1 run scoreboard objectives setdisplay sidebar coins
execute if score display lobby matches 400.. run scoreboard players reset display lobby
# = GAME INITIATION =
# // intermission timer
execute if score enabled lobby matches 0 if score game lobby matches 0 run scoreboard players set timer_ms lobby 1
execute if score enabled lobby matches 0 if score game lobby matches 0 run scoreboard players set timer_s lobby 21
execute if score enabled lobby matches 1 if score game lobby matches -1..0 run scoreboard players remove timer_ms lobby 1
execute if score timer_ms lobby matches ..0 run scoreboard players remove timer_s lobby 1
execute if score timer_ms lobby matches ..0 run scoreboard players set timer_ms lobby 20
# // timer reaches 0. game starts
execute if score timer_s lobby matches 0 if score timer_ms lobby matches 1 run inputpermission set @a[tag=!stop] movement disabled
execute if score timer_s lobby matches 0 if score timer_ms lobby matches 1 run scoreboard players set game lobby -1
execute if score timer_s lobby matches 0 if score timer_ms lobby matches 1 run function game_functions/setup/players
execute if score timer_s lobby matches 0 if score timer_ms lobby matches 1 run title @a actionbar §2Game is starting!
execute if score timer_s lobby matches 0 if score timer_ms lobby matches 1 run scriptevent brr:vote_winner 
execute if score timer_s lobby matches -1 if score timer_ms lobby matches 1 if score map game matches 1 run function game_functions/map/islands
execute if score timer_s lobby matches -1 if score timer_ms lobby matches 1 if score map game matches 2 run function game_functions/map/stoneyhaven
execute if score timer_s lobby matches -1 if score timer_ms lobby matches 1 run function game_functions/setup/player_tp
execute if score timer_s lobby matches -1 if score timer_ms lobby matches 1 run scoreboard players set timer_s lobby 67
# = HOST ONLY =
execute as @a[tag=host, tag=!game, tag=!spectator] at @s run gamemode c @s


# temporary
tag @a remove equipment_fishing_rod
tag @a remove equipment_fishing_rodE
clear @a writable_book
#tag @a remove armor_netheriteE
#tag @a remove armor_diamondE
#tag @a remove armor_ironE
effect bonnierobloxrip clear slowness