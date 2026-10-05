# V212 — Défense automatisée et entretien physique

**Livré dans le périmètre contrôlé, schéma 193.** Lire la [recherche Core](../research/mini-turret-core-v212.md), la [preuve](../history/validation-mini-turret-v212.md) et les contrats de tir/projectiles, chantier/transport, courant/panne, interruption, PV et crises. Référence Core 1.6.4871 ; catalogue, campagnes et performance globale restent incomplets.

## Boucle et état propriétaire

Une mini-tourelle coloniale en acier : projet500points après Armurerie, parent Core Blowback explicitement adapté/différé avec ses armes ; bureau simple ou avancé réellement utilisable. Chantier100acier+3composants, Construction5,180ticks locaux neutres, empreinte1×1 sans orientation/qualité. PV100, beauté−20, inflammabilité0,7, remplissage0,4 ; corps bas PassThroughOnly, franchissement+5ticks locaux, sans support de toit/mur/brèche. Circuit80W et interrupteur, pluie exposée, éruption solaire, panne et réparation des systèmes existants.

`Structure.turret` appartient seulement à une tourelle installée : ammoQ entier0..240, autoReload/holdFire, cible publique typée pawn/animal, warmup positif15..45Core, seconde balle privée avec shotsLeft1/délai1..8, cooldown0..288. La finition physique crée60coups, aucune livraison cachée80acier ; aucune modification de canon par réparation. Aucune minification admise dans ce lot : UI et commande falsifiée refusent de perdre ces états dans un paquet générique.

## Acquisition et tirs

Hash local `(Core+ID)%15`, portée28,9, classement distance² puis ID, captures partagées et budget déclaré : ces conventions sont adaptées au registre/classement Core. Cible machine réelle : pirate hostile présent vivant non-downé/non-prisonnier, ou sauvage sans faction réellement en rage. Factions coloniale/amie et neutre exclues même en Berserk ; aucun faux Pawn tireur, compétence, capacité corporelle ou XP. Aucune nouvelle restriction générale de sommeil humain.

Admission locale : groupe dû trié par ID, au plus huit consultations et 32 768 paires par Core. Fenêtre tournante par pas de un, clippée à la fin du groupe sans retour au début ; chaque propriétaire devient premier de sa fenêtre et peut donc recevoir le quota complet. L’exécution globale conserve l’ordre des IDs. Aucun ordre de tir ni tirage n’est inventé lors d’un report. Cette borne ne prouve pas le coût du tick complet.

Une acquisition réussie engage une seule durée entière15..45Core avec RNG draft ; arrondi local explicite. Échauffement puis deux émissions séparées de8Core ; profil intrinsèque mini-turret-gun, accuracy mécanique0,96 et arme0,77/0,70/0,45/0,24, Bullet12/AP0,18/vitesse0,70/stopping0,5. Enregistrement de balle, ID, RNG, canon−4quarts et phase sont atomiques. La qualité technique `normal` de l'enveloppe n'est pas une qualité de canon. Le projectile vit après retrait du lanceur.

Avant entrée en rafale, ligne/cible refusée annule sans cooldown. Chaque balle privée vérifie présence et ligne, pas une nouvelle acquisition de faction/chute ; une cible tombée entre coups peut recevoir le second. Échec privé termine la rafale avec cooldown. Fin pendant VerbsTick pose288 puis le même passage bâtiment décrémente vers287 ; ne pas décaler arbitrairement cette frontière. Coupure/panne annule cible publique/warmup, suspend le délai privé et cooldown ; reprise du privé d'abord. Hold-fire annule public/warmup mais laisse terminer la rafale engagée. Le cooldown avance sous courant même vide ou feu retenu.

## Réarmement et interruptions

Destination de transport typée `turret`, pile acier réelle réservée, prise/portage/contact puis24ticks locaux de service. Une unité consommée ajoute3quarts ; la balle coûte4 ; tolérance de plein `240-ammoQ<3`, besoin `ceil((240-ammoQ)/3)` avant carry10/réservations. Reliquat réellement porté puis déposé ; aucune matière créditée au clic, trajet ou début de service.

Auto à≤50%, politique active, interrupteur demandé allumé et aucune désignation d'arrêt/déconstruction/feu. Absence de réseau ou panne seule ne bloque pas le transport. Hauling+Manipulation, incapacité V210 et priorités réelles ; pacifiste permis. Ordre personnel via `order-haul` avec cible `{type:'turret',structureId}`, pawnId et queue existants, y compris mobilisé. Deux commandes de politique distinctes : turret-hold-fire et turret-auto-reload. Désactiver auto libère seulement transports automatiques après préplan de dépôt ; préserver ordre direct, arête, frappe, cargo et réservations. La borne locale carry10 peut donner une recharge partielle dépassant50%, puis suspendre les nouveaux trajets automatiques jusqu'au seuil suivant ; cette cadence diffère du Core quand son transport peut porter tout l'écart en une fois. Un ordre prioritaire de réarmement peut compléter par plusieurs trajets réels, sans réserve fictive ni changement global du portage.

