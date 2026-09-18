# Mêlée de base — vérification du 19 septembre 2026

## Périmètre et provenance

Corpus relu : chapitres 13–15, 20–21, règles de contact, anatomie, séparation toucher/esquive ; SYS/TEST-085, 089..091, 098..112, 113..117, UI-009/010. Adopter les interactions physiques et les phases ; adapter navigation et représentation 3D ; différer armures, catalogue d'armes, attaques de terrain, surprises et IA de raid. Les statuts du corpus ne prouvent aucune implémentation locale.

Sources consultées de nouveau :

- [Melee Hit Chance](https://rimworldwiki.com/wiki/Melee_Hit_Chance) et [Melee Dodge Chance](https://rimworldwiki.com/wiki/Melee_Dodge_Chance) : courbes séparées, niveau et capacités. La vérification indiquée sur certaines sections remonte à 1.4 ; pas de certification 1.6.
- [Revolver](https://rimworldwiki.com/wiki/Revolver), [Weapons](https://rimworldwiki.com/wiki/Weapon) et [Blunt weapons](https://rimworldwiki.com/wiki/Blunt_weapons) : coups de crosse/canon et outils naturels, qualités, sélection par catégories. Le revolver normal donne trois attaques à neuf dégâts ; les deux poings à 8,2 restent disponibles. Les coups ont deux secondes Core de récupération. Les multiplicateurs de qualité de mêlée sont distincts du tir.
- [Damage Types](https://rimworldwiki.com/wiki/Damage_Types), [Weapon Guide](https://rimworldwiki.com/wiki/Weapon_Guide) et [Stun](https://rimworldwiki.com/wiki/Stun) : les familles contondantes ne suivent pas les balles. Les fiches divergent sur l'étourdissement et certains détails de propagation ; leur lecture seule ne suffit pas.
- Miroir communautaire de code [Chillu1, commit 2d508035 du 20 mai 2026](https://github.com/Chillu1/RimWorldDecompiled/tree/2d508035082e7cb0c8e29e230d26bda6e546928f) : `Verb_MeleeAttack`, `Verb_MeleeAttackDamage`, `Pawn_MeleeVerbs`, `VerbUtility`, `DamageWorker_Blunt`, `DamageWorker_Stab`, `DamageWorker_Bite`, `Toils_Combat`, `JobDriver_AttackMelee`, `TouchPathEndModeUtility`. Observation d'un miroir tiers, pas d'un exécutable installé ni d'une publication Ludeon. Implémentation locale indépendante, aucun fichier de code du jeu distribué.
- XML historique [RimWorld-Core, 85954e64, 7 septembre 2018](https://github.com/RimWorld-zh/RimWorld-Core/tree/85954e64ea75334f51e33e27a4128809191e430e) : `Races_Humanlike`, `Damages_MeleeWeapon`, `Hediffs_Local_Injuries`. Version ancienne 0.19.2009 : corroboration seulement lorsqu'une source récente converge.

## Décisions et subtilités

Toucher puis esquive, avec capacités distinctes. Une cible allongée/à terre ne les effectue pas ; une posture de tir occupée supprime l'esquive. Pas de bonus d'obscurité ajouté depuis un DLC. Les attaques apprennent avant les jets contre une cible mobile, y compris en cas de raté. Récupération indépendante de l'ordre : arrêt, changement de cible, tir et démobilisation ne la réinitialisent pas.

Les outils sont filtrés par anatomie et arme réellement portée. Les doigts constituent les groupes des poings dans le corps humain étudié ; tête et dents fournissent un repli quand les mains manquent. Leur choix utilise la puissance et la pénétration dans le classement puis des poids de catégorie ; il ne suffit pas d'utiliser toujours l'arme tenue. La mémoire de choix de 60 ticks Core n'a pas d'effet sur nos coups espacés de 120 ticks ; aucun faux état persistant n'est nécessaire pour cette mémoire ici.

Le miroir montre un ralentissement de 95 ticks Core après une tentative, même ratée/esquivée. Il distingue nettement Blunt, Poke et Bite. Blunt transmet un excédent au parent après destruction et peut affecter un os interne direct ; Poke peut atteindre une couche interne avec répartition propre ; Bite utilise la préservation des parties extérieures. Le miroir Stab récent répartit 75 % à l'extérieur et 40 % aux couches internes, contrairement à certains résumés du wiki : décision de suivre ce miroir identifié, à reconfronter à un binaire cible. Le sélectionneur Blunt exclut les yeux.

L'accès diagonal au contact autorise un flanc libre ; le déplacement 3D exige toujours deux flancs. Les portes empêchent le contact à travers leur coin. Les combattants ne doivent pas empiler leurs places d'attaque ; les civils conservent leur profil de transit.

## Incertitudes et écarts explicites

**Durée d'étourdissement calibrée à 45 ticks Core** : Weapon Guide donne 45, Damage Types environ 40, le XML historique 120. Le mécanisme d'arrêt est livré mais sa parité numérique n'est pas certifiée. Les chances de branche tête/torse suivent le miroir et les courbes historiques ; confirmation sur une définition Core actuelle encore souhaitée.

La précision des blessures est le milli-PV entier de notre moteur. Adultes naturels sans vêtements/armures, facteur de dégâts entrant neutre et sans protection personnalisée contre mort instantanée : même frontière que les balles. Morsures traitables, mais infections absentes comme pour les autres plaies. Pas d'attaques sur bâtiments, d'exécution, de combat social, d'implant, de jet de terre/eau (branche spécifique du terrain), de surprise ni de catalogue militaire complet. Ces absences restent des fonctionnalités à réaliser, pas des synonymes de conformité complète.

La sentinelle répond au contact et cesse l'engagement quand sa cible s'éloigne ; le colon poursuit la cible de son ordre explicite. L'acquisition/poursuite tactique générale et le tir automatique des mobilisés restent le prochain lot. L'animation est une interprétation low poly GPU et ne produit aucun dégât.
