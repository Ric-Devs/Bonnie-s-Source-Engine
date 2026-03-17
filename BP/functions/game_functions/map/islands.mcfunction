# = CENTER =
summon brr:sk_island 0 -60 -1 0 0 * center_island
# = MAIN ISLANDS =
execute as @a[tag=i1] at @s run summon brr:sk_island -2 -60 20 180 0 * island1
execute as @a[tag=i2] at @s run summon brr:sk_island -22 -60 20 270 0 * island2
execute as @a[tag=i3] at @s run summon brr:sk_island -22 -60 0 0 0 * island3
execute as @a[tag=i4] at @s run summon brr:sk_island -22 -60 -23 0 0 * island4
execute as @a[tag=i5] at @s run summon brr:sk_island 1 -60 -23 0 0 * island5
execute as @a[tag=i6] at @s run summon brr:sk_island 21 -60 -23 90 0 * island6
execute as @a[tag=i7] at @s run summon brr:sk_island 21 -60 -3 180 0 * island7
execute as @a[tag=i8] at @s run summon brr:sk_island 21 -60 20 180 0 * island8
execute as @a[tag=i9] at @s run summon brr:sk_island -2 -60 43 0 180 * island9
execute as @a[tag=i10] at @s run summon brr:sk_island -22 -60 43 270 0 * island10
execute as @a[tag=i11] at @s run summon brr:sk_island -45 -60 43 270 0 * island11
execute as @a[tag=i12] at @s run summon brr:sk_island -45 -60 20 0 0 * island12
execute as @a[tag=i13] at @s run summon brr:sk_island -45 -60 0 270 0 * island13
execute as @a[tag=i14] at @s run summon brr:sk_island -45 -60 -23 0 0 * island14
execute as @a[tag=i15] at @s run summon brr:sk_island -45 -60 -46 0 0 * island15
execute as @a[tag=i16] at @s run summon brr:sk_island -22 -60 -46 90 0 * island16
execute as @a[tag=i17] at @s run summon brr:sk_island 1 -60 -46 0 0 * island17
execute as @a[tag=i18] at @s run summon brr:sk_island 21 -60 -46 90 0 * island18
execute as @a[tag=i19] at @s run summon brr:sk_island 44 -60 -46 90 0 * island19
execute as @a[tag=i20] at @s run summon brr:sk_island 44 -60 -23 90 0 * island20
execute as @a[tag=i21] at @s run summon brr:sk_island 44 -60 -3 180 0 * island21
execute as @a[tag=i22] at @s run summon brr:sk_island 44 -60 20 90 0 * island22
execute as @a[tag=i23] at @s run summon brr:sk_island 44 -60 43 180 0 * island23
execute as @a[tag=i24] at @s run summon brr:sk_island 21 -60 43 270 0 * island24
# // Defining preset rotation of islands
execute as @e[type=brr:sk_island, name=island1] at @s run tag @s add rotation3
execute as @e[type=brr:sk_island, name=island2] at @s run tag @s add rotation4
execute as @e[type=brr:sk_island, name=island3] at @s run tag @s add rotation1
execute as @e[type=brr:sk_island, name=island4] at @s run tag @s add rotation1
execute as @e[type=brr:sk_island, name=island5] at @s run tag @s add rotation1
execute as @e[type=brr:sk_island, name=island6] at @s run tag @s add rotation2
execute as @e[type=brr:sk_island, name=island7] at @s run tag @s add rotation3
execute as @e[type=brr:sk_island, name=island8] at @s run tag @s add rotation3
execute as @e[type=brr:sk_island, name=island9] at @s run tag @s add rotation3
execute as @e[type=brr:sk_island, name=island10] at @s run tag @s add rotation4
execute as @e[type=brr:sk_island, name=island11] at @s run tag @s add rotation4
execute as @e[type=brr:sk_island, name=island12] at @s run tag @s add rotation1
execute as @e[type=brr:sk_island, name=island13] at @s run tag @s add rotation4
execute as @e[type=brr:sk_island, name=island14] at @s run tag @s add rotation1
execute as @e[type=brr:sk_island, name=island15] at @s run tag @s add rotation1
execute as @e[type=brr:sk_island, name=island16] at @s run tag @s add rotation2
execute as @e[type=brr:sk_island, name=island17] at @s run tag @s add rotation1
execute as @e[type=brr:sk_island, name=island18] at @s run tag @s add rotation2
execute as @e[type=brr:sk_island, name=island19] at @s run tag @s add rotation2
execute as @e[type=brr:sk_island, name=island20] at @s run tag @s add rotation2
execute as @e[type=brr:sk_island, name=island21] at @s run tag @s add rotation3
execute as @e[type=brr:sk_island, name=island22] at @s run tag @s add rotation2
execute as @e[type=brr:sk_island, name=island23] at @s run tag @s add rotation3
execute as @e[type=brr:sk_island, name=island24] at @s run tag @s add rotation4
# = RANDOMIZER =
scoreboard objectives add map dummy
scoreboard objectives add random_rotation dummy
execute as @e[type=brr:sk_island] at @s run scoreboard players random @s map 1 12
execute as @e[type=brr:sk_island, name=center_island] at @s run scoreboard players random @s random_rotation 1 4
execute as @e[type=brr:sk_island, name=center_island, scores={random_rotation=1}] at @s run tag @s add rotation1
execute as @e[type=brr:sk_island, name=center_island, scores={random_rotation=2}] at @s run tag @s add rotation2
execute as @e[type=brr:sk_island, name=center_island, scores={random_rotation=3}] at @s run tag @s add rotation3
execute as @e[type=brr:sk_island, name=center_island, scores={random_rotation=4}] at @s run tag @s add rotation4
scoreboard players random special1 random_rotation 1 15
scoreboard players random special2 random_rotation 1 15
scoreboard players random special3 random_rotation 1 15
scoreboard players random special4 random_rotation 1 15
# = STRUCTURES =
# // Center Island
execute as @e[type=brr:sk_island, tag=rotation1, name=center_island] at @s run structure load mystructure:Center ~-3 ~4 ~-3
execute as @e[type=brr:sk_island, tag=rotation2, name=center_island] at @s run structure load mystructure:Center ~-3 ~4 ~-3 90_degrees
execute as @e[type=brr:sk_island, tag=rotation3, name=center_island] at @s run structure load mystructure:Center ~-3 ~4 ~-3 180_degrees
execute as @e[type=brr:sk_island, tag=rotation4, name=center_island] at @s run structure load mystructure:Center ~-3 ~4 ~-3 270_degrees
execute as @e[type=brr:sk_island, tag=rotation1, name=center_island, scores={map=1}] at @s run structure load mystructure:Center1 ~-3 ~ ~-3
execute as @e[type=brr:sk_island, tag=rotation2, name=center_island, scores={map=1}] at @s run structure load mystructure:Center1 ~-3 ~ ~-3 90_degrees
execute as @e[type=brr:sk_island, tag=rotation3, name=center_island, scores={map=1}] at @s run structure load mystructure:Center1 ~-3 ~ ~-3 180_degrees
execute as @e[type=brr:sk_island, tag=rotation4, name=center_island, scores={map=1}] at @s run structure load mystructure:Center1 ~-3 ~ ~-3 270_degrees
execute as @e[type=brr:sk_island, tag=rotation1, name=center_island, scores={map=2}] at @s run structure load mystructure:Center2 ~-3 ~ ~-3
execute as @e[type=brr:sk_island, tag=rotation2, name=center_island, scores={map=2}] at @s run structure load mystructure:Center2 ~-3 ~ ~-3 90_degrees
execute as @e[type=brr:sk_island, tag=rotation3, name=center_island, scores={map=2}] at @s run structure load mystructure:Center2 ~-3 ~ ~-3 180_degrees
execute as @e[type=brr:sk_island, tag=rotation4, name=center_island, scores={map=2}] at @s run structure load mystructure:Center2 ~-3 ~ ~-3 270_degrees
execute as @e[type=brr:sk_island, tag=rotation1, name=center_island, scores={map=3}] at @s run structure load mystructure:Center3 ~-3 ~ ~-3
execute as @e[type=brr:sk_island, tag=rotation2, name=center_island, scores={map=3}] at @s run structure load mystructure:Center3 ~-3 ~ ~-3 90_degrees
execute as @e[type=brr:sk_island, tag=rotation3, name=center_island, scores={map=3}] at @s run structure load mystructure:Center3 ~-3 ~ ~-3 180_degrees
execute as @e[type=brr:sk_island, tag=rotation4, name=center_island, scores={map=3}] at @s run structure load mystructure:Center3 ~-3 ~ ~-3 270_degrees
execute as @e[type=brr:sk_island, tag=rotation1, name=center_island, scores={map=4}] at @s run structure load mystructure:Center4 ~-3 ~ ~-3
execute as @e[type=brr:sk_island, tag=rotation2, name=center_island, scores={map=4}] at @s run structure load mystructure:Center4 ~-3 ~ ~-3 90_degrees
execute as @e[type=brr:sk_island, tag=rotation3, name=center_island, scores={map=4}] at @s run structure load mystructure:Center4 ~-3 ~ ~-3 180_degrees
execute as @e[type=brr:sk_island, tag=rotation4, name=center_island, scores={map=4}] at @s run structure load mystructure:Center4 ~-3 ~ ~-3 270_degrees
execute as @e[type=brr:sk_island, tag=rotation1, name=center_island, scores={map=5}] at @s run structure load mystructure:Center5 ~-3 ~ ~-3
execute as @e[type=brr:sk_island, tag=rotation2, name=center_island, scores={map=5}] at @s run structure load mystructure:Center5 ~-3 ~ ~-3 90_degrees
execute as @e[type=brr:sk_island, tag=rotation3, name=center_island, scores={map=5}] at @s run structure load mystructure:Center5 ~-3 ~ ~-3 180_degrees
execute as @e[type=brr:sk_island, tag=rotation4, name=center_island, scores={map=5}] at @s run structure load mystructure:Center5 ~-3 ~ ~-3 270_degrees
execute as @e[type=brr:sk_island, tag=rotation1, name=center_island, scores={map=6}] at @s run structure load mystructure:Center6 ~-3 ~ ~-3
execute as @e[type=brr:sk_island, tag=rotation2, name=center_island, scores={map=6}] at @s run structure load mystructure:Center6 ~-3 ~ ~-3 90_degrees
execute as @e[type=brr:sk_island, tag=rotation3, name=center_island, scores={map=6}] at @s run structure load mystructure:Center6 ~-3 ~ ~-3 180_degrees
execute as @e[type=brr:sk_island, tag=rotation4, name=center_island, scores={map=6}] at @s run structure load mystructure:Center6 ~-3 ~ ~-3 270_degrees
execute as @e[type=brr:sk_island, tag=rotation1, name=center_island, scores={map=7}] at @s run structure load mystructure:Center7 ~-3 ~ ~-3
execute as @e[type=brr:sk_island, tag=rotation2, name=center_island, scores={map=7}] at @s run structure load mystructure:Center7 ~-3 ~ ~-3 90_degrees
execute as @e[type=brr:sk_island, tag=rotation3, name=center_island, scores={map=7}] at @s run structure load mystructure:Center7 ~-3 ~ ~-3 180_degrees
execute as @e[type=brr:sk_island, tag=rotation4, name=center_island, scores={map=7}] at @s run structure load mystructure:Center7 ~-3 ~ ~-3 270_degrees
execute as @e[type=brr:sk_island, tag=rotation1, name=center_island, scores={map=8}] at @s run structure load mystructure:Center8 ~-3 ~ ~-3
execute as @e[type=brr:sk_island, tag=rotation2, name=center_island, scores={map=8}] at @s run structure load mystructure:Center8 ~-3 ~ ~-3 90_degrees
execute as @e[type=brr:sk_island, tag=rotation3, name=center_island, scores={map=8}] at @s run structure load mystructure:Center8 ~-3 ~ ~-3 180_degrees
execute as @e[type=brr:sk_island, tag=rotation4, name=center_island, scores={map=8}] at @s run structure load mystructure:Center8 ~-3 ~ ~-3 270_degrees
execute as @e[type=brr:sk_island, tag=rotation1, name=center_island, scores={map=9}] at @s run structure load mystructure:Center9 ~-3 ~ ~-3
execute as @e[type=brr:sk_island, tag=rotation2, name=center_island, scores={map=9}] at @s run structure load mystructure:Center9 ~-3 ~ ~-3 90_degrees
execute as @e[type=brr:sk_island, tag=rotation3, name=center_island, scores={map=9}] at @s run structure load mystructure:Center9 ~-3 ~ ~-3 180_degrees
execute as @e[type=brr:sk_island, tag=rotation4, name=center_island, scores={map=9}] at @s run structure load mystructure:Center9 ~-3 ~ ~-3 270_degrees
execute as @e[type=brr:sk_island, tag=rotation1, name=center_island, scores={map=10}] at @s run structure load mystructure:Center10 ~-3 ~ ~-3
execute as @e[type=brr:sk_island, tag=rotation2, name=center_island, scores={map=10}] at @s run structure load mystructure:Center10 ~-3 ~ ~-3 90_degrees
execute as @e[type=brr:sk_island, tag=rotation3, name=center_island, scores={map=10}] at @s run structure load mystructure:Center10 ~-3 ~ ~-3 180_degrees
execute as @e[type=brr:sk_island, tag=rotation4, name=center_island, scores={map=10}] at @s run structure load mystructure:Center10 ~-3 ~ ~-3 270_degrees
execute as @e[type=brr:sk_island, tag=rotation1, name=center_island, scores={map=11}] at @s run structure load mystructure:Center11 ~-3 ~ ~-3
execute as @e[type=brr:sk_island, tag=rotation2, name=center_island, scores={map=11}] at @s run structure load mystructure:Center11 ~-3 ~ ~-3 90_degrees
execute as @e[type=brr:sk_island, tag=rotation3, name=center_island, scores={map=11}] at @s run structure load mystructure:Center11 ~-3 ~ ~-3 180_degrees
execute as @e[type=brr:sk_island, tag=rotation4, name=center_island, scores={map=11}] at @s run structure load mystructure:Center11 ~-3 ~ ~-3 270_degrees
execute as @e[type=brr:sk_island, tag=rotation1, name=center_island, scores={map=12}] at @s run structure load mystructure:Center12 ~-3 ~ ~-3
execute as @e[type=brr:sk_island, tag=rotation2, name=center_island, scores={map=12}] at @s run structure load mystructure:Center12 ~-3 ~ ~-3 90_degrees
execute as @e[type=brr:sk_island, tag=rotation3, name=center_island, scores={map=12}] at @s run structure load mystructure:Center12 ~-3 ~ ~-3 180_degrees
execute as @e[type=brr:sk_island, tag=rotation4, name=center_island, scores={map=12}] at @s run structure load mystructure:Center12 ~-3 ~ ~-3 270_degrees
# // Islands
execute as @e[type=brr:sk_island, tag=!special, name=!center_island] at @s run structure load mystructure:IslandsTop ~-2 ~4 ~-2
execute as @e[type=brr:sk_island, tag=!special, tag=rotation2, name=!center_island] at @s run structure load mystructure:IslandsTop ~-2 ~4 ~-2 90_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation3, name=!center_island] at @s run structure load mystructure:IslandsTop ~-2 ~4 ~-2 180_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation4, name=!center_island] at @s run structure load mystructure:IslandsTop ~-2 ~4 ~-2 270_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation1, name=!center_island, scores={map=1}] at @s run structure load mystructure:Island1 ~-2 ~ ~-2
execute as @e[type=brr:sk_island, tag=!special, tag=rotation2, name=!center_island, scores={map=1}] at @s run structure load mystructure:Island1 ~-2 ~ ~-2 90_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation3, name=!center_island, scores={map=1}] at @s run structure load mystructure:Island1 ~-2 ~ ~-2 180_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation4, name=!center_island, scores={map=1}] at @s run structure load mystructure:Island1 ~-2 ~ ~-2 270_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation1, name=!center_island, scores={map=2}] at @s run structure load mystructure:Island2 ~-2 ~ ~-2
execute as @e[type=brr:sk_island, tag=!special, tag=rotation2, name=!center_island, scores={map=2}] at @s run structure load mystructure:Island2 ~-2 ~ ~-2 90_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation3, name=!center_island, scores={map=2}] at @s run structure load mystructure:Island2 ~-2 ~ ~-2 180_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation4, name=!center_island, scores={map=2}] at @s run structure load mystructure:Island2 ~-2 ~ ~-2 270_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation1, name=!center_island, scores={map=3}] at @s run structure load mystructure:Island3 ~-2 ~ ~-2
execute as @e[type=brr:sk_island, tag=!special, tag=rotation2, name=!center_island, scores={map=3}] at @s run structure load mystructure:Island3 ~-2 ~ ~-2 90_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation3, name=!center_island, scores={map=3}] at @s run structure load mystructure:Island3 ~-2 ~ ~-2 180_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation4, name=!center_island, scores={map=3}] at @s run structure load mystructure:Island3 ~-2 ~ ~-2 270_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation1, name=!center_island, scores={map=4}] at @s run structure load mystructure:Island4 ~-2 ~ ~-2
execute as @e[type=brr:sk_island, tag=!special, tag=rotation2, name=!center_island, scores={map=4}] at @s run structure load mystructure:Island4 ~-2 ~ ~-2 90_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation3, name=!center_island, scores={map=4}] at @s run structure load mystructure:Island4 ~-2 ~ ~-2 180_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation4, name=!center_island, scores={map=4}] at @s run structure load mystructure:Island4 ~-2 ~ ~-2 270_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation1, name=!center_island, scores={map=5}] at @s run structure load mystructure:Island5 ~-2 ~ ~-2
execute as @e[type=brr:sk_island, tag=!special, tag=rotation2, name=!center_island, scores={map=5}] at @s run structure load mystructure:Island5 ~-2 ~ ~-2 90_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation3, name=!center_island, scores={map=5}] at @s run structure load mystructure:Island5 ~-2 ~ ~-2 180_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation4, name=!center_island, scores={map=5}] at @s run structure load mystructure:Island5 ~-2 ~ ~-2 270_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation1, name=!center_island, scores={map=6}] at @s run structure load mystructure:Island6 ~-2 ~ ~-2
execute as @e[type=brr:sk_island, tag=!special, tag=rotation2, name=!center_island, scores={map=6}] at @s run structure load mystructure:Island6 ~-2 ~ ~-2 90_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation3, name=!center_island, scores={map=6}] at @s run structure load mystructure:Island6 ~-2 ~ ~-2 180_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation4, name=!center_island, scores={map=6}] at @s run structure load mystructure:Island6 ~-2 ~ ~-2 270_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation1, name=!center_island, scores={map=7}] at @s run structure load mystructure:Island7 ~-2 ~ ~-2
execute as @e[type=brr:sk_island, tag=!special, tag=rotation2, name=!center_island, scores={map=7}] at @s run structure load mystructure:Island7 ~-2 ~ ~-2 90_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation3, name=!center_island, scores={map=7}] at @s run structure load mystructure:Island7 ~-2 ~ ~-2 180_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation4, name=!center_island, scores={map=7}] at @s run structure load mystructure:Island7 ~-2 ~ ~-2 270_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation1, name=!center_island, scores={map=8}] at @s run structure load mystructure:Island8 ~-2 ~ ~-2
execute as @e[type=brr:sk_island, tag=!special, tag=rotation2, name=!center_island, scores={map=8}] at @s run structure load mystructure:Island8 ~-2 ~ ~-2 90_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation3, name=!center_island, scores={map=8}] at @s run structure load mystructure:Island8 ~-2 ~ ~-2 180_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation4, name=!center_island, scores={map=8}] at @s run structure load mystructure:Island8 ~-2 ~ ~-2 270_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation1, name=!center_island, scores={map=9}] at @s run structure load mystructure:Island9 ~-2 ~ ~-2
execute as @e[type=brr:sk_island, tag=!special, tag=rotation2, name=!center_island, scores={map=9}] at @s run structure load mystructure:Island9 ~-2 ~ ~-2 90_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation3, name=!center_island, scores={map=9}] at @s run structure load mystructure:Island9 ~-2 ~ ~-2 180_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation4, name=!center_island, scores={map=9}] at @s run structure load mystructure:Island9 ~-2 ~ ~-2 270_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation1, name=!center_island, scores={map=10}] at @s run structure load mystructure:Island10 ~-2 ~ ~-2
execute as @e[type=brr:sk_island, tag=!special, tag=rotation2, name=!center_island, scores={map=10}] at @s run structure load mystructure:Island10 ~-2 ~ ~-2 90_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation3, name=!center_island, scores={map=10}] at @s run structure load mystructure:Island10 ~-2 ~ ~-2 180_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation4, name=!center_island, scores={map=10}] at @s run structure load mystructure:Island10 ~-2 ~ ~-2 270_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation1, name=!center_island, scores={map=11}] at @s run structure load mystructure:Island11 ~-2 ~ ~-2
execute as @e[type=brr:sk_island, tag=!special, tag=rotation2, name=!center_island, scores={map=11}] at @s run structure load mystructure:Island11 ~-2 ~ ~-2 90_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation3, name=!center_island, scores={map=11}] at @s run structure load mystructure:Island11 ~-2 ~ ~-2 180_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation4, name=!center_island, scores={map=11}] at @s run structure load mystructure:Island11 ~-2 ~ ~-2 270_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation1, name=!center_island, scores={map=12}] at @s run structure load mystructure:Island12 ~-2 ~ ~-2
execute as @e[type=brr:sk_island, tag=!special, tag=rotation2, name=!center_island, scores={map=12}] at @s run structure load mystructure:Island12 ~-2 ~ ~-2 90_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation3, name=!center_island, scores={map=12}] at @s run structure load mystructure:Island12 ~-2 ~ ~-2 180_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation4, name=!center_island, scores={map=12}] at @s run structure load mystructure:Island12 ~-2 ~ ~-2 270_degrees
# // special island 1
structure load mystructure:Special 12 -60 -11
execute if score special1 random_rotation matches 1 run structure load mystructure:Special1 13 -55 -10
execute if score special1 random_rotation matches 2 run structure load mystructure:Special2 13 -55 -10
execute if score special1 random_rotation matches 3 run structure load mystructure:Special3 13 -55 -10
execute if score special1 random_rotation matches 4 run structure load mystructure:Special4 13 -55 -10
execute if score special1 random_rotation matches 5 run structure load mystructure:Special5 13 -55 -10
execute if score special1 random_rotation matches 6 run structure load mystructure:Special6 13 -55 -10
execute if score special1 random_rotation matches 7 run structure load mystructure:Special7 13 -55 -10
execute if score special1 random_rotation matches 8 run structure load mystructure:Special8 13 -55 -10
execute if score special1 random_rotation matches 9 run structure load mystructure:Special9 13 -55 -10
execute if score special1 random_rotation matches 10 run structure load mystructure:Special10 13 -55 -10
execute if score special1 random_rotation matches 11 run structure load mystructure:Special11 13 -55 -10
execute if score special1 random_rotation matches 12 run structure load mystructure:Special12 13 -55 -10
execute if score special1 random_rotation matches 13 run structure load mystructure:Special13 13 -55 -10
execute if score special1 random_rotation matches 14 run structure load mystructure:Special14 13 -55 -10
execute if score special1 random_rotation matches 15 run structure load mystructure:Special15 13 -55 -10
# // special island 2
structure load mystructure:Special 12 -60 9
execute if score special2 random_rotation matches 1 run structure load mystructure:Special1 13 -55 10
execute if score special2 random_rotation matches 2 run structure load mystructure:Special2 13 -55 10
execute if score special2 random_rotation matches 3 run structure load mystructure:Special3 13 -55 10
execute if score special2 random_rotation matches 4 run structure load mystructure:Special4 13 -55 10
execute if score special2 random_rotation matches 5 run structure load mystructure:Special5 13 -55 10
execute if score special2 random_rotation matches 6 run structure load mystructure:Special6 13 -55 10
execute if score special2 random_rotation matches 7 run structure load mystructure:Special7 13 -55 10
execute if score special2 random_rotation matches 8 run structure load mystructure:Special8 13 -55 10
execute if score special2 random_rotation matches 9 run structure load mystructure:Special9 13 -55 10
execute if score special2 random_rotation matches 10 run structure load mystructure:Special10 13 -55 10
execute if score special2 random_rotation matches 11 run structure load mystructure:Special11 13 -55 10
execute if score special2 random_rotation matches 12 run structure load mystructure:Special12 13 -55 10
execute if score special2 random_rotation matches 13 run structure load mystructure:Special13 13 -55 10
execute if score special2 random_rotation matches 14 run structure load mystructure:Special14 13 -55 10
execute if score special2 random_rotation matches 15 run structure load mystructure:Special15 13 -55 10
# // special island 3
structure load mystructure:Special -12 -60 9
execute if score special3 random_rotation matches 1 run structure load mystructure:Special1 -11 -55 10
execute if score special3 random_rotation matches 2 run structure load mystructure:Special2 -11 -55 10
execute if score special3 random_rotation matches 3 run structure load mystructure:Special3 -11 -55 10
execute if score special3 random_rotation matches 4 run structure load mystructure:Special4 -11 -55 10
execute if score special3 random_rotation matches 5 run structure load mystructure:Special5 -11 -55 10
execute if score special3 random_rotation matches 6 run structure load mystructure:Special6 -11 -55 10
execute if score special3 random_rotation matches 7 run structure load mystructure:Special7 -11 -55 10
execute if score special3 random_rotation matches 8 run structure load mystructure:Special8 -11 -55 10
execute if score special3 random_rotation matches 9 run structure load mystructure:Special9 -11 -55 10
execute if score special3 random_rotation matches 10 run structure load mystructure:Special10 -11 -55 10
execute if score special3 random_rotation matches 11 run structure load mystructure:Special11 -11 -55 10
execute if score special3 random_rotation matches 12 run structure load mystructure:Special12 -11 -55 10
execute if score special3 random_rotation matches 13 run structure load mystructure:Special13 -11 -55 10
execute if score special3 random_rotation matches 14 run structure load mystructure:Special14 -11 -55 10
execute if score special3 random_rotation matches 15 run structure load mystructure:Special15 -11 -55 10
# // special island 4
structure load mystructure:Special -12 -60 -11
execute if score special4 random_rotation matches 1 run structure load mystructure:Special1 -11 -55 -10
execute if score special4 random_rotation matches 2 run structure load mystructure:Special2 -11 -55 -10
execute if score special4 random_rotation matches 3 run structure load mystructure:Special3 -11 -55 -10
execute if score special4 random_rotation matches 4 run structure load mystructure:Special4 -11 -55 -10
execute if score special4 random_rotation matches 5 run structure load mystructure:Special5 -11 -55 -10
execute if score special4 random_rotation matches 6 run structure load mystructure:Special6 -11 -55 -10
execute if score special4 random_rotation matches 7 run structure load mystructure:Special7 -11 -55 -10
execute if score special4 random_rotation matches 8 run structure load mystructure:Special8 -11 -55 -10
execute if score special4 random_rotation matches 9 run structure load mystructure:Special9 -11 -55 -10
execute if score special4 random_rotation matches 10 run structure load mystructure:Special10 -11 -55 -10
execute if score special4 random_rotation matches 11 run structure load mystructure:Special11 -11 -55 -10
execute if score special4 random_rotation matches 12 run structure load mystructure:Special12 -11 -55 -10
execute if score special4 random_rotation matches 13 run structure load mystructure:Special13 -11 -55 -10
execute if score special4 random_rotation matches 14 run structure load mystructure:Special14 -11 -55 -10
execute if score special4 random_rotation matches 15 run structure load mystructure:Special15 -11 -55 -10
# = END =
tp @e[type=brr:sk_island] 0 -128 0
kill @e[type=brr:sk_island]
scoreboard objectives remove map
scoreboard objectives remove random_rotation