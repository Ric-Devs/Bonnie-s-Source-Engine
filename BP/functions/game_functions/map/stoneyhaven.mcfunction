# = CENTER =
summon brr:sk_island 0 -64 -1 0 0 * center_island
# = MAIN ISLANDS =
execute as @a[tag=i1] at @s run summon brr:sk_island -35 -60 -1 180 0 * island1
execute as @a[tag=i2] at @s run summon brr:sk_island -27 -60 -25 270 0 * island2
execute as @a[tag=i3] at @s run summon brr:sk_island 1 -60 -33 0 0 * island3
execute as @a[tag=i4] at @s run summon brr:sk_island 25 -60 -25 0 0 * island4
execute as @a[tag=i5] at @s run summon brr:sk_island 32 -60 -2 0 0 * island5
execute as @a[tag=i6] at @s run summon brr:sk_island 24 -60 22 90 0 * island6
execute as @a[tag=i7] at @s run summon brr:sk_island -1 -60 30 180 0 * island7
execute as @a[tag=i8] at @s run summon brr:sk_island -24 -60 23 180 0 * island8
execute as @a[tag=i9] at @s run summon brr:sk_island -53 -60 27 0 180 * island9
execute as @a[tag=i10] at @s run summon brr:sk_island -57 -60 3 270 0 * island10
execute as @a[tag=i11] at @s run summon brr:sk_island -60 -60 -21 270 0 * island11
execute as @a[tag=i12] at @s run summon brr:sk_island -46 -60 -39 0 0 * island12
execute as @a[tag=i13] at @s run summon brr:sk_island -27 -60 -58 270 0 * island13
execute as @a[tag=i14] at @s run summon brr:sk_island 2 -60 -59 0 0 * island14
execute as @a[tag=i15] at @s run summon brr:sk_island 37 -60 -52 0 0 * island15
execute as @a[tag=i16] at @s run summon brr:sk_island 58 -60 24 90 0 * island16
execute as @a[tag=i17] at @s run summon brr:sk_island 41 -60 41 0 0 * island17
execute as @a[tag=i18] at @s run summon brr:sk_island 53 -60 -23 90 0 * island18
execute as @a[tag=i19] at @s run summon brr:sk_island 59 -60 -1 90 0 * island19
execute as @a[tag=i20] at @s run summon brr:sk_island 22 -60 54 90 0 * island20
execute as @a[tag=i21] at @s run summon brr:sk_island 0 -60 59 90 0 * island21
execute as @a[tag=i22] at @s run summon brr:sk_island -25 -60 56 90 0 * island22
execute as @a[tag=i23] at @s run summon brr:sk_island -44 -60 49 90 0 * island23
execute as @a[tag=i24] at @s run summon brr:sk_island 19 -60 -58 90 0 * island24

# // Defining preset rotation of islands
execute as @e[type=brr:sk_island, name=island1] at @s run tag @s add rotation1
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
# = STRUCTURES =
# // Center Island
execute as @e[type=brr:sk_island, name=center_island] at @s run structure load mystructure:StoneyHavenCenter ~-15 ~ ~-14
# // Islands
execute as @e[type=brr:sk_island, tag=!special, name=!center_island] at @s run structure load mystructure:StoneyHaven ~-3 ~ ~-3
execute as @e[type=brr:sk_island, tag=!special, tag=rotation2, name=!center_island] at @s run structure load mystructure:StoneyHaven ~-3 ~ ~-3 90_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation3, name=!center_island] at @s run structure load mystructure:StoneyHaven ~-3 ~ ~-3 180_degrees
execute as @e[type=brr:sk_island, tag=!special, tag=rotation4, name=!center_island] at @s run structure load mystructure:StoneyHaven ~-3 ~ ~-3 270_degrees
# = END =
tp @e[type=brr:sk_island] 0 -128 0
kill @e[type=brr:sk_island]
scoreboard objectives remove map
scoreboard objectives remove random_rotation