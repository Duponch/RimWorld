# V460 — Froid et chaleur ressentis

**Qualifiée localement, schéma282 inchangé ; publication en attente, V459 reste publiée.** Ce lot apporte les pensées de situation thermiques des humains sur carte et en caravane. Il suit la [réévaluation transversale](../development/audit-core-20261022.md#réévaluation-après-v459). Les exemples humains ne ferment pas le périmètre ; tous les domaines et interactions Core, les six ensembles, campagnes durables, victoire complète et cible FPS restent ouverts.

## Comportement et référence

Une personne peut avoir froid ou chaud avant de développer une affection. Sa sensation actuelle agit sur la cible d’humeur, selon la température réelle de son emplacement et les vêtements qu’elle porte. Améliorer la tenue, réchauffer une pièce ou la refroidir peut supprimer cette pensée ; la jauge d’humeur garde son évolution progressive et une affection clinique résiduelle garde ses soins/règles distincts.

La [référence primaire dédiée](../research/thermal-mood-v460-reference.md) identifie **Core1.6.4871 rev590**, DLL SHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. ThoughtDefs EnvironmentCold/Hot, workers, Need_Mood, bornes corporelles et isolation ont été relus directement ;18 extractions ciblées privées, assembly inchangée avant/après, aucun code ni asset propriétaire copié. L’[annonce officielle du12octobre2026](https://ludeon.com/blog/2026/10/announcing-the-waylith-engine-and-update-1-7/) distingue principale1.6 et instable1.7. Corpus : pensées/besoins SYS/TEST081 et076–080, habillement055, température126/conditions131, capacités091/096 ; leur lecture et leurs décisions ne valent pas clôture de ces familles.

Pour l’humain, les bornes de base sont16 et26°C. Le froid soustrait l’isolation froide des habits réellement portés à la borne minimale ; le chaud ajoute leur isolation chaude à la borne maximale. Qualité, matière et couches existantes s’appliquent ; l’usure n’est pas transformée en pénalité d’isolation. Un habit en réserve ou dans l’inventaire ne protège pas encore son détenteur. Les armes et objets d’un autre humain ne participent pas.

| Écart hors de la plage confortable effective | Effet de la pensée |
|---|---|
| Aucun, borne exacte incluse | Aucune pensée thermique |
| Strictement positif et inférieur à10°C | −4 |
| De10°C inclus à20°C exclus | −8 |
| De20°C inclus à30°C exclus | −12 |
| Au moins30°C | −16 |

Froid et chaud restent deux familles indépendantes, sans durée de mémoire ni dose accumulée. Les textes sont originaux. Aucun nouveau besoin thermique, précepte d’extension, hediff, bâtiment ou bonus de capacité n’est créé. Les souvenirs **A dormi dans le froid/la chaleur** sont un autre contrat : leur native plage raciale sans isolation portée et leurs échéances de couchage ne sont pas déduites de cette situation ; ils restent ouverts.

## Intégration, propriétaires et coût

La simulation et le dossier Besoins/Humeur utilisent le même lecteur. La phase humaine emprunte une seule `TemperatureView` avec la topologie thermique déjà acquise ; chaque personne lit sa vraie case en O(1), et les températures des régions restent les valeurs physiques vivantes. Ce lecteur sert aussi à l’exposition clinique existante. Le lecteur public mutable utilise la recherche ponctuelle exacte, sans cache conservant une ancienne position ou édition d’air. L’isolation rejoint la boucle des habits déjà nécessaire aux pensées d’usure, sans deuxième parcours global des objets.

La caravane fournit l’air de sa tuile courante par son propriétaire existant. Elle ne réutilise ni chambre, beauté, confort mobilier ou lit du foyer, ni repli21°C. Son repos éveillé ne gèle pas arbitrairement l’humeur. Les archives hors intégration ne sont pas activées par la seule présence de `validWhileDespawned` dans une définition. Les humains conscients à terre, patients et captifs restent admis ; dormir, perdre l’éveil ou être suspendu gèle la jauge selon ses règles existantes. Une pensée lue pendant le sommeil n’est pas une progression de jauge. Un occupant suspendu ne reçoit aucune nouvelle température extérieure fictive.

**Aucun nouvel état persistant, schéma282 conservé.** Le lecteur dérive la pensée de l’air, du port et des capacités déjà représentés. Aucune migration, mémoire, leçon, ressource, date d’exposition, humeur ou consommation PRNG n’est offerte au chargement. Activation seulement dans la famille actuelle fermée282 ; les branches directes historiques et le futur283 restent fermés. Les adaptations locales de température, navigation, cadence d’humeur et caravanes restent déclarées ; ce lot ne copie pas les caches internes natifs.

## Qualification et limites des contrôles

**18 nouveaux cas acquis :8 règles/lectures/UI,9 du propriétaire personnel de caravane et1 boucle physique.** Les tests de caravane sont des préparations bornées d’AwayGroup : ils éprouvent le kernel propriétaire, sans prétendre à une formation, un voyage géographique ou une campagne entière nouvellement joués. Froid/chaud, seuils, vrais habits, qualités/PV/couches/owners, patients conscients, sommeil/inconscience, suspension, affections résiduelles, anciennes branches et lecture sans mutation sont distingués.

La boucle physique prépare une petite carte32², une pièce/toiture initiale4×4 à35°C, un bâtisseur avec besoins et humeur initiaux,75 bois et10 riz finis. Cette préparation ne prétend pas être un incident climatique naturel ni une pièce construite pendant ce parcours. Seul le refroidisseur est ordonné, payé et construit dans la simulation : ordre2000, vraie frame approvisionnée50 bois et travail engagé2077, appareil2100, pensée de chaleur disparue2140 et continuation2160. Air final23,3664°C, humeur74,88 pour cible67 ; aucune affectation instantanée à la cible. Six sauvegardes entières exactes, lecteurs public/résident et continuation20ticks acquis. Aucune recharge d’air, besoin, humeur, stock ou RNG après départ.

La première préparation s’arrêtait avant tout jeu : l’ancien fixture thermique déplaçait le tick à2000 sans initialiser son propriétaire de détérioration. Seule l’ouverture de la nouvelle préparation initialise ce propriétaire au même tick ; échec initial conservé17,998s. Reprise de préparation acquise15,963s, sans correction silencieuse d’un monde déjà joué. Manifeste `tmp/test-runs/v460-physical-cooling-preparation-2026-10-22T18-01-36.105Z-15160/artifacts/thermal-mood-v460/manifest.json`.

**36 cas distincts acquis, dont18 nouveaux et18 voisins.** La sélection voisine conserve deux échecs de l’ancien fichier d’humeur, reproduits sur l’archive indépendante V459 `27845776` : attente des registres mondiaux dans un snapshot public et préparation de migrationV63. Les deux blocs d’échec sont strictement identiques en octets, assertions, valeurs et piles incluses, sans normalisation ; comparaison `tmp/thermal-mood-v460/mood-failure-comparison/`. Archive source/tests/configs31,13Mo, ZIP SHA256 `f1e00cc7ad5a674330b2b7c29e4d94916089c91fe1585818052fd7aaadfa9495`. Les cinq longues campagnes de chaleur inchangées ne sont pas rejouées ; leurs seuils restent dans la sélection. Ces rouges ne sont pas inclus dans les36 réussites. Typages15,951s et14,410s acquis ; gel2454 fichiers servis exact après le parcours natif.

**Chrome155/WebGPU natif acquis90,421s**, effets/musique désactivés et volumes0 avant chaque document/recharge, lancement `--mute-audio`. Entrée : la même frame2077 déjà payée et travaillée dans Node, sans promesse de construction native depuis zéro. Le dossier Besoins/Humeur montre la pensée de chaleur−4, sans changer monde ou humeur en pause. Son propre état de travail est exporté/rechargé exactement ; le bâtisseur termine le vrai refroidisseur182 au2100, puis l’air devient confortable et la pensée disparaît au2140. Son résultat entier est rechargé exactement ;60 images en pause ne modifient rien. Le résultat natif2140 possède exactement le SHA acquis dans Node `4c6670d58792b0caecee39ba9ef0170de74903679daa2a17a9a602349baeee2d`. Deux captures chaud→confortable inspectées ; aucune erreur applicative, notification de mise en page, panne GPU ni simulation arrêtée. L’avertissement Chrome concernant `powerPreference` ignoré sous Windows reste conservé. Rapport `tmp/thermal-mood-v460/native-ui/2026-10-22T18-09-34-682Z/report.json`.

**Coût CPU du lecteur, pas FPS.** Sept alternances de500 appels, sur le même travail2077 et le même soulagement2140, comparent le lecteur V459 de l’archive cohérente au nouveau lecteur avec air partagé et au repli ponctuel.21000 appels mesurés ; pensées anciennes identiques après retrait des seuls IDs thermiques, nouveaux lecteurs entièrement égaux, mondes entiers/RNG/entrées/manifeste/sources inchangés. Aucune simulation ni préparation supplémentaire.

| État réellement acquis | V459 médiane/moyenne, µs par lecture | V460 air partagé, µs | V460 repli ponctuel, µs |
|---|---:|---:|---:|
| Chantier2077, chaud | 2,417 /3,031 | 2,232 /2,993 | 2,299 /2,424 |
| Soulagement2140 | 3,043 /2,904 | 2,678 /2,986 | 3,111 /2,939 |

Les moyennes et maxima restent mixtes (maximum air partagé8,792µs au chantier,5,543µs au soulagement) ; aucun gain global n’en découle. Rapport complet `tmp/thermal-mood-v460/mood-cost-2026-10-22T18-12-21-057Z-16360.json`, import/vues/JSON/hashes hors chronométrage, chauffe bornée40 appels par mode/état. Aucun nouveau FPS, débit physique, confort dense ou campagne achevée n’est annoncé.

## Limites ouvertes

Pensées de sommeil thermique, autres pensées/crises/social, catalogue, production, quêtes, dangers prolongés, aide/création et tous les autres aspects Core restent ouverts. Ce lot ne qualifie pas un nouveau trajet réel de caravane ni toutes les combinaisons de portage/porte/saison : ses lecteurs et producteurs sont reliés aux autorités existantes, avec les préparations et parcours nommés ci-dessus. Une colonie reste la référence de travail ; les historiques, sauvegardes et critères des six ensembles sont conservés.
