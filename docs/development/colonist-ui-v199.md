# V199 — dossiers compacts et informations au survol

## Portée

V199 réorganise la présentation des personnes, des animaux domestiques et de la recherche à partir des quatorze images fournies dans `references_UI/` et du [relevé Core 1.6.4871](../research/colonist-ui-core-v199.md). La hiérarchie des informations, les proportions des dossiers et la séparation entre résumé, languettes, commandes et détails suivent cette référence. La palette pastel/papier de Lisière, sa typographie, ses portraits et son rendu 3D restent conservés. Les captures assemblées ne sont pas traitées comme une preuve de dimensions globales ou de contenu Core sans extensions.

Il s’agit d’une refonte de présentation, **sans nouvelle mécanique, sans migration et sans changement du schéma 182**. Les données proviennent des snapshots confirmés et les actions utilisent les commandes déjà livrées. Le contrat ne revendique pas une parité exhaustive avec RimWorld. Les preuves d’exécution sont consignées séparément dans [la validation V199](../history/validation-colonist-ui-v199.md).

## Inspecteur et navigation

Le dossier ouvert se trouve au-dessus de la rangée de languettes ; le résumé de la personne et les commandes restent dessous. Le résumé rassemble portrait, identité et activité. Les commandes directes gardent leur zone distincte : mobilisation, conduite face aux ennemis, ciblage, travail et annulation selon les permissions existantes. Les panneaux continuent de couvrir les HUD monde conformément au contrat général.

Les six dossiers ordinaires sont, de gauche à droite, **Journal, Matériel, Social, Bio, Besoins, Santé**. Prisonnier est conditionnel et s’insère **entre Matériel et Social**, conformément à l’ordre visuel Core. Le même ensemble de données peut être consulté pour une personne invitée ou ennemie ; cela ne lui accorde pas les commandes d’un colon. La navigation conserve le dossier choisi lorsque la nouvelle personne possède ce dossier ; une sélection incompatible avec Prisonnier revient à Bio.

Les nœuds d’inspection existants sont déplacés dans les dossiers, sans être clonés. Leurs sélecteurs, mises à jour et écouteurs de commandes restent utilisables. Les languettes disposent de rôles `tab`/`tabpanel`, de `aria-selected`, d’un focus actif unique et de la navigation Flèches, Début et Fin. Un changement de dossier ou de sélection ferme l’infobulle active.

| Dossier | Dimensions nominales CSS | Organisation |
|---|---:|---|
| Santé | 630 × 430 | Politiques/capacités à gauche ; anatomie et affections à droite. |
| Besoins | 580 × 520 | Besoins à gauche ; humeur et pensées à droite. |
| Bio | 514 × 489 | Identité/traits à gauche ; compétences à droite. |
| Matériel | 460 × 450 | Listes compactes par propriétaire et type de possession. |
| Social | 540 × 510 | Opinions réciproques puis interactions conservées. |
| Journal | 630 × 510 | Trois cases indépendantes puis événements. |

Ces nombres reprennent les proportions Core, mais sont adaptés au viewport CSS. L’inspecteur est plafonné par la hauteur disponible, le dossier se réduit en largeur et son contenu défile ; les marges, espaces, coins et résumé ne reproduisent pas au pixel le cadre Unity. Les languettes nominales de 30 px et le résumé/action d’au moins 124 px sont une adaptation locale, et non le résumé Core exact de 165 unités. Une fenêtre étroite adapte aussi les colonnes et la taille du portrait. Fermer l’inspecteur et quitter une sélection restent les comportements existants ; le clic sur la languette active ne constitue pas un nouveau mode de fermeture Core.

## Les six dossiers

**Santé.** La Vue d’ensemble regroupe régime alimentaire existant, politique médicale, auto-soin lorsqu’autorisé, douleur et onze capacités. La division principale est de 37,5 % / 62,5 %. Les affections anatomiques suivent l’ordre des parties, avec nom de partie, libellé clinique, indication de saignement et bouton `i`. Le survol d’une partie donne ses PV et son efficacité calculée ; celui d’une capacité présente sa valeur, les parties concernées et les modificateurs disponibles. Les lésions exposent sévérité, douleur, saignement et traitement réel. Les affections systémiques et la perte de sang continuent d’être visibles selon l’état médical.

Opérations est une sous-vue de la demande thérapeutique déjà livrée en V192 : amputation d’un membre directement infecté, motifs de refus, demande en cours et annulation. Elle remplace seulement la colonne gauche ; les affections restent à droite, comme dans Core. Aucun catalogue de chirurgie supplémentaire n’est créé. Les admissions, présence du patient, lit/chevet, consommation de dose, anesthésie et issue restent ceux du [contrat V192](surgery-v192.md).

