# Interface native : fiabilité, lecture et échelle — V485

**Qualifiée localement et enregistrée le 26 octobre 2026.** Revue visuelle finale effectuée ; commit UI `5de0c82b` poussé sur `origin/main`, aucune publication de ce lot acquise. Base `b7ead1de`, schéma **296** inchangé ; production `b969b256` / `61d63e51` au295 inchangée. Six ensembles, SYS069, campagne et confort global ouverts.

Le gel final retrouve les 2 056 entrées natives inchangées. Sur les 58 fichiers enregistrés, 56 sont identiques aux octets de travail ; seules deux sources reçoivent la normalisation CRLF→LF de Git, sans autre différence, avec émission JavaScript normalisée identique. [Reçu d’enregistrement](../../tmp/ui-native-v485/staging-fence.json).

## Corrections retenues

La demande humaine porte sur clics perdus, masquages, chevauchements, curseurs, échelle, jauges, caméra et cartes de chargement. Carton natif [V480](native-ui-identity-v480.md), simulation, propriétaires et quantités restent l’autorité.

**Appuis animés.** Le second raycast pouvait perdre le bouton déplacé, au même point de souris. `NativeHitPose` capture les matrices existantes : secours limité au même pointeur/contrôle/page/layout, déplacement≤12 px. Reflow, scroll, masquage ou désactivation l’invalident. Les insets gardent leur identité. Aucun mesh/matériau/texture GPU ajouté.

**Coupures visibles.** Revue d’un PASS : panneaux sur les commandes de droite et nom du colon rogné par les UV. Réservation commune264px pour HUD248px ; groupe relevé au-dessus du panneau ou masqué entièrement faute de place, restauré à la fermeture. Décision de layout, jamais de survol ; aucune action masquée active. Résumé en `uvPadding:1`.

**Caméra.** Stage avalait droit/milieu/molette partout sous une page modale ; le renderer révoquait aussi le contexte Ordres avant navigation. Les gestes commencés hors UI passent aux contrôles existants et traversent le papier sans action UI ni perte de callbacks. Voie réservée aux modaux : l’inspecteur non modal garde son clic droit Ordres ; clic gauche extérieur, éditeurs, dropdowns et globe restent protégés.

## Échelle et présentation

- **Options → échelle globale** :100 % par défaut,75–200 % par pas de5 %, persistée dans ce navigateur hors sauvegarde. Textes, cartes, portraits, ressources, notifications et commandes partagent projection et conversion du pointeur. À fort zoom, reflow, pagination et scroll remplacent une réduction silencieuse de la police.
- **Coin gauche** : terrain sans fond sous Ordres/Zones, dans le coin si le bord réel des cartes du bas laisse une voie libre, sinon au-dessus de la barre. Réserve stable, texte long entier parcourable à la molette. Ressources/portraits réservent leurs pagers ; voie trop courte → Stocks avec tous les types/propriétaires/quantités.
- **Coin droit** : météo entièrement contenue dans son carton248px, mêmes bords pour vitesses et commandes de vue. Alertes neutres crème, avertissements ocre/orange, dangers terre cuite. La gravité déclarée prime ; les anciennes alertes se fondent sur leurs clés sémantiques. Le budget inclut météo et accès à toutes les notifications.
- **Dossiers** : référence760×660 px plafonnée à l’espace disponible, feuille/onglets/pied stable. Douze compétences, jauges opaques et contrastées. Travail conserve dropdowns/callbacks : priorité centrée, niveau/passion secondaire, noms fixes, scroll horizontal. Architecte476px ; Recherche Principal/42 projets/30 liens.

## Chargement et curseurs

La carte entière de sauvegarde/test charge directement, sans Choisir puis Charger. Le gestionnaire relit entrée/révision ; verrous d’opération/admission et confirmations restent inchangés. Gérer ne charge pas. Téléchargement indépendant dans le même carton : clic, désactivation ou relâchement traversant sa bordure n’activent pas le parent.

La revue du premier PASS natif a révélé une carte de catalogue de plus de900px : toute sa provenance était peinte. `nativeCardInk`, partagé par calcul et rendu, borne maintenant titre/métadonnées/description à2+2+2 lignes avec ellipses mesurées. Textes complets, étapes et provenance restent dans le modèle et le tooltip ; les noms sans espace se coupent à police normale. Les contrats vérifient une hauteur bornée et au moins cinq cartes ordinaires entièrement visibles dans800px. Retour et téléchargement restent dans le cadre.

