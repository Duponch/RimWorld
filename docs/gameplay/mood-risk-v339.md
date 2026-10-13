# V339 — rendre visible le risque lié à l’humeur

13 octobre 2026. **Unités, build et natif acquis ; commit/push et livraison restent à consigner.** Une alerte préventive rend visible le franchissement d’un seuil d’humeur déjà simulé et conduit vers ses causes. Aucun défaut de déclenchement des crises n’est établi. La pensée supplémentaire de sommeil au sol reste hors périmètre ; moteur, rendu, bridge, schéma et règles de sauvegarde restent inchangés.

## Référence et adaptation

La recherche privée `tmp/early-access-v339/mood-risk-priority.md` attribue ses références à **Core1.6.4871 rev590**, installation locale relue le13octobre. Assembly-CSharp.dll : SHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`, identique à la provenance des extraits V211. Aucun code propriétaire n’est ajouté au produit.

Le [registre d’adoption](../research/reference-adoption.md) relie V64 à **SYS/TEST-081** pour humeur, causes et gel selon éveil, et V103 à **SYS/TEST-023..025 et076..080** pour les producteurs de pièces et leurs souvenirs. Ces références situent les causes déjà livrées ; V339 adapte seulement leur visibilité préventive sur le moteur existant, sans clore globalement ces identifiants ni ajouter une pensée ou constante de seuil indépendante. Les [recherches d’humeur](../research/mood-reference.md) et [de crises](../research/mental-break-reference.md) restent datées ; l’audit local1.6 ci-dessus précise la provenance actuelle.

Les Defs Stats_Pawns_General et Traits_Spectrum définissent le seuil mineur de base35, Résolu−9 et Nerveux+8. Les classes MentalBreaker, BreakRiskAlertUtility, Alert_MinorBreakRisk et Alert_MajorOrExtremeBreakRisk confirment la comparaison stricte, les groupes exclusifs et la priorité de l’alerte haute. Le majeur local utilise déjà4/7, adaptation numérique du facteur float Core0,5714286 ; aucune égalité bit à bit avec ce float n’est prétendue.

La [présentation officielle RimWorld](https://rimworldgame.com/) décrit le lien entre situations, besoins, blessures et stress pouvant conduire à une crise. L’[annonce primaire Alpha14](https://ludeon.com/blog/2016/07/alpha-14-preview/) situe historiquement les crises mineures, avec un seuil alors cité à **40%**. Ce chiffre historique ne remplace pas le **35% de base du Core local1.6 vérifié**. Les annonces établissent le sens du mécanisme ; les seuils retenus proviennent de l’installation identifiée et de l’autorité moteur existante.

Core masque l’alerte mineure en présence d’un majeur ou extrême. Son titre compte seulement le groupe de gravité maximale ; ses cibles critiques rassemblent extrêmes puis majeurs. L’adaptation Elsewhere conserve cette structure, avec tri par ID dans chaque groupe et ouverture de **Besoins**. Le tri Core par ID et son ouverture automatique de Needs ne sont pas démontrés : ce sont les choix de l’interface locale. Caravanes, transporteurs, DLC, tous les blocages hediff et clic droit inversant le cycle Core restent hors de cette adaptation bornée.

## Contrat joueur et raccords

La projection pure lit le snapshot confirmé et réemploie exclusivement [breakThresholds](../../src/sim/traits.ts), comparant l’humeur **courante non arrondie**, jamais la cible. Une personne appartient au seul groupe maximal franchi : extrême, sinon majeur, sinon mineur.

Le module [mood-risk-alerts](../../src/ui/mood-risk-alerts.ts) expose `readMoodRiskAlerts(world):MoodRiskAlert[]`, zéro ou une alerte. Clés **mood-risk-minor/mood-risk-high**, libellés **Risque de crise mineure/majeure/extrême · N colon(s)**, destination `tab:'needs'`. Le raccord ajoute `StatusAlert.tooltip` avec l’infobulle personnalisée existante, sans titre natif. Le parcours natif valide ces raccords dans les deux situations ci-dessous.

| Profil existant | Mineur | Majeur | Extrême |
| --- | ---: | ---: | ---: |
| Sans effet de trait sur les seuils | 35 | 20 | 5 |
| Résolu | 26 | 104/7 | 26/7 |
| Nerveux | 43 | 172/7 | 43/7 |

L’égalité n’appartient pas au niveau correspondant : sans trait,35 ne signale aucun risque,20 est mineur et5 majeur. Optimiste/pessimiste modifient la cible d’humeur, pas ces seuils.

Au plus **une ligne préventive** figure dans le secteur mental des [alertes](../../src/ui/status-alerts.ts), après l’absence expliquée et les crises actives. Sans risque élevé, elle représente les mineurs ; sinon la ligne haute prend le titre et le **compte du groupe maximal**. Exemple : un extrême, deux majeurs, trois mineurs donne un titre extrême comptant **un**, des cibles critiques **un+deux**, et les trois comptes séparés dans les détails. Les mineurs ne deviennent pas des cibles du clic critique.

Les cibles sont ordonnées **extrêmes puis majeures**, ID croissant dans chaque groupe ; la ligne mineure suit les IDs croissants. Deux clés stables, mineure et haute, préservent l’identité de l’alerte, y compris quand la gravité maximale passe de majeur à extrême. Les noms, niveaux d’humeur et comptes ne deviennent pas des clés. Renommage, refresh et remplacement de colonie réemploient les cycles et resets existants.

Le périmètre inclut seulement les colons **locaux libres vivants**, explicitement non prisonniers, non à terre et sans crise active. Sont exclus visiteurs/autres factions, morts, animaux/mécanos, propriétaires hors carte et occupants encore contenus dans les capsules. La faction historiquement absente garde sa signification coloniale. Mobilisation et pacifisme ne sont pas des exclusions. Aucun ancien emplacement d’un voyageur n’est reconstruit.

Une personne endormie ou en cooldown reste avertie : le filtre n’utilise pas moodFrozen pour la retirer. Santé et les alertes de disponibilité gardent les personnes à terre ; les crises déjà actives gardent leur propre feedback. Ce risque ne devient pas une menace dans l’inspection.

## Risque et déclenchement

Humeur sous seuil ne signifie ni crise certaine, ni entrée immédiate, ni type de crise garanti. Le [moteur existant](../../src/sim/mental-break.ts) combine exposition, tirage aléatoire, catalogue et admission physique. Sommeil, conscience, état à terre, récupération ou arrestation portée peuvent empêcher l’entrée. Les compteurs peuvent évoluer durant le sommeil ; le cooldown ne décroît que hors humeur gelée. L’UI n’annonce aucun compte à rebours, probabilité instantanée ou imminence certaine.

L’infobulle explique le seuil personnel et la part aléatoire. Le raccord clic, Entrée et Espace suit les vraies cibles et ouvre **Besoins**, où [l’inspection d’humeur](../../src/ui/mood-inspection.ts) expose déjà humeur, cible, pensées et marqueurs personnels. Les noms sauvegardés passent par textContent. Aucune pause, son, historique, modification de disponibilité, ordre médical ou nouvelle commande moteur n’est ajouté.

La lecture ne doit appeler ni updateMentalBreak, ni mentalState, ni expiration de pensée : ces fonctions peuvent muter horloges, RNG, possessions ou état. Un parcours des seuls humains locaux et les tris des trois groupes suffisent, sans calcul de pensées, pathfinding ou parcours de tous les propriétaires à chaque affichage.

## Validation et limites

ROOT a acquis le groupe unitaire **PASS78cas/7fichiers en12,410s**, dont **20nouveaux/1fichier**, le **build Pages avec typage PASS16,914s**, puis le **natif Chrome/WebGPU PASS45,407s**. Gel **2859entrées exactes**, conservé pendant les contrôles ; aucun changement produit après ce gel ni rouge natif V339.

Les contrôles ciblés couvrent le lecteur et ses seuils, groupes/cibles, exclusions, sommeil/cooldown, lecture sans mutation et raccords d’alertes. Les régressions des besoins, traits, crises et cycles de focus restent dans le groupe acquis. Ces preuves unitaires ne remplacent pas l’observation de l’interface dans le navigateur.

| Parcours natif | Preuve acquise |
| --- | --- |
| Six personnes préparées :1extrême/2majeures/3mineures | Titre et compte du groupe maximal, cibles182→183→184 par Entrée/Espace/clic, ouverture Besoins ; continuation3000→3012 et recharge3012 exacte |
| Continuation littérale du camp V338 | Checkpoint39073 SHA256 `e6eea52468ce91196a2a3b816b1df488e09acf47a498bfddb6891bb810a21925`, sans préparation d’humeur ; Gaël18532 Nerveux, humeur31<seuil43, au repos, alerte mineure ; continuation39073→39087 et recharge39087 exacte |

Les deux exports se désérialisent à l’identique du monde courant. Horloge×1 vivante, focus et identité du nœud conservés au refresh, cycle réinitialisé après chargement ; deux recharges exactes, backendWebGPU et erreurs`[]` dans chaque parcours. L’infobulle personnalisée expose les trois groupes ; le nom `<b>Majeur B</b>` est rendu comme texte littéral, sans HTML interprété ni attribut title natif. ROOT inspecte les quatre captures Besoins/recharge. Rapport privé : `tmp/early-access-v339/native/mood-risk-v339-V339-native-b5435-eral-food-camp-continuation/mood-risk-summary.json`.

La scène préparée qualifie affichage, cibles et navigation ; la continuation V338 qualifie une alerte sur une humeur réellement présente dans ce camp, sans forcer ses valeurs. Aucun parcours ne constitue une nouvelle preuve de crise naturellement déclenchée, de distribution Core exhaustive, de campagne entière, de suite complète ou de gainFPS. La première chaîne alimentaire V338 conserve sa preuve indépendante, commit/push6f8e9dcf. Contrôle documentaire PASS1,583s. Le lot V339 est conservé dans Git ; publication regroupée et suite prioritaire : deuxième cycle alimentaire, réserves et soins depuis le camp acquis.
