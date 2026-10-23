# V471 — Semis forestiers volontaires

**V471 publiée le23octobre2026, schéma 291 ; qualification ciblée acquise par reprises.** Ensemble 2 principal, avec interactions recherche, travail, milieu vivant, transport et conservation. Tous les domaines et interactions, les six ensembles, campagnes, victoire et cible FPS restent ouverts.

## Objectif du lot

Après la recherche **Semis d’arbres,1000points**, choisir dans une vraie zone de sol une essence indigène parmi les treize arbres déjà représentés. Le choix dépend de la flore potentielle du biome, pas des arbres actuellement présents ; un milieu inconnu n’offre aucune essence réputée indigène. Les sept cultures existantes restent disponibles selon leurs anciennes règles ; l’hydroponie n’accueille pas ces arbres.

Le choix d’une essence ne crée pas un arbre. Un cultivateur admissible, **Culture6 pour commencer**, doit rejoindre la case et fournir le vrai travail de semis,4000Core nominaux convertis en400ticks locaux. L’arbre apparaît à la finition, puis pousse sous le sol, la lumière, l’air et le repos végétal existants. Une coupe automatique attend la maturité stricte>99.9% et un rendement possible ; elle produit du bois physique à transporter. Le cycle peut ensuite recommencer. Une recherche ou un changement de réglage ne donne ni travail, ni maturité, ni bois.

La [référence Core actuelle](../research/forestry-v471-reference.md) et la [décision avant code](../../tmp/forestry-v471/decision-before-code.md) précisent règles, provenance et adaptations. Les valeurs de croissance pondérée ne promettent pas une durée réelle fixe, et le seuil manuel de rendement ne remplace pas la maturité de coupe automatique.

## Adaptations et limites annoncées

- **Création à la finition** : conservation du producteur commun des cultures locales ; pas de plantule nativeGrowth0 matérialisée pendant le travail. Le nouvel arbre réussi commenceGrowth0.0001 avec sa vraie naissance.
- **Engagement d’espacement anticipé** : les semis acceptés bloquent les voisins dès l’approche et pendant le travail, plus tôt que la plantule physique native. Les huit voisins comptent ; une plante encore désirée par sa propre zone est conservée.
- **Origine acquise** : sown291 marque seulement les nouveaux arbres réellement semés. Cette origine suit le même arbre extrait/emballé/replanté et ses détenteurs ; aucune naissance ou zone ancienne ne l’invente.
- **Flore historique** : les nouveaux arbres marqués sont distingués du quota sauvage des sites legacy concernés, sans augmenter capacité ou fréquence de repousse ni ouvrir les anciens schémas.
- **Bornes végétales** : aucune maladie générale d’arbres ajoutée depuis sown, aucun raccord exhaustif de végétation en pot, aucun arbre hydroponique, nouvelle essence physique, permission supplémentaire de transplantation ou contenuDLC. Les autres règles de blight et de détention restent distinctes.

## Sauvegardes et coût

Contrat de migration : **290 strict avant numéro seul291**, futur292 fermé. Aucun choix, recherche, arbre, origine, naissance, progrès, matériau ou hasard offert à l’import. La recherche demeure partagée par la campagne ; les zones restent attachées à leur carte et les biens aux vrais détenteurs. Les interruptions libèrent les engagements ordinaires et conservent les acquisitions physiques selon les règles existantes.

La conception réutilise la cadence agricole, son budget et sa file bornés, les index par case et une capture des engagements par passe. Aucun parcours complet de carte par candidat ou par image n’est prévu pour l’espacement. Aucun nouveau modèle ou buffer n’est requis pour les essences existantes. Une mesure ciblée du chemin agricole modifié reste à consigner ; aucun gain CPU/FPS général n’est annoncé.

## Qualification et limites

**133 cas distincts acquis par reprises, dont40nouveaux et93voisins, sur173sélectionnés/18fichiers.** Les40anciens diagnostics restent conservés et reproduits sur le témoin V470 :23transferts/snapshots d’arbres, trois cultures alimentaires, neuf arbres emballés physiques, trois hydroponiques et deux profils Plantes historiques. Les mêmes titres et causes ont été rapprochés ; il ne s’agit pas d’une suite complète verte.

