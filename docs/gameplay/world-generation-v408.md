# Générateur géographique — premier lot V408

**17octobre2026, schéma256.** Premier lot intégré et qualifié pour un départ Atterrissage forcé250² dans les limites ci-dessous. Aucune publication produit acquise : **V403/e24c5731, schéma254 reste en production**. Cette étape ne clôt ni les fondations monde ni les voyages ; la nouvelle colonie de démonstration finale reste à créer après leur achèvement.

## Ce que relie ce premier lot

Nouvelle partie relie les paramètres du monde, sa génération dans le worker, la progression et le choix d’une vraie tuile à la création locale. Le parcours contrôlé à30% produit119904cases ; couverture, température, précipitations, population et liste ordonnée des factions font partie de ses entrées. La population règle les implantations, pas la taille de l’équipe. Annuler un brouillon ne doit ni avancer la partie courante ni lui attribuer ses personnes ou ses biens. Le parcours **Démarrer → confirmation → nouvelle carte en pause → export/recharge** a été contrôlé dans Chrome/WebGPU par reprises, depuis les vrais menus et le même export ; les premiers rouges restent conservés.

La fiche du site lit les coordonnées, le climat, le relief, les roches, les côtes, les rivières et les routes depuis la même géographie confirmée. Les implantations occupées ou adjacentes, les eaux et les montagnes infranchissables refusent l’implantation correspondante. Les tailles au-delà de la capacité restent indisponibles ; le départ composé qualifié ici est uniquement **Atterrissage forcé,250×250**. Aucun résultat n’est annoncé pour tous les scénarios, tailles, réglages ou biomes possibles.

La carte locale utilise la provenance du site : climat et calendrier initial, altitude et fertilité, sols et poches humides, eau côtière et fluviale, relief/roches/toits/grottes, flore, faune et ressources. Routes, éléments anciens, geysers et dotation initiale passent par leurs producteurs raccordés. Le départ contrôlé commence au tick0 avec les personnes dans les vraies capsules entrantes : ce n’est ni une installation déjà jouée ni une arrivée ouverte gratuitement. Les personnes choisies et les réserves sont des originaux aux propriétaires distincts, conservés lors des transitions.

La géographie passe au navigateur par une autorité confirmée et des projections séparées des cartes physiques. Changer la vue ne déplace aucun acteur ; une carte retirée ne devient pas une carte cachée ni un stock remboursé. Les marqueurs de camps ont leur durée propre, distincte des origines historiques nécessaires aux propriétaires hors carte.

## Conservation et adaptations

Le schéma255 est validé strictement avant conversion neutre vers256. Ses champs futurs sont refusés ; ses terrains, personnes, biens, tâches et calendriers ne sont pas régénérés. L’absence historique d’un nouveau marqueur reste une absence : aucune progression, maladie, provenance ou histoire n’est offerte au chargement. Les archives des Aulnes et les parties personnelles restent conservées. Une sauvegarde ou une création refusée ne doit pas remplacer le monde confirmé.

Le choix humain est « mêmes règles monde/voyages, PNJ actuels provisoires ». Les personnes anciennes emploient les producteurs déjà jouables, avec noms/profils originaux ; leur biographie, santé de départ, équipement et séquence interne de tirages ne reproduisent pas PawnGenerator. Le butin ancien jouable utilise une table originale, sans faux artefact, implant ou Luciferium. Les capsules gardent leurs vrais contenus, possessions, accès et travail d’ouverture ; les adaptations et limites sont décrites dans [Population et butin anciens](functional-ancient-population-v256.md).

Le rendu low poly3D et les pictogrammes sont originaux ; les eaux pigmentées et leurs flux ont leur adaptation graphique déclarée. Les règles et scalaires vérifiés sont distincts de cette interprétation. Ni une même graine, ni quelques oracles locaux ne garantissent les mêmes tirages ou la même composition finale que RimWorld Core1.6.4871. Les prototypes natifs PNJ non utilisés restent privés, hors de ce premier lot.

