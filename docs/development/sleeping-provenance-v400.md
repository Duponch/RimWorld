# Provenance des couchages et coût d’adoption — V400

16 octobre 2026, schéma 252 inchangé. Consolidation CPU après [V399](structure-adoption-v399.md), sans nouvelle mécanique : éviter de relire la provenance statique des structures restées exactement identiques, tout en vérifiant à chaque réception les lits, personnes, terrains, tâches, soins et possessions actuels. Produit qualifié, publication groupée suivante ; dernière production V398–V399/8a146d54/7ee3a889.

## Cause mesurée et changement borné

Profil ROOT en lecture seule, 80 deltas au même tick sur les Aulnes publiques10733 migrées252, 250², 2 454 structures et 17 912 ressources. Classe MAIN du produit exacte, aucune simulation/commande/RNG. Inspector n’encadre que l’adoption, après préparation/clonage/bootstrap et avant assertions : PASS5,684s, `tmp/candidate-profile-v400-sptXcT/report.json` et `candidate.cpuprofile`. 870 échantillons retenus/1 348,693ms : provenance des couchages275,900ms inclusifs (20,46%). Transport260,384ms est imbriqué ; ces deux temps ne s’additionnent pas. GC24,147ms hors du sous-arbre rapporté séparément. Les coûts d’usure et de marais également observés ne déclenchent pas de nouveau chantier.

Un seul fait privé MAIN est retenu : le tableau structures a passé son parcours de provenance. Réutilisation seulement avec prédécesseur confirmé exact, véritable delta sparse contigu vide, même tableau, nextId/schéma/dimensions/graine égaux. Un delta vide au même tick peut réutiliser ce fait ; toute upsert, même identique et au même tick, ainsi que full, remap, copie ou borne changée repasse au parcours entier. Propriété fermée sans écrivain externe, comme les autres propriétaires MAIN ; cette fabrique ne rend pas fiable un World mutable arbitraire.

Le garde public RAW/historique et le contrôle initial du paquet restent complets. Tâches, piles, paquets et archives sont toujours lus. Le corps dynamique (terrain/ressources, occupation, affectations, besoins, secours, soins et chirurgie) reste identique. Confirmation seulement après adoption complète ; refus/stale/exception écartent le candidat. Aucun index, verdict métier global ou nouveau format persistant. Revue indépendante statique sans défaut bloquant.

## Comparaison CPU et limites

Banc ROOT PASS9,846s, `tmp/sleeping-provenance-bench-v400-0av1lk/report.json`. Baseline MAIN exacte7ee3a889 et candidat partageant les mêmes modules ; retrait textuel du seul nouveau propriétaire redonne la baseline. Une scène immuable10733, cinq paires alternées de huit deltas, mêmes issues/champs et grands tableaux ; full/upsert mesurés séparément. Sources exactes avant/après, aucune reprise de campagne.

| Adoption des deltas | Avant ms | Après ms |
| --- | ---: | ---: |
| Moyenne des cinq lots | 17,115 | 14,285 |
| Médiane des cinq lots | 16,210 | 14,012 |

Différence moyenne2,830ms sur ce chemin. Les full et upserts gardent le parcours strict : pas de gain attendu de ce certificat. Windows/Node24.11.1/Ryzen5 3600, GC/JIT non contrôlés, petit échantillon ; p95 du rapport = percentile de cinq moyennes de lots. Préparation/encodage/clonage hors chronomètres. Ce résultat Node ne mesure ni MAIN natif, ni HUD/DOM, worker complet, GPU ou FPS ; il ne s’additionne pas arithmétiquement aux gains d’une autre exécution V399.

## Contrôles et suite

85 cas distincts/six fichiers acquis par reprises, dont six nouveaux. Première passe81 PASS/4 RED en9,924s : témoins historiques générés contenant le calendrier252 et des permissions futures. Seuls ces témoins sont préparés avant baseline ; attendu neutre actualisé avec le calendrier prospectif, anciens biens/lit conservés. Les quatre cas repassent en6,252s. Le typage suivant détecte une écriture sur filtre readonly (RED12,817s) : même politique recopiée avant baseline, aucun validateur détendu. Reprise finale des seuls quatre cas PASS5,881s, typage toutes sources/tests touchés PASS12,554s. Rouges et sorties sous `tmp/validation-runs/`.

Présentation Chrome requise pour le bridge PASS131,503s ; Pages PASS2,350s. Aucun corpus66, nouveau voyage, campagne longue, natif UI ou banc FPS inchangé rejoué. Le parcours réel V398 en pause et les archives publiques non affectées sont réutilisés. Branche blessée21483, tâches/cargaisons et Aulnes publiques V394 inchangées.

Après cette tranche, revenir au chargement/retour du second site et identifier un manque concret avant d’élargir les règles. Pas d’enchaînement automatique de certificats CPU par domaine ; mesures restantes conservées avec leurs limites.