La première sélection125cas donnait87acquis/38rouges. Les nouveaux scénarios ont été corrigés pour fournir le matériau explicite du bureau, les champs complets des commandes et une recherche proche du terme déclarée, avec oracle XP sur le vrai progrès. La sélection transversale69cas ajoutait17rouges, dont14reproduits anciens. Dix attentes héritées ont été réparées sans changer les assertions métier : sept cas dont le helper de recherche ignorait la clé treeSowing291, trois cas dont « futur » était encore291, désormais famille prise en charge (292 reste fermé). Les reprises pertinentes sont acquises. Aucun contrôle interrompu n’est annoncé réussi.

| Contrat | Résultat acquis / borne |
|---|---|
| Règles et commandes | Recherche, flore potentielle, Culture6 à l’admission, toit/air/sol, huit voisins, engagements, protection des plantes souhaitées, interruption et coupe automatique stricte ; hydroponie exclue. |
| Sauvegardes | Treize nouveaux cas :290strict avant migration neutre, marque littérale sans getters/provenance déduite, détenteurs et arbre emballé, quotas sauvages, full/delta/Resident et rejet atomique ; famille292fermée. |
| Typage | Acquis après intégration, dernière passe17,624s. Seule une ligne vide finale de farming-save a ensuite été retirée : JavaScript compilé esbuild strictement égal, treize tests de conservation repris et18exports natifs rejoués entiers sur les sources finales. |
| Interface réelle muette | Chrome155/WebGPU1440×1000, recherche restante réelle, choix indigène au vrai select, deux réglages, approche/travail puis arbre276 au tick3659, recharges. Coupe et transport d’un arbre mûr préparé distinct acquis.18exports/11états entiers distincts, trois commandes et cinq recharges60RAF, par reprises. |
| Coût ciblé | Carte250²,512candidats/2384arbres/128intentions, cinq échauffements et25mesures : moyenne1,398ms, p95nearest-rank1,818ms, maximum2,221ms. Monde hors mutations permises et PRNG égaux ; coût courant seul, pas comparaison fonctionnelleV470, moteur entier ou gainFPS. |
| Présentation générale | Acquise163,670s, Chrome muet, mine/coupe et changements de vitesse. Zéro jump retenu et occupation solide ; deux signaux bruts de trajet/coupe restent dans le rapport, sans revendication de correction ou gainFPS. |
| Publication | Build Pages acquis6,387s ; produit dc4c3694, déploiement 5c7fdea3,20réponses HTTPS ciblées exactes. |

Les rapports courts restent dans [les contrôles ROOT](../../tmp/validation-runs/), avec [comparaison des26premiers diagnostics anciens](../../tmp/forestry-v471/baseline-comparison.json), [coût acquis](../../tmp/forestry-v471/performance/2026-10-23T16-32-40-502Z/report.json), [rejeu final des18exports](../../tmp/forestry-v471/final-native-replay.json) et [équivalence de format](../../tmp/forestry-v471/final-format-proof.json). Les essais initiaux et témoins restent indépendants ; originaux et références humaines sont préservés.

### Chronologie jouée et échec de survie conservé

La préparation initiale32² fournit un adulte Plantes8, un bureau acier, une recherche995/1000incomplète, abri/mobilier et technologie de mobilier déjà acquis déclarés,300repas/15médicaments finis, horaires ordinaires et réserve bois vide. Elle conserve le vrai site tempéré, le climat et tous les calendriers d’incidents ; aucun temps ni acquisition naturelle initiale ne lui est inventé. Le navigateur joue les cinq derniers points et les vrais semis. Le [parcours recherche](../../tmp/forestry-v471/native-ui/2026-10-23T16-30-20-612Z-research/report.json), le [semis partiel](../../tmp/forestry-v471/native-ui/2026-10-23T16-33-13-652Z-sow/report.json) puis [sa reprise propre](../../tmp/forestry-v471/native-ui/2026-10-23T16-35-35-351Z-sow/report.json) conservent les mêmes états et l’arbre276. Effets et musiquefalse, volumes0 avant chaque document, Chrome--mute-audio ; aucun défaut audio imposé au produit.