**Besoins.** Les jauges majeures restent séparées des jauges mineures, ces dernières à 73 % de largeur. Nourriture affiche la réserve alimentaire réelle, malgré le nom technique `hunger` ; zéro signifie privation. Sommeil, loisirs, beauté et confort utilisent leurs valeurs existantes. L’humeur et les pensées forment la colonne droite, avec effets numériques et explications au survol. Cible, seuils, échéances de pensées et tolérances des loisirs sont des informations détaillées plutôt que des paragraphes permanents. Les données d’environnement et de pièce disponibles restent accessibles dans un volet repliable de Besoins.

**Bio.** L’identité, le sexe, l’âge disponible et les traits occupent la gauche. Les onze compétences livrées sont présentées en lignes compactes dans l’ordre Core en omettant Minage : Tir, Mêlée, Construction, Cuisine, Plantes, Animaux, Artisanat, Artistique, Médecine, Social, Intellectuel. Leur fond représente le niveau sur 20 ; les passions restent identifiables. Expérience, vitesse d’apprentissage et effets disponibles passent au survol. Les anciens sélecteurs de progression et descriptions sont conservés, même lorsque leurs éléments ne sont plus affichés comme paragraphes ou barres d’XP.

**Matériel.** Arme, vêtements, inventaire personnel et cargaison de travail sont distingués. Les lignes donnent qualité/état et les propriétés réellement disponibles ; le bouton `i` ouvre la fiche de l’instance. Déposer une arme, retirer un vêtement ou oublier une arme perdue reste soumis aux permissions et commandes existantes, avec transfert physique. Les informations de protection et d’isolation concernent la pièce réelle ; aucun score d’armure universel ni capacité de charge générale n’est ajouté.

**Social.** La table garde l’opinion de la personne sélectionnée et l’avis réciproque. Chaque sens possède sa propre décomposition au survol. Le dernier échange et jusqu’à douze événements sociaux conservés se trouvent sous la table. Une opinion n’est pas transformée en lien familial, couple ou histoire individuelle.

**Journal.** Voir social et Voir combat sont activés initialement ; Voir tout est désactivé. Chaque case se règle indépendamment. Les lignes gardent texte et tick réels, avec catégorie et ancienneté au survol. Localement, Voir tout ignore les deux filtres de catégorie ; dans Core, ce contrôle inclut aussi des événements de combat non compacts. Cette différence est une adaptation de l’historique disponible. Aucun lien de navigation blessure → auteur → bataille n’est créé.

## Infobulles et fiche d’informations

Un composant partagé remplace les aides natives `title` sur les cibles enrichies et présente également les anciens titres des contrôles. Il utilise **450 ms au survol de la souris**. Le focus clavier affiche l’aide **immédiatement**, adaptation volontaire d’accessibilité ; `aria-describedby` relie la cible à la boîte. Titre, texte et paires libellé/valeur sont affichés via `textContent`. Les chaînes d’une sauvegarde ne deviennent pas du HTML.

La boîte est confinée au viewport et se place à droite/bas de la cible avant de passer à gauche/haut si nécessaire. Une cible au clavier l’ancre à son rectangle. Sa largeur maximale locale est 300 px, plutôt que les 268 unités nominales de la boîte Core ; une seule boîte est visible, sans empilement de plusieurs infobulles. Sortie de cible, perte de focus, clic, défilement, redimensionnement, Échap et changement d’inspection ferment l’aide. La boîte suit la couche du dialogue natif ouvert pour rester lisible dans une fiche modale.

La fiche `i` est une fenêtre modale réutilisée, nominalement 880 × 660 px avec limites de viewport. La gauche présente des catégories et statistiques ; survol, focus ou clic d’une ligne sélectionne son explication à droite. La recherche filtre les données disponibles sans modifier le monde. Flèches Haut/Bas, Début et Fin naviguent dans les lignes ; fermeture explicite et Échap referment la fenêtre. Les entrées et explications sont copiées depuis la projection consultée à l’ouverture ; la fiche n’ajoute aucun état de simulation.

Les objets exposent quantité, limite de pile, nutrition si applicable, qualité/PV de l’instance, couverture, protection et isolation livrées. Une masse n’est donnée que lorsqu’elle existe dans les règles commerciales, avec ce domaine explicitement nommé : elle ne devient pas une limite du transport ordinaire. Personnes et lésions disposent aussi de rapports sur leurs seules statistiques disponibles. Il ne s’agit pas du rapport complet des statistiques Core.