Curseurs **beige** demandés : neuf formes générées,18 PNG transparents32/64 px, **81 082 octets**, hotspots conservés, sans équivalence pixel à la photo. Rouge et provenance préservés. Manifest SHA`867649510a8b08b420002a980497e905d8342b6f3e42d8b9a81c5fdde3e5a371`, reçu`tmp/ui-native-v485/cursor-beige-export-report.json`.

Installation sur canvas hors`#app` : flèche, doigt, texte, attente, interdit et mains selon l’état réel. Par outil, composition paresseuse de six curseurs OS (deux densités×flèche/main ouverte/fermée) avec picto. Promesse réutilisée, sélection périmée écartée. Aucun sprite/timer/dessin par image ; première composition non gratuite.

## Acquisitions ROOT

Durées d’enveloppe UTC du26octobre ; reprises recouvrantes, pas somme de tests ni suite globale verte. [Ledger autoritatif](../../tmp/validation-runs/ledger.jsonl).

| Contrôle | Acquisition et portée |
| --- | --- |
| Typage final | PASS16,310 s, [reçu17:20](../../tmp/validation-runs/v485-type-bounded-final-2026-10-26T17-20-10.563Z-18160/output.log). |
| Contrats ciblés finaux | **54 PASS/neuf fichiers**,24,631 s, [reçu17:22](../../tmp/validation-runs/v485-bounded-final-contracts-2026-10-26T17-22-56.184Z-9884/output.log). |
| Build final | PASS5,241 s, [reçu17:50](../../tmp/validation-runs/v485-build-final-2026-10-26T17-50-16.301Z-21628/output.log). |
| Vrai jeu, vues/curseurs/pixels | PASS65,077 s ;2056 sources exactes,3544 réponses servies,18 vues/huit captures. Vrai DPR1,25 avant renderer,80 survols et six poses intermédiaires. Curseurs CSS réels, Miner40/80 px et48mouvements chauds : Canvas209→209. [Rapport17:37](../../tmp/ui-native-v485/game-2026-10-26T17-37-52.772Z-15712/report.json). |
| Disposition synchronisée | PASS42,903 s ;1440/960×100/150/200 %, six captures,48 clics vitesses/36vue,12 comparaisons locales, sept régions HUD, terrain long/molette, stocks complets et préférence150 % rechargée. [Rapport17:47](../../tmp/ui-native-v485/fixture-2026-10-26T17-47-36.660Z-19644/report.json). |
| Chargement compact | PASS55,685 s ; carte entière → une seule vraie génération GameSession, campagne entière exacte ; téléchargement inclus indépendant, deux dimensions et deux captures. [Rapport17:51](../../tmp/ui-native-v485/load-cards-2026-10-26T17-51-34.395Z-10980/report.json). |

Le parcours caméra séparé passe56,264 s (Factions/Ordres, droit/milieu/molette, callbacks conservés, inspecteur non modal et dropdown Travail). Les exports entiers initiaux/finaux restent en mémoire : **14 556 762 octets**, SHA`c8f1d21ec010c3aa4e4a0b055473f4bf012fc19e0da0a107e6deb44d5b8fbd8f`, byte exacts. Original V480 authentifié, tick1782, migration293→296 numéro seul, aucun pas de simulation ni formation/départ. Le téléchargement natif de test est commencé puis annulé pour éviter une copie ; le chargement d’une autre référence publique n’a pas été joué, ses callbacks directs sont couverts par les contrats de modèle. Observer Canvas et probes GPU n’existent que dans les pilotes privés, jamais dans le produit.

## Échecs conservés et limites

- Anciennes attentes de présentation, erreurs de type d’auteur et oracle flottant10.000000000000014 sont conservés avec leurs corrections dans le brouillon détaillé ; aucun garde produit affaibli.
- SourceMismatch **36,325 s** : une source de curseur change pendant la fixture ; refus du gel, pas panne graphique établie. Deux oracles de chargement échouent **43,066 s** puis **60,643 s** avant le PASS : attente du contrôle activé et réellement visible réparée, sans contourner ses verrous.
- Vues/curseurs **68,633 s** : le contrôle natif a révélé une vraie priorité CSS incorrecte, laissant le curseur de terrain gagner sur celui du contrôle ; le sélecteur corrigé est acquis dans le parcours final. Reprise **13,948 s** interrompue par`ENOSPC`. Fixture **40,058 s** : nombre de pages lu avant resize natif à960 px. La reprise attend explicitement les dimensions logiques avant lecture du pager, sans retries aveugles ni baisse des assertions.
- Le premier écart3395pixels précède la garantie d’image fraîche ; un ancien tooltip est une hypothèse, pas une cause acquise. Cache partiel et DamageTracker ne sont pas désactivés comme palliatif. Les reprises comparent repos et poses animées avec de rares pixels de bord bornés ; elles ne mesurent pas le temps GPU.

