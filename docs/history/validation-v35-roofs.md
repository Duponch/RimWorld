# Validation courante — toits construits V35

15 septembre 2026. [Contrat](../development/roofing.md), [recherche renouvelée](../research/roofing-reference.md). G0 en consolidation, G1 partiel, G2 habitat en cours. La preuve précédente des pièces reste dans [history](../history/validation-v34-rooms.md).

## Contrôles fonctionnels

La suite complète a passé **114 tests** après intégration V35 : [rapport](../../artifacts/roofing-core.json). Les premiers échecs correspondaient aux attentes de migration vers l’ancien schéma ; données historiques et exclusions restent vérifiées. Après revue des supports et du pool d’intentions, **six scénarios ciblés passent**, dont le pilote de cinq à huit jours sur trois graines : [rapport final](../../artifacts/roofing-final-core.json).

Toiture : rayon et connexion, porteur derrière un trou, contact, défrichage et bilan du bois, coexistence avec stockage, croissance interrompue/reprise, annulation en file, supports déconstruits, détour conservé après retrait volontaire et meuble sans rôle porteur. Deux cibles inaccessibles ne monopolisent pas les intentions. Pièces : une reconstruction crée une zone sans couverture immédiate et respecte la zone de retrait. Les reprises restent exactes. La revue finale passe aussi douze tests ciblés de toiture/pièces/ordres/transport : [rapport](../../artifacts/roofing-review-core.json), dont minage d’un support et menu proposant les deux couches.

Le pilote développe repas, couchages, champ, ateliers, minage et stocks par commandes. Il couvre **28 cellules du repas** et garde le potager découvert ; bilans alimentaires/matières, besoins et continuation sont conservés. Il vérifie une colonie cohérente, pas toutes les stratégies humaines ni une parité exhaustive de Core.

Le **parcours UI toiture natif passe** en 30,7 s (avec réponse de sauvegarde retardée), avec vrai worker, tracé, pose, inspection, visibilité sans mutation, Ignorer, retrait, sauvegarde/rechargement. Backend WebGPU exigé, erreurs : zéro. Captures [couverture](../../artifacts/roofing-ui-covered.png) et [coupe](../../artifacts/roofing-ui-cutaway.png) inspectées : dalle au-dessus des murs, interface lisible, compteur FPS visible. Deux parcours longs ont révélé une course sauvegarde/chargement : la relance instrumentée attendait le tick 13 035, mais observait 7 881 après rechargement, simulation active. Charger lisait l’ancienne entrée locale avant la fin de Sauvegarder ; l’assertion immédiate pouvait encore voir l’état précédant le chargement. [Diagnostic conservé](../../artifacts/roofing-journey-race.json). Les boutons de persistance sont désormais exclusifs pendant la sauvegarde, et le contrôle attend la fin du remplacement avant comparaison. Une réponse de sauvegarde artificiellement retardée d’une seconde exerce ce cas dans le parcours court. Dernier checkpoint et bilan compact sont conservés même avec le reporter texte. **La relance complète passe en 6,7 minutes**, jusqu’au tick 18 060, backend WebGPU et aucune erreur capturée : [bilan de trois jours](../../artifacts/colony-roofing-three-days.json). Dix-huit repas préparés et dix-huit ingestions observés, trois utilisateurs de couchages, 28 cases couvertes dès la fin du deuxième jour ; bilans bois/aliments concordants. La réserve de blocs à 15 déclenche une nouvelle désignation de minage acceptée et sauvegardée, conformément au pilote.

## Audit de charge

Ryzen 5 3600, Node 24.11.1, carte 250×250 dégagée, 3/30/100 bâtisseurs, 25 cellules de toit et un arbre par support. Arbres réellement abattus ; résultats : 75/750/2 500 cellules et 36/360/1 200 bois. Besoins actifs. Aucune suite lourde simultanée pendant les mesures.

| Bâtisseurs | Actifs simultanés observés | Tick p95 | Tick p99 | Maximum |
|---|---:|---:|---:|---:|
| 3 | 3 | 2,136 ms | 4,534 ms | 14,309 ms |
| 30 | 30 | 9,106 ms | 16,901 ms | 25,505 ms |
| 100 | 100 | 17,248 ms | 24,832 ms | 37,109 ms |

[Données CPU](../../artifacts/roofing-cpu.json), [script](../../scripts/roofing-bench.ts). `structuredClone` complet, mesuré séparément, atteint 97,27 ms : ce n’est ni le protocole delta réel ni son transfert. La simulation partage le contexte de toit entre actions sans mutation, sans le reconstruire par colon à chaque contrôle. Des pointes CPU restent mesurées.

[Audit graphique](../../artifacts/roofing-render.json), [script](../../scripts/roofing-render-bench.mjs) : Chromium natif, `channel: chromium`, sans rendu logiciel, 1440×1000, adaptateur AMD `rdna-1` (modèle commercial non exposé). Cent bâtisseurs, toits visibles, worker ×6, échauffement 90 images. 3 909 intervalles : p95 **8,40 ms**, p99 **20,90 ms**, maximum **29,20 ms**. Adoption p95 4,50 ms/max 5,30 ms ; CPU de rendu p95 5,80 ms/max 14,50 ms. Maximum 144 appels de dessin. **Zéro création native de pipeline pendant les travaux**, aucune erreur. Le lot passe à 2 500 instances avec les programmes préparés ; aucun mesh individuel par tuile.

Les mesures ont été rejouées après la revue finale et la correction de sauvegarde, sans autre suite lancée simultanément par l’agent. Le premier relevé graphique avait un p99 de 16,70 ms ; la variation entre exécutions empêche de conclure à un coût constant ou à une régression causale depuis un seul relevé. Les valeurs ci-dessus sont celles du dernier passage, y compris les pointes. Elles valent pour ce scénario et ce matériel, pas pour toute configuration. Carte naturelle dense, effondrement massif, météo et futurs personnages nécessiteront leurs audits propres.

## Portée

Toits construits jouables. Toits naturels, thermique, lumière des ateliers, dégâts/gravats d’effondrement et éclairage de coupe absents. La dalle est provisoire ; masquer son mesh retire aussi son ombre, sans changer croissance ou règles. Le [bilan global](../gameplay/implementation-status.md) maintient les autres systèmes partiels/absents.

## Compilation et documentation

Compilation/typecheck finaux réussis : 181 modules, worker 217,37 kB ; entrée graphique 1 071,00 kB, 300,43 kB gzip. Avertissement historique de bundle supérieur à 500 kB conservé. Types Node 24.13.4 vérifiés sur le registre npm et épinglés uniquement en développement pour les diagnostics de tests ; aucune nouvelle dépendance d’exécution. Les liens locaux, les contrats courants et l’intégrité des trois originaux sont contrôlés.