## Voyages encore partiels

Le [registre V407](world-maps-v407.md) et les raccords256 conservent cartes, groupes, animaux et propriétaires ; camp temporaire, travail, reformation, retrait et retour restent dans le contrat à terminer pour une seule colonie. Les contrôles de formation acquis ici ne constituent pas ce parcours entier.

- Une nouvelle formation256 admet les personnes autonomes malgré maladie mobile ou besoins bas, et les aliments réellement sélectionnés selon le régime. Les tâches/réservations actives continuent de refuser. Le portage des humains non mobiles, l’admission des prisonniers/visiteurs et l’interruption générale des travaux ne sont pas fermés.
- Le départ avec zéro provision peut être accepté ; il ne garantit aucune autonomie. L’estimation des jours de nourriture/forage et la confirmation Core en cas de provisions insuffisantes restent absentes ; aucun nombre de jours n’est inventé.
- Le choix des biens reste borné : aliments admissibles, argent, tissus/laine et fret bois/acier ; médicaments, composants, armes/vêtements au sol et autres biens jouables ne sont pas tous sélectionnables. Parmi les meubles minifiés, seul le bedroll est raccordé au transport collectif.
- L’action Autoriser existe pour une sélection de plusieurs piles ; son raccord à l’inspection d’une seule pile manque encore. Le futur parcours devra employer les vrais gestes disponibles, sans enlever gratuitement les interdictions de la dotation.
- La reformation réutilise encore une préparation et des prises physiques : adaptation visible à examiner face au transfert Core. Intention de route après camp, waypoints et couverture des menus restent à vérifier ; aucune destination historique n’est reconstruite. Le retour vers une origine retirée reste refusé.

Le parcours neuf Camp200 → ouvrage payé/coupe → fret → retrait/marqueur → retour/dépôt → recharge exacte est préparé, pas encore acquis. Les biens laissés sur une carte retirée ne sont pas remboursés. L’approfondissement de plusieurs colonies est différé ; le réglage1–5 deV407 est conservé, avec1comme référence.

## Qualification du premier lot

Contrôles exécutés par ROOT sur sources figées ; les reprises et limites restent distinctes :

| Contrôle | Résultat et limite |
| --- | --- |
| Usine composée05, Elsewhere/tuile0/roster359 | PASS27,005s pour l’ensemble du contrôle ; vraie carte250², tick0, capsules entrantes. Sauvegarde complète et admission à froid exactes. Ce temps n’est pas une mesure de génération navigateur. |
| Formation/Temple |19cas PASS12,840s ; périmètre ciblé, pas une campagne de voyage complète. |
| Population/butin provisoires |4cas PASS13,684s ; adaptations déclarées, pas tirages natifs identiques. |
| Typage main |Global PASS78,125s ; livraison incrémentale PASS5,163s après le correctif de propriétaire et les derniers témoins. Le premier passage conservé signalait176diagnostics dans64fichiers QA anciens ; les domaines historiques ont été explicités sans détendre les validateurs. |
| Observation navigateur02 | Même sauvegarde historique2274, en pause : WebGPU,173pipelines, errors[], PASS33,089s. Aucun tick joué, aucune preuve de nouvelle création ni de débit/FPS. Buffers recensés ~103Mo ; pas la mémoire GPU totale. |
| GPUresource04 |ROUGE conservé : allocation terrain3036528octets refusée et deviceLost. Le cycle de vie ne masque plus ce défaut ; sa cause matérielle précise reste inconnue. Il n’est pas requalifié vert par l’observation02. |
| Démarrer réel dans le navigateur | Natif06 a créé la vraie case50388/250²/tick0, capsules entrantes et ruche1 : ACK confirmé avant réponse, WebGPU/errors[]. Son oracle de transport homeTile obsolète garde ce run ROUGE64,461s. Natif07 PASS41,959s reprend son export EXACT, deux imports/exports UI sans aucun tick ni régénération ; deux captures inspectées. Les noms/IDs des3choisis et5réservés sont conservés. Nouvelle entrée UI et usine Node sont deux parties indépendantes. |
| Compatibilité QA ciblée |33cas distincts/5fichiers acquis par reprises ; dernière reprise2cas PASS12,945s. Les rouges restent conservés. Les projections sont comparées aux vraies cartes affichées, avec témoin indépendant du World complet ; les témoins synthétiques195 omettent uniquement leurs champs/permissions futurs. Aucune archive historique ni règle de validation détendue. |
| Compatibilité des archives publiques |66cas PASS221,033s : anciens payloads immuables, migration/validation, aller-retour complet et Decoder comparé à la vraie projection de carte. Aucun tick joué. Premier contrôle groupé ROUGE204,686s sur limite180s conservé ; mêmes assertions réparties par archive. |
| Présentation commune |PASS152,527s dans Chrome, réception MAIN réellement instrumentée et trois fenêtres de45s. Contrôles de continuité conservés ; aucune nouvelle fonctionnalité, campagne ou promesse de FPS déduite de ce banc. |
| Construction |Pages final PASS3,846s ;3cas Hive/GlowPod PASS10,701s ; documentation PASS2,002s avant cette seule mise à jour de résultats sans nouveau lien. Les87fichiers à imports SIM explicites produisent les deux mêmes chunks JavaScript, octets identiques avant/après ; les résultats navigateur non affectés sont réutilisés. |
| Publication produit |**Non acquise.** Vérifier les fichiers effectivement servis avant de modifier le statut ; dernière productionV403 inchangée. |

