# Validation de la recherche et du tailleur — V73, 19 septembre 2026

Résultat : bureau construit, projet étudié depuis zéro dans la colonie, établi débloqué puis chemise confectionnée et portée. [Contrat](../development/research.md), [sources et divergences](../research/research-reference.md). L'étape proche 4 est satisfaite par cette boucle ; un projet et deux recettes textiles ne constituent pas un arbre/catalogue complets.

## Vérifications

- Dernière passe globale : **360/361**, 216,92 secondes. L'unique échec était la nouvelle fixture faim/cuisine, qui désactivait le ravitaillement tout en exigeant sa réalisation automatique. Politique corrigée, puis **17/17** contrôles ciblés de recherche, production et ordres réussis en 6,38 secondes, parcours de colonie compris. Pas de nouvelle passe globale après cette correction. La première passe était **341/360**, avec dix-huit fixtures historiques contenant les nouveaux champs V73 ou attendant leur mauvais défaut, et le parcours de recherche dont l'approvisionnement restait insuffisant. Les fixtures retirent explicitement les champs futurs ; la validation de production reste stricte. Contrôles corrigés intermédiaires : 110/114 puis 35/35.
- Quatre scénarios de recherche : accès et absence de travail distant, partage du projet sur deux bureaux, exclusivité, suspension/priorité, désinstallation, continuation, quatre orientations, agrégation acier, verrou, migrations et corruptions, seuils thermiques/Intellect ; parcours de colonie naturel. L'ordre ajouté avec Maj attend la fin de la session de recherche puis accomplit son abattage ; le travail courant reste réservé jusque-là. La régression faim/cuisine ajoute livraison de combustible sous 20 de faim, sauvegarde du portage, cuisson et ingestion avec bilan de bois conservé.
- Le parcours prolonge le checkpoint coton V72 : riz et cuisine par commandes, arbres abattus et acier miné, aucun point ni chemise injectés. Tick **111824 → 219543**, soit environ **18 jours supplémentaires**, sommeil et repas observés ; projet achevé au tick 218337, 45 tissus incorporés, quinze restants et vêtement porté. [Bilan](../../artifacts/research-colony-v73.json), [checkpoint réellement obtenu à 598 points](../../artifacts/research-checkpoint-v73.json). Les arbres/minerai ajoutés autour de cette petite fixture sont déclarés ; ce n'est pas une nouvelle carte naturelle 250².
- UI native **1/1**, environ 72 secondes : pause et rechargement de la recherche, affectation explicite, travail 1×/6×, construction par Architecte, facture, port à 1×, portrait, FPS et reprise finale. [Preuve](../../artifacts/research-ui-v73.json). Captures locales `research-complete-v73.png` et `research-shirt-v73.png` examinées. Premier essai : reprise à priorité inférieure aux récoltes, attente de 20 secondes insuffisante ; le pilote utilise maintenant Travail pour prioriser le projet, sans avancer le monde artificiellement.
- Build et TypeScript réussis ; 257 documents, 2 639 liens locaux, 25 identifiants de domaine et cinq familles de validation contrôlés. Les trois sources originales restent identiques octet par octet. Le parcours UI court est une continuation réelle ; il ne remplace pas un parcours UI monolithique de dix-huit jours.

Diagnostic du pilote : le premier camp a épuisé ses rations et découvert une boucle d'annulation du bois culinaire sous faim critique. Corrigée dans les besoins, avec régression dédiée. Les tentatives suivantes ont montré des réserves de riz/bois insuffisantes et trop de repas périssables ; le pilote cultive davantage, dispose d'une réserve alimentaire et conserve du bois pour le tailleur. Aucune assertion de fabrication ou d'alimentation n'a été supprimée. Les restrictions anciennes de travail sous faim et l'absence de malnutrition restent des limites de gameplay, pas une autonomie alimentaire garantie pour toute partie.

## Mesures de charge

AMD Ryzen 5 3600, Windows, Node ; Chromium WebGPU natif AMD **RDNA 1**, viewport 1440×1000. Carte naturelle 250² ; tiers de chercheurs aux bureaux, autres colons confectionnent des tenues ou minent/abattent. Matériaux et bureaux de ces fixtures sont des conditions de charge, distinctes du parcours de recherche gagnée. Sources gelées pendant le natif, mesures successives sans long pilote concurrent.

| Acteurs | Simulation p95 / pic | Image native p95 / pic | Worker p95 / pic |
|---|---|---|---|
| 3 | 1,19 / 9,24 ms | 4,3 / 20,8 ms | 2,35 / 25,5 ms |
| 30 | 6,78 / 21,15 ms | 8,3 / 25,0 ms | 10,60 / 37,8 ms |
| 100 | 16,69 / 29,37 ms | 16,7 / 45,8 ms | 20,69 / 44,6 ms |

[CPU et encodage](../../artifacts/research-cpu-v73.json) : 650 ticks, 100 ticks de chauffe séparés ; p50/p95/p99/max et série après vingt ticks conservés. 1/10/33 tenues, 4/40/132 cases minées, progression de recherche effective. [Rendu et worker](../../artifacts/research-render-v73.json) : 90 frames de chauffe, vitesse demandée 6×, aucune exportation complète de World dans la fenêtre ; mesures worker de **moyennes publiées par lot**, pas des percentiles individuels de ticks.

Zéro pipeline créé dans les trois fenêtres, géométrie des colons stable, aucun état invalide ni erreur WebGPU/console. À cent acteurs : 657 ticks présentés en 11,78 secondes ; pas de garantie 6× constant, ni de fluidité parfaite. Le mélange d'activités diffère de V72 : ne pas transformer la comparaison en pourcentage de gain. Les pics restent à surveiller.

G0 en consolidation, G1/G2/G3 partiels, G4 engagé, G5 absent ; aucun jalon complet. Prochaine priorité : pression environnementale de l'étape 5 selon ROADMAP, avec règle revérifiée et réponse accessible au joueur.
