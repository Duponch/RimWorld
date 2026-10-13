# V348 — Dégagement, sols et remplacement des plans

14 octobre 2026. Schéma234 conservé. Lot de correctifs engagé après le commit/push V347 `2196efdf`, à la nouvelle demande humaine ; les autres corrections de plantes, transport et décor restent à poursuivre. **Qualification ciblée acquise**, typage de livraison PASS12,104s, documentation PASS1,448s, gel2883exact et quatre captures inspectées ; prêt au commit/push. Ce lot ne reconstitue pas les deux sauvegardes humaines montrées en capture.

## Comportement corrigé

Un chantier sur un arbre immature avançait son dégagement puis appelait toujours CHOP. Ce producteur refuse une récolte prématurée ; le chantier libérait sa réservation et recommençait à zéro. À la résolution réelle, `clearingKind` choisit désormais CHOP seulement si l'arbre est récoltable, CUT sinon. L'arbre reste physique jusqu'à la fin du travail ; aucune sortie bois prématurée, aucune destruction au placement du fantôme. Durée locale100 et progression fractionnaire conservées ; une maturation durant la coupe réemploie le producteur mûr avec son rendement, son placement et son RNG.

Un nouveau plan de sol ignore grass, tall-grass, brambles et moss, quatre petites plantes sans produit attestées dans Core. Elles restent présentes pendant le transport et la pose, puis disparaissent à la finition réellement payée du sol. Le producteur commun libère leurs éventuels repas végétaux et références rivales ; tous les refus de recette ou terrain précèdent ce retrait. Une ancienne clearance déjà acceptée garde son travail et sa durée60. Arbres, agave, cultures et autres plantes gardent leur chaîne existante ; ce lot ne prétend pas transposer tout le seuil harvestWork Core pour tous les ouvrages.

Porte et porte automatique peuvent remplacer un **blueprint mural impayé 1×1**. Préflight pur commun à la prévisualisation et à l'application : matières, recherche, autres obstacles, identités et un seul plan de dépôts physique pour mur et zones. Le mur est ensuite retiré, ses acteurs/queues/réservations/mandats propres libérés et une seule nouvelle intention est créée. La porte paie sa recette ordinaire. Un cargo porté sur une arête de déplacement engagée bloque non mutativement ce remplacement ; un frame fourni ou mur construit reste protégé. Aucune restitution de matériaux inexistants ni remplacement gratuit du bâti.

## Activités et jauges

Le texte d'activité indique le dégagement de la plante, sa progression réelle et l'approche, puis le travail du chantier. Le diagnostic multicase résout le resourceId effectivement réservé, sans prendre la première autre plante de l'emprise. Recherche, foreuse/scanner et formation/reprise de voyages ont un libellé spécifique lorsqu'ils atteignaient le repli générique « Au travail ». L'image de Tao ne donne pas son état moteur exact ; aucune reproduction de cette personne n'est revendiquée.

Jauges ajoutées à des compteurs déjà persistés : inhumation50, alimentation animale75, chirurgie2000 ou seuil1000/1500 de la prothèse réelle, port/retrait de vêtements à durée capturée, dépose d'arme3 et services de combustible/réarmement. La recherche affiche les points du **projet global** face à son coût, comme le driver Core, plutôt qu'un timer fictif individuel. Le lecteur `readProjectProgress` n'initialise aucun record historique. Approche, transport, recherche de gisements sans fin déterministe et prise d'arme instantanée n'acquièrent pas de fausse durée. Les jauges gardent les poses GPU et le seuil de visibilité existants ; aucun parcours RAF d'acteurs ajouté.

Le bouton enfant Inspecter est retiré d'Ordres. Catalogue/slot d'atlas, pictogramme de son titre et sélection native par carte/Échap/clic droit restent conservés.

## Référence et adaptations