## Dommages, mèche et Bomb borné

Les dégâts externes distinguent montant brut et montant après worker. Admissibilité explosive stable par identité, jamais tirage à chaque coup. Comparaison immédiate brut/PV avant facteurs ; survivante≤20%PV reçoit mèche absolue240Core. Réparer, courant ou Hold-fire n'annulent pas une mèche. EMP/stun Structure restent différés, sans faux bouton de désarmement. Retirer la source une fois puis enregistrer une vague indépendante, IDs/restes préplanifiés ensemble.

Bomb rayon3,9, dégâts50/AP0,10 sans décroissance ni allumage ; détruit les feux atteints. Capture initiale LOS+édifices adjacents cardinaux, cellules canoniques échéance `start+floor(distance*1,5)`. Première progression Core suivant la naissance ; les murs détruits ne rouvrent pas cette ancienne capture. Objets présents relus à l'arrivée, couverture par objet plein et déduplication multi-case ; restes nouveaux exclus de la liste capturée pour la cellule courante. Chaleur `5×nombre de cellules` injectée **au centre au départ**, une fois.

Things spatiales retenues : humains/animaux présents, structures installées/paquets au sol, végétaux, piles ayant réellement des PV et dépouilles avec possessions attachées. Bâtiment passable×2/impassable×4 selon définition de passage, plante×4, corps×0,5. Métaux/blocs sans PV restent sans PV Core ; chunks rocheux300, laine90, cuirs60 et composant avancé70 vérifiés. Fragmentation Sharp/Shredded2–4 à montant≥15, protection/usure cumulée/duplication anatomique, stagger95Core après blessure ; aucune XP. Mort animale au downing reste l'adaptation antérieure déclarée.

Massifs portés par Tile, floors, plans/cadres sans propriétaire HP et contenus ordinaires portés ne sont pas endommagés par ce premier Bomb : exclusion explicite, pas un noyau Core exhaustif. Aucune récolte, MiningXP, rendement minier, feu ou stock fictifs. Pertes neutres prospectives dans destroyed (recettes, items, ressources, potentiel végétal, fuel/énergie distincts), aucune reclassification rétroactive du feu.

Une mèche confirmée fournit emplacement/rayon/échéance à un refuge physique borné, prioritaire au travail/ordre/draft/crise après frontières corporelles. Déplacement et dépôts réellement possibles ; ni téléportation ni effacement de cargaison ni immunité de mobilisé. Cet ordonnancement est une adaptation locale du danger, pas le ThinkTree complet. Réaction en chaîne par événements Core, jamais récursion immédiate non bornée.

## Persistance, présentation et preuve

Schéma193 après validation **stricte192**, migration du numéro seulement. Aucune tourelle, recherche, balle, mèche, vague, blessure ou perte ajoutée à l'historique ; payloads publics et archives inchangés. États stricts, clés typées historiques légitimes, curseurs/dates/IDs uniques et absence future interdite sous192, y compris dossiers médicaux archivés. Vieilles arrivées inertes unsupported-object ne sont pas rejouées. Sauvegarde/checkpoint/delta adoptés atomiquement sur état confirmé ; saturation tardive arrête le worker sans publication partielle V209.

Ordre local : sous-Core, propriétaires par ID puis événements balle/vague par ID ; mutation renouvelle captures médicales et décor fixe réellement touché. Une émission nouvelle ne progresse qu'au Core suivant. Aucun second FixedClock.

UI montre vrais PV/réseau/interrupteur/panne, coups/quarts, politique, cible publique/privée, phase/service/mèche et motifs de refus. Rayon28,9 et danger3,9 restent distincts. Chaînes textContent, clavier et palette conservés. Socle original dans FurnitureLayer ; sommet dans un seul lot global instancié, sans Mesh/lumière/texture par tourelle ni rebuild du mobilier à chaque visée. Rotation/flash/son dérivent de données confirmées, pas de RNG World ni tirs graphiques. Aucun coût GPU nul annoncé.

Scène publique préparée sans chantier/service/tir/dégât/détonation accomplis ; parcours natifs construction/énergie/recharge et combat/danger distincts. Quelques cycles intégrés couvrent politique/coupure/rafale, faction, cargo, dommage/mèche/vague et reprise exacte. Root seul lance les contrôles après gel ; résultats, fréquence naturelle, campagne et performance restent ceux réellement consignés. Autres matériaux/tourelles/mortiers/mécanoïdes/EMP/difficulté personnalisée/minification et cible imposée restent différés.