Deux échecs de pilote sont conservés : le premier appelait stepWorld avec zéro temps et adoptait alors un propriétaire d’incidents dans l’oracle ; les RAW initial/navigateur étaient identiques. Correction privée : ne pas appeler le moteur sans temps écoulé. Le second rechargeait le travail quand Chrome a signalé ERR_NO_BUFFER_SPACE ; ses exports déjà entiers restent acquis et la reprise repart de son propre semis3198, sans refaire les réglages ni donner de travail. Aucun correctif produit pendant ces reprises. La recherche restante et le semis ne prouvent pas1000points joués depuis zéro.

La [longue continuation moteur liée](../../tmp/forestry-v471/growth/2026-10-23T16-38-33-016Z/report.json) joue réellement196116pas depuis l’export natif3659 : **le même arbre276 atteint la maturité calculée>0,999 au tick199775**, sans assignation de growth, temps, besoins, météo, RNG ou propriétaires. Sept checkpoints entiers sont rechargés exactement. **L’essai global est échoué sur la survie**, conservé tel quel : Salomé182 récupère du premier raid, puis subit des plaies79170–79199, chute79199 et meurt d’une perte de sang80768 après le second raid ; aucun autre adulte joueur vivant disponible. Ce n’est ni une coupe acquise dans cette lignée, ni une campagne durable réussie. La croissance stockée brute reste un ancrage paresseux ; la maturité est celle du vrai lecteur plantGrowth.

Pour isoler la coupe, une **seconde préparation fraîche jamais jouée**, depuis l’état initial3000, fournit explicitement un arbre mûr275 et la recherche acquise ; elle ne répare ni ne remplace l’arbre276, la coloniste morte ou leur partie. Le [parcours natif de coupe](../../tmp/forestry-v471/native-ui/2026-10-23T16-42-16-384Z-harvest/report.json) montre travail, disparition du même275,27bois, portage et dépôt dans la réserve réelle, avec recharges. La [continuation d’usage](../../tmp/forestry-v471/consume/2026-10-23T16-45-22-909Z/report.json) paie un tabouret en25de ces seuls bois, conserve les deux restants puis gagne un nouveau semis par travail. Les bornes des deux témoins restent distinctes ; aucune saison/campagne complète ni autosuffisance en bois n’est déduite.

## Livraison et réévaluation

Produit **dc4c369403e84008dbd9b4e1655ab36d77149cc1**, commit puis push sur origin/main ; build Pages depuis ce produit6,387s et livraison Cloudflare16,436s. [Jouer](https://elsewhere-cq7.pages.dev/) / [déploiement immuable](https://5c7fdea3.elsewhere-cq7.pages.dev/). Le [paquet local](../../tmp/elsewhere-pages/v471-package-DVws0l/report.json) conserve552fichiers/153526029octets, dont les71chemins publics de catalogue/sauvegardes strictement égaux au public et au paquet V470. Seuls HTML et les scripts principaux/Workers explicitement autorisés peuvent varier ; aucune exemption générale d’assets ou copie de QA dans la livraison.

Les [20réponses HTTPS ciblées](../../tmp/elsewhere-pages/v471-http-xS8nNi/report.json), dix par adresse stable/immuable, sont exactes en octets et types. Ce contrôle prouve la disponibilité ciblée du paquet, pas une campagne navigateur publique ou tous les chemins en ligne. La métadonnée de livraison est enregistrée ensuite sans changement produit ni nouveau build. Documents :1116fichiers/10595liens à ce contrôle, six entêtes courants291 et trois originaux strictement inchangés.

Serveur QA5175/PID10220 arrêté après identité exacte le23octobre16:51:13UTC ; serveurs humains5173/5184, sauvegardes/historiques et références visuelles humaines préservés. La [réévaluation de tous les domaines et interactions](../development/audit-core-20261022.md#réévaluation-après-v471) retient un seul événement social collectif ordinaire à préparer, principalement ensemble3, avec primaire exacte et vrais propriétaires avant code. Aucun enchaînement automatique d’essences ou de variantes, ni retour automatique au vaisseau. Six ensembles, campagnes durables, victoire et cibleFPS restent ouverts.