Recherche primaire locale Core1.6.4871rev590, assembly SHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`, ILSpy8.2 existant, neuf classes construction ciblées et quatre XML ; provenance et sources complètes uniquement privées sous `tmp/bugfix-v348/construction-reference`. `GenConstruct.HandleBlockingThingJob` demande une vraie coupe sans exiger la maturité ; `BlocksConstruction` ignore harvestWork≤Dandelion200. Grass40, TallGrass60, Brambles60 et Moss60 sont attestées. `TerrainGrid.DoTerrainChangedEffects` retire réellement une plante incompatible au changement du sol.

`CanPlaceBlueprintOver`/`GenSpawn.SpawningWipes` et les propriétés Door/Wall autorisent le remplacement de ghost. Core va plus loin sur frame/mur construit ; le geste humain décrit et qualifié ici reste limité au blueprint impayé. Le driver de recherche rapporte Project.ProgressPercent ; son segment4000ticks Core n'est pas le temps de finir ce projet. La cadence, les budgets et les producteurs historiques du clone restent propres au jeu : aucune parité exhaustive annoncée.

## Contrôles ROOT et reprises

Sources/tests/pilotes/publics figés ; ROOT seul exécute les contrôles lourds séquentiels. Groupe85cas/14fichiers **acquis par reprises**, dont43nouveaux/3fichiers et un helper de scène : clearance13, remplacement9 et activités/jauges21. Les42 cas historiques concernent construction, matériaux, lignes, déconstruction, sols, portes, ordre direct, autodoor et présentation. Dernier groupe84/85 acquis dans24,945s ; reprise du seul fichier porte9/9 PASS5,548s, aucun moteur modifié entre ces acquis.

Rouges conservés : typage13,612s sur index de porte demandé à une API réservée wall/fence/conduit ; assertion corrigée avec l'index mural et son repli prévu. Groupe initial RED24,603s,16/84 rouges : scènes de flore sans provenance/vie, et deux attentes de corruption générique Decoder non offertes par son contrat. Reprises RED25,042s/24,993s sur profil/calendriers manquants ; RED24,945s sur métier de coupe désactivé dans la scène d'ordre explicite. Le helper préparé utilise maintenant les adaptateurs réels de profil, calendriers, climat et vie ; aucun validateur produit assoupli. RAW rejette une queue pointant le mur retiré ; Decoder checkpoint/delta conserve les nouveaux états et rejette une révision de protocole invalide sans adopter partiellement. Aucune garde générale contre toute queue ou ID forgé dans Decoder n'est certifiée par ce lot.

Typages de reprise PASS12,109/12,763s puis final11,845s ; Pages PASS2,089s. Corpus public **PASS61,582s**,63références/66fichiers inchangés : validation, sauvegarde/recharge, un vrai tick repris exactement et checkpoint/delta ; l'omission historique documentée de gatherId=undefined est seule admise comme différence de représentation. Reports sous `tmp/early-access-v348` et logs `tmp/validation-runs/v348-*`. Aucun banc FPS ni campagne naturelle acquis.

Natif Chrome **PASS88,057s**, backendWebGPU enregistré dans les deux sidecars, erreurs[], deux scènes préparées32², huit recharges exactes et quatre captures inspectées ROOT. Corps48,735s plantes et34,189s porte. En×1 réel, Salomé coupe une seule fois le jeune chêne, mur payé5bois terminé2142, puis plancher payé3bois sur grass terminé2184 ; aucun bois récolté de cet arbre immature. Porte remplace le blueprint2000, reçoit25bois en frame2047 et finit2107 ; cinq bois restent. Ordres sans enfant Inspecter, sélection native et libellés de dégagement/chantier ont été exercés. Premier lancement RED2,510s avant navigateur : channel Chrome placé dans describe est interdit par Playwright ; déplacement au niveau fichier, produit inchangé. Le pilote possède deux scènes préparées32², vrai×1, corps borné180s et test240s, erreurs/menaces/incapacités surveillées, exports et recharges exactes acquis. Résultats préparés seulement : aucune réparation de la sauvegarde humaine d'origine, autre implant natif, campagne entière ou débit FPS certifié.


Huit exports rechargés exactement (reports privés `construction-v348-summary.json`) :

| Scène | Phase | Tick | SHA256 export |
| --- | --- | --- | --- |
| door | ghost | 2000 | `0bb9e70ff0c2424f81c7fccbf535ab3fe5eac1ae077e89a681555fc9da1b0173` |
| door | door-replaced | 2000 | `3d99fca806601faf69d0277673f9c8755e0bea5aa4eed4d28a526bd27cb3675d` |
| door | door-frame | 2047 | `1cbbc8fb0835cbf72ce722452a8fa331f16fe5a8c800a0e79d51e7efdd25607f` |
| door | door-finished | 2107 | `0bac8a6dc37be94b92f87ceb7ce07efd55b9c0c157a4c967358550b6adcc3179` |
| plants | ghost | 2000 | `15ad79f58f9b1e9d915f2bf275cf83e848965db9f1b844bc49f4a38629aa84a2` |
| plants | clearing | 2032 | `7dc609fef8bd09ba24c0da4f07a4f10a570a17d25571d78cac4ebe8f202f7ece` |
| plants | wall-built | 2142 | `124f7c6edba461f2a5ba09242f7e2238c43b982d4bdb628e71e20eaa41d60d25` |
| plants | floor-finished | 2184 | `8af17fa66d6fac51128396c476dd4c9105f8fc0f5dc50c314caf0d203f18f972` |

## Suite autorisée

Après validation/commit/push, poursuivre sans relance les autres bugs humains : actions de plante malgré le ghost et annulation ciblée, vraie extraction/replantation et pelle, petites plantes non sélectionnables, annulation du transport/zone, puis masquage analytique des décors iso/perspective. Publications regroupées ; références humaines et UI papier conservées. Campagne naturelle et réserves reprennent après ces blocages, sans résultat futur ni early access100%/240FPS annoncé.