Les régions, matières et surfaces réutilisées conservent leur cache au repos ; les insets n’ajoutent pas de carton GPU par ligne. Captures de poses CPU, raycasts, première composition de curseur et surfaces plus grandes coûtent réellement. **Aucun coût nul, gain FPS global, équivalence HTML ou coût GPU inchangé n’est déduit.** V477/V478 conservent leurs audits et limites propres.

À la demande humaine de libérer plusieurs Go anciens, ROOT a retiré **2 821 099 734 octets** de copies redondantes et de caches anciens, avec vérification intégrale des originaux : [preuve d’entretien](storage-maintenance-20261026.md). Les journaux historiques originaux, RAW uniques, sauvegardes et références restent intacts. Le cache ROOT1400 retiré sur autorisation humaine explicite constitue une opération distincte ; aucun fichier récent n’est assimilé à un déchet ancien.

Après enregistrement UI, reprendre l’[arbitrage V484](audit-core-20261022.md#réévaluation-après-v483) depuis son checkpoint avec un précontrôle frais. La pagination seize sources conserve les quantités du brouillon et ses sept contrats ; aucun voyage, camp ou résultat favorable n’est acquis. Robin occupé à une restitution physique reste refusé, sans contournement. Commit, push, éventuelle publication et poursuite des six ensembles doivent être consignés comme étapes distinctes.

La [reprise V484](../gameplay/campaign-continuation-v484.md) a ensuite effectivement commencé, avec 228 ticks de préparation joués puis un nouveau checkpoint entier conservé. Le voyage reste à décider depuis cet état réel.

## Reprise du survol des textes pendant V484

Le premier devis depuis le checkpoint2010 révèle un défaut supplémentaire réel : à gauche de certaines lignes, le plan invisible d'infobulle à Z0,025 se trouve derrière la face du panneau épais et légèrement incliné. La capture montre bien la pile37557 visible, sans animation ; le raycast retourne le fond au lieu du texte. Le parcours s'arrête en **61,212 s**, sans commande ni temps joué, et l'export entier reste exactement au checkpoint2010. [Échec conservé](../../tmp/campaign-continuation-v484/native-preview-prepared-2026-10-26T18-29-53.195Z-19432/report.json).

La correction diffère uniquement le fond physique courant dans la liste d'intersections déjà calculée, puis cherche ses propres descendants valides. Le fond reste la réponse de secours ; ni le HUD, ni une ancienne page, ni le terrain derrière ne deviennent accessibles à travers le papier. Visibilité, découpes, modalité, dropdowns et contrôles secondaires gardent leurs filtres et priorités. Aucun plan n'est déplacé vers une profondeur arbitraire, aucun mesh, texture, passe ou second raycast n'est ajouté. Quelques intersections peuvent être parcourues en plus : aucun coût CPU nul ni gain FPS n'est affirmé.

Quatre tests avec géométrie Three réelle reproduisent d'abord **deux échecs et deux succès en1,566 s**. Après correction, ces cas et les voisins infobulles/caméra/acquisition passent : **18 tests, quatre fichiers, 24,301 s**. Typage **21,853 s** et compilation **5,791 s** passent. La préimage exacte du Stage et le pilote initial sont conservés ; le nouveau pilote admet seulement le changement explicite de ce fichier, tous les autres produits restant identiques aux deux gels antérieurs.

Le [nouveau parcours natif](../../tmp/campaign-continuation-v484/native-preview-prepared-2026-10-26T18-40-21.384Z-17732/report.json) passe **55,412 s** : mêmes coordonnées du texte gauche, hints des deux piles réels, quantités6+6 conservées entre pages et vraie confirmation. ROOT vérifie visuellement le premier hint et la confirmation. Les2 056 entrées sont inchangées pendant l'acquisition ; exports initial et final restent exactement aux14 547 059octets du checkpoint2010, SHA`d2340630be2cdd5c560ed300014e45310b424fd51e0fe32fa211578d706aa332`. Aucun départ n'a lieu. Cette qualification ciblée complète le lot enregistré ; elle ne rejoue ni ne transforme ses anciens résultats en mesures de performances nouvelles.