## Animaux et Recherche

**Animaux** devient une table de huit colonnes : Nom, Sexe, Âge, Maturité, Soins, Enclos, Production, État. Nom/identifiant est un vrai bouton de repérage. Âge biologique, stade, politique médicale, état physique d’enclos, jauges lait/laine, gestation et activité viennent des animaux existants. Le survol complète position, nourriture, mobilité, familiarité et travail de collecte réellement engagé. Aucun maître, entraînement, aire assignable ou commande absente n’est présenté. Les attributs `data-domestic-list`, `data-domestic-animal`, `data-domestic-focus` et `data-domestic-details` sont conservés ; ce dernier désigne désormais la ligne complète.

**Recherche** présente le projet consulté, sa description, ses prérequis, sa progression et le lancement dans une colonne latérale gauche ; le projet actif, sa progression, la suspension et les chercheurs restent dessous. À droite, la carte Principal contient les dix-sept projets locaux en nœuds de 142 × 66 px dans un canevas de 850 × 430 px, avec leurs liens de prérequis. Le lien Vêtements complexes → Armure de reconnaissance est présent. La sélection du nœud change la description ; le lancement reste une commande distincte. Les petits boutons de lancement existants et leurs préfixes `data-*` sont conservés.

Les infobulles des nœuds donnent description, coût/progrès, prérequis et disponibilité réels. Une recherche peut être choisie sans poste exploitable ; le panneau explique alors l’attente. Aucun point n’est accordé par l’interface : déplacement et travail réel au bureau restent nécessaires. Le bureau avancé, l’alimentation et le multi-analyseur gardent leurs admissions existantes.

## Frontières et lacunes conservées

- Aucun récit d’enfance/adulte, titre individuel, compétence Minage ou incapacité narrative n’est inventé. Les profils historiques facultatifs conservent leur neutralité ; cette présentation ne leur attribue ni âge ni progression rétroactive.
- Famille, romance et relations permanentes structurées ne sont pas livrées. Les scores et mémoires sociaux existants restent des opinions dirigées.
- Le journal est borné par les événements conservés. Il associe les personnes par leur nom dans le texte, sans identifiants de participants : les homonymes demeurent une limite. Il ne reconstitue ni événements absents ni cause d’une blessure.
- Lésions et parties perdues ne conservent pas de provenance attaquant/arme. Les capacités affichent les facteurs locaux disponibles, sans prétendre fournir l’ensemble des facteurs ou estimations qualitatives Core.
- Chirurgie limitée à l’amputation thérapeutique V192 ; greffes, prothèses, organes et recettes médicales générales restent absents.
- Besoin Extérieur, addictions et besoins d’extensions ne sont pas ajoutés. Une description de pièce n’est pas une jauge supplémentaire.
- Aucune masse portée générale, armure moyenne générale, nouvelle consommation d’inventaire ou cargaison personnelle fictive n’est créée. Les propriétaires d’objets restent distincts.
- Le dossier Prisonnier expose seulement la détention/recrutement déjà implémentés. Les onglets conditionnels des extensions et les domaines Core non simulés ne sont pas des boutons décoratifs.

## Coût et preuve

Les contenus d’infobulles sont préparés lors des mises à jour de présentation ; un `WeakMap` les associe aux éléments sans lecture métier lors du mouvement du pointeur. Une unique boîte déléguée et un timer transitoire sont utilisés pour l’interface. Le déplacement visible programme au plus un repositionnement par image demandée ; **aucune boucle RAF continue n’est ajoutée**. Les dimensions de la boîte sont lues à son affichage ou à son rafraîchissement, pas à chaque déplacement de pointeur.

Les domaines gardent des listes bornées par les données et utilisent leurs signatures/caches pour limiter les reconstructions DOM : affections, relations, historique, possessions et identités animales. Le dossier déplace les nœuds existants ; la fiche d’informations réutilise un seul dialogue. Les nouvelles tables et explications restent dans le DOM de l’interface. Aucun lot graphique, acteur, texture, lumière ni charge de simulation/GPU n’est ajouté par ce chantier.

Ces choix ne prouvent ni coût CPU/GPU nul, ni hausse générale des FPS. Affichage/recalcul des explications et reconstructions DOM ont un coût ; sa portée doit être distinguée d’une mesure du tick ou du rendu 3D. La vérification centrale doit couvrir les dossiers, les commandes et refus existants, le clavier/survol, les fenêtres étroites, les changements de sélection et les données au même tick. Les résultats, scénarios préparés, contrôles omis et éventuelles mesures appartiennent à la preuve V199, pas à une promesse de ce contrat.
