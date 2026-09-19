# Validation V62 — réveils défensifs

19 septembre 2026. Lot depuis `main`, après V61 `d3f3bad`. [Contrat](../development/disturbance.md), [recherche et adaptations](../research/disturbance-reference.md).

## Résultats métier et présentation

- **291/291 tests globaux, 69 fichiers**, 130,95 s : six nouveaux scénarios de réveil, familles médicales/combat/sauvegardes, camp civil multi-cartes et rencontre fixe/mobile sur une journée.
- **22/22 contrôles finaux ciblés**, 5,96 s : distinction entre pouvoir se coucher et s'endormir, garde d'invalidation si l'ancrage médical provoque lui-même une chute, et troisième parcours de rencontre avec réserve initialement endormie. Le pilote mobilise cette réserve par la commande normale, protège la victime, effectue secours/traitement et vérifie sa survie après une journée. Aucun soin, dégât, médicament ou rétablissement injecté pendant ce parcours.
- **Build final réussi**, avertissement existant du bundle principal >500 ko conservé. Pas de dépendance ajoutée ni seuil d'avertissement augmenté.
- **UI native finale 1/1**, 6,3 s (7,6 s commande), à 1×/6× : un ennemi tire réellement sur un allié éveillé près du dormeur. Les impacts réveillent celui-ci, qui sort physiquement de son lit. 186/54 frames de sommeil et 13/9 frames de déplacement après perturbation observées sur les attributs GPU ; aucune erreur navigateur. Sauvegarde/rechargement exacts avec échéances actives. [Rapport](../../artifacts/disturbance-ui-v62.json), capture locale `artifacts/disturbance-v62.png` inspectée. Reprise finale réussie après la garde d’invalidation médicale et le changement de libellé du journal.

Les six scénarios profonds croisent arrivé au sol, rayon strict, audition nulle, mur traversant/obstacle contournable, porte fermée/ouverte, repos médical éveillé, hit de mêlée réel, Fuir/Attaquer/Ignorer, trajet déjà engagé, travail forcé avec file et acier porté, sol saturé/effondrement, NPC alliés, incapacité, reprise exacte et refus des champs V62 dans V61. Les signaux isolés servent aux cas limites ; les scénarios de producteur et l'UI utilisent les vrais projectiles/frappes.

Les premières fixtures comportaient une vitesse de projectile différente du profil du revolver et une porte sans matériau : elles ont été corrigées, sans relâcher les validations. Une attente initiale de repos supérieur au niveau d'avant le réveil était incorrecte après seulement quelques ticks de sommeil : le test vérifie désormais perte pendant l'éveil puis récupération effective après le retour au sommeil. Aucun échec moteur observé n'a été supprimé de l'oracle métier.

Le long parcours UI civil de trois jours n'est pas répété : V60 l'a validé et un camp sans impacts ne crée aucun état de perturbation. Son pilote de simulation est rejoué, ainsi que trois variantes du compagnon de rencontre. La nouvelle UI et la garde de présentation portent sur la transition ajoutée. Ce choix ne vaut pas validation d'une partie entière mêlant raids et survie.

## Charge mixte reproductible

Ryzen 5 3600, Windows 11 build 26200, Node 24.11.1, Three 0.186.0 ; Chromium natif, AMD RDNA-1, viewport 1440×1000. Bancs partagés `PURSUIT=1 VALIDATION_VERSION=v62`, carte naturelle 250², 240 ticks par taille, adversaires mobiles, tirs automatiques, réactions civiles et mineurs/bûcherons. Pas de remise à zéro des blessures ni d'injection de soins. Mesures CPU puis native successives ; sources gelées pendant chaque mesure.

| Acteurs | CPU tous ticks p95 / p99 / max (ms) | Images natives p95 / p99 / max (ms) |
|---|---|---|
| 3 | 6,42 / 16,19 / 28,29 | 6,5 / 11,5 / 91,6 |
| 30 | 17,15 / 30,41 / 32,89 | 6,6 / 12 / 103,2 |
| 100 | 38,21 / 49,53 / 59,00 | 12,2 / 23,6 / 121,3 |

À cent acteurs : CPU frame p95 8,2 ms, application scène p95 6,2 ms, callback snapshot p95 0,3 ms (hors décodage IPC), 171 draw calls maximum. Aucun pipeline créé pendant la fenêtre de mesure. 471 émissions et treize cellules extraites en simulation ; quarante patients avec blessures par balle dans le passage natif. Les pointes initiales CPU restent dans les rapports : 28,29 / 32,89 / 40,90 ms.

Les valeurs restent du même ordre que V61 ; une mesure par variante ne démontre ni absence de tout surcoût ni gain causal. Les pointes à cent acteurs restent importantes. **Pas de garantie de 6× soutenu ni de fluidité parfaite.** Aucun programme GPU, géométrie, animation osseuse CPU ou draw call spécifique au réveil n'a été ajouté.

[Mesure CPU](../../artifacts/shooting-cpu-v62.json), [mesure native](../../artifacts/shooting-native-v62.json). La petite garde finale d'invalidation médicale et le libellé du journal ont été ajustés après ces mesures ; les chemins ordinaires mesurés restent identiques. Les données ne sont pas présentées comme un nouveau benchmark d'une scène de massacre de dormeurs.


## Garde de présentation

Minage puis abattage naturels pendant 45 secondes chacun : aucune attente après amorçage, aucun saut ni occupation solide signalés. Images p95 6,4/6,5 ms, maxima 17,5 ms ; 44 changements de vitesse. [Rapport final](../../artifacts/harvest-sync-v62.json). La garde reste ciblée sur ces situations, pas une promesse universelle. Les contrôles documentaires valident les liens et l’intégrité des trois originaux.

## Plan et limites

G0 en consolidation, G1/G2 partiels, G3 humain/combat en cours, G4/G5 largement absents. Estimation globale inchangée autour de 20 % (fourchette 15–25 %, jugement de portée, pas mesure de lignes). Aucun jalon clos. Vêtements et protection corporelle constituent le prochain lot précis de ROADMAP ; bruit/pensées, préemption complète des emplois, groupes/raids, maladies/chirurgie, contenu économique et progression restent ouverts.
