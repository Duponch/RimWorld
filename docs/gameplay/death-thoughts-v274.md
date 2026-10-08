# V274 — décès, cadavres et inhumation

Le schéma **209** relie les décès humains, leur observation et les dépouilles physiques à l’humeur. Le joueur utilise les pensées de l’onglet **Besoins**, les tombes, leurs filtres/affectations et la commande **Inhumer** existants. Le porteur rejoint le corps, le transporte puis termine réellement l’inhumation ; aucun corps ni soulagement immédiat n’est fabriqué par l’interface.

## Référence primaire et règles

Core local **1.6.4871 rev590**, `Assembly-CSharp.dll` SHA-256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Sources : `ThoughtDefs/Thoughts_Memory_Death.xml`, `Thoughts_Memory_Misc.xml`, `Thoughts_Situation_Special.xml`, `PawnDiedOrDownedThoughtsUtility`, `PawnObserver`, `Thought_MemoryObservation`, `ThoughtWorker_ColonistLeftUnburied` et `Alert_ColonistLeftUnburied`. Décompilations privées sous `tmp/death-thoughts-v274-reference/` et `tmp/bereavement-reference-v181/` ; aucune source propriétaire ajoutée au produit.

| Pensée | Effet de base | Durée | Maximum |
|---|---:|---:|---:|
| Mort alliée vue | −5 | 2 jours | 5 |
| Mort extérieure vue | −3 | 1 jour | 1 |
| Mort familiale vue | −6 | 6 jours | 1 |
| Mort vue, Sanguinaire | +8 | 4 jours | 5 |
| Décès d’un colon appris | −3 | 6 jours | 5 |
| Dépouille fraîche vue | −4 | ½ jour | 3 |
| Dépouille non fraîche vue | −6 | ½ jour | 5 |

Les mémoires d’une même famille ont des effets décroissants : facteur **0,75**, ou **0,5** pour les corps vus. L’observation répétée du même corps renouvelle son souvenir sans créer une pile par passage. Le trait **Sanguinaire** neutralise les nouvelles mémoires négatives et permet la pensée positive de mort vue ; il ne neutralise pas la situation **Colon non inhumé**. Les deuils dirigés et familiaux historiques restent distincts.

Sur la carte, un témoin doit être éveillé, capable de voir, à moins de **12 cases** et avec une ligne de vue. La mort extérieure négative exclut les ennemis, sauf visiteurs locaux ; la mort familiale vue s’ajoute à la pensée alliée ou extérieure, sans la remplacer. Le décès colonial appris concerne les personnes qui n’ont pas vu la mort. Les corps humains au sol sont observables à moins de **5 cases** avec les mêmes conditions de perception. Un corps porté ou inhumé ne renouvelle pas cette observation. Après **strictement plus de 90 000 Core**, un cadavre colonial encore exposé produit la situation **−10**, sans empilement. Cette situation disparaît lorsque plus aucune dépouille coloniale admissible ne la justifie ; les souvenirs acquis suivent leurs propres échéances.

## Adaptations et présentation

Le domaine est prospectif, avec l’état optionnel `Pawn.deathThoughts` : au plus **25** références `{kind, otherId, at}`. Aucune histoire de décès antérieur n’est inventée au chargement. Les identités des défunts sont conservées ; l’inhumation ou la perte de la dépouille n’efface pas les souvenirs.

L’horloge conserve **10 Core par tick local** : le délai du corps colonial est donc **9 000 ticks locaux**, avec frontière strictement dépassée. L’observation Core espacée et aléatoire est adaptée en un passage déterministe toutes les **60 ticks locaux**, phasé par identité, sans nouveau tirage du RNG du monde. Les corps physiques retenus faute de cellule de dépôt utilisent leur représentation locale existante ; aucun déplacement fictif n’est ajouté.

Hors carte, les membres éveillés et voyants du même groupe de voyage peuvent être témoins d’un décès du groupe ; l’identité collective remplace les distances/obstacles d’une carte absente. Aucune dépouille hors carte ne produit observation de corps ou situation de colon non inhumé. Les exécutions et adversaires d’une bagarre suivent leurs exclusions primaires. Psychopathe, Cannibale et les modificateurs DLC absents restent hors domaine ; aucun bonus de meurtre n’est attribué sans auteur transporté par le pipeline commun de décès.

La liste d’humeur affiche effet, description et temps restant par le lecteur commun `moodThoughts`. L’inspection funéraire rappelle qu’une tombe évite les observations futures et que les souvenirs persistent jusqu’à expiration. Aucune nouvelle fenêtre, commande de pensée, cérémonie, culpabilité du tueur, pensée de meurtre Sanguinaire, idéologie ou trait absent n’est ajoutée.

## Validation

**102 cas uniques dans 18 fichiers**, dont **28 nouveaux** dans quatre fichiers V274, passent par reprises ciblées. Les frontières couvrent témoins/obstacles/éveil/vue/traits, parenté, piles et échéances, corps retenu puis matérialisé, putréfaction, portage/inhumation/exhumation, lecteurs stricts/anciennes vues, archives à leur horloge, voyages et les **62 sauvegardes publiques**. Typage **6,523 s** et build avec typage **6,986 s** passent. Les payloads et métadonnées publics restent inchangés.

Le premier groupe (**60,460 s**, 93/94 cas) conserve son rouge : l’attente du test d’exhumation oubliait le champ `type:'ground'` du propriétaire réel. La reprise avec le bridge général (**6,983 s**, 9/10 cas) conserve un second rouge : la fixture devait retirer la tombe après le spill, comme son consommateur de déconstruction. La reprise des deux parcours funéraires passe en **4,894 s**, sans modification du produit. Le fichier bridge général ajoute huit cas ; les 28 nouveaux passent tous.

**Chromium WebGPU matériel** passe en **17,730 s**, sortie privée `tmp/death-thoughts-v274-native-reprise-xLfDND`. Préparation clinique explicite : décès médical réel dans la fixture, pensée de témoin affichée par Besoins, ordre UI Inhumer, transport physique puis inhumation. Sauvegarde/rechargement exact pendant le portage au tick **3011**, puis après inhumation au tick **3087** ; mémoire témoin conservée, corps unique dans la tombe, erreurs vides. Captures relues ; navigateur et serveur possédés fermés. Le premier lancement du banc a échoué avant navigateur sur un import de helper Playwright sans extension ; il reste conservé séparément.

Ce parcours natif ne certifie pas un décès survenu spontanément en campagne, la fréquence écologique, une longue campagne sociale, une perte GPU ou un gain FPS. L’expiration et le renouvellement après exhumation sont contrôlés dans la simulation ciblée ; ils ne sont pas annoncés comme une campagne jouée dans le navigateur.