Export UI réel conservé : `tmp/world-foundations/world-creation-start-native-06/new-campaign.save.json.raw.json`, SHA256 `1158c22f170d9766a71a1d34fcbbefc00ad59ba8bb9a07cfe3baa92b805012a3`. Le second import/export reste exactement identique au premier au tick0. Les captures montrent le foyer toundra50388 et ses trois capsules encore entrantes ; aucun débit/FPS n’est déduit du compteur visible.

Entrée Node indépendante conservée : `tmp/world-foundations/factory-composed-05/complete-world.json`, SHA256 `4c7b5a00a50fb043ce324fd1388a9cc3233bb9fc9a4250dd94874b7f05ebe3cb` ; résumé `result.json`. Les rouges et leurs diagnostics restent conservés, sans total unique additionnant des contrôles qui peuvent se recouper.

Références et critères de fin restent dans [Fondations monde](../development/world-foundations.md), [Audit V406](../development/multimap-audit-v406.md) et [Génération des cartes](../development/world-generation.md). Aucun nouveau relevé primaire ou asset propriétaire n’est ajouté par cette note.

Une correction produit finale concerne la validation des couchages dans une caravane encore locale : le même colon reste situé sur sa vraie carte ; la vue du groupe ne le transforme plus en propriétaire hors carte. Trois cas contrôlent ce raccord, les IDs dupliqués et la contradiction carte/voyage. Le cache ne gagne aucune nouvelle exception. Les contrôles de création sans groupe et les archives déjà acceptées sont réutilisés après ce seul changement de classification ; leurs conditions ne sont pas élargies.

Le pilote de présentation accepte une URL explicite et peut injecter son même probe avant compilation ; les paquets QA instrumentés restent privés et ne sont jamais publiés. Les scripts Node concernés activent la transformation TypeScript requise par leurs classes. Les anciens pilotes UI encore bornés au registre historique restent explicitement non portés : leurs résultats antérieurs ne qualifient pas le registre courant.

La dernière correction de typage QA remplace une mutation de champ readonly par une copie de politique à valeurs égales, avant le témoin de référence. Les résultats de simulation non affectés restent réutilisés ; la suite complète du dépôt n’a pas été rejouée. Gel produit final1603chemins : `tmp/world-foundations/main-v408/source-freeze03.json`, SHA256 `73b8a8b7d34610703ac85f1b3077cf80ccf0cd8199b497379a3fdbed8943d351`.
