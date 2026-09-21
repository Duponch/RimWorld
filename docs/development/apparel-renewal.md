# Confection et renouvellement de l'habillement — contrat V90

Ce contrat étend la [confection](tailoring.md), l'[armure](armor.md), l'[équipement](equipment.md), la [recherche](research.md), les [textiles](textiles.md) et la boucherie avec une boucle physique de renouvellement. Les coefficients, sources et adaptations sont consignés dans la [recherche V90](../research/apparel-renewal-reference-v90.md).

## Catalogue et acquisition

Cinq familles peuvent être fabriquées en tissu ou cuir léger, soit dix combinaisons obtenables. Une pièce n'emploie jamais deux matières.

| Famille | Coût | Travail Core | PV | Couche et usage |
|---|---:|---:|---:|---|
| Tenue tribale | 60 textile | 1 800 | 100 | peau, torse et jambes ; emplacement d'artisanat ou tailleur |
| Chemise | 45 textile | 2 700 | 100 | peau, haut du corps ; tailleur |
| Pantalon | 40 textile | 1 600 | 100 | peau, jambes ; compatible avec la chemise |
| Cache-poussière | 80 textile | 10 000 | 200 | couche extérieure, torse/bras/jambes |
| Parka | 80 textile | 8 000 | 180 | couche extérieure, forte isolation au froid |

Le tissu vient du coton ; le cuir léger vient d'un lièvre chassé, transporté et dépecé. La matière détermine couleur, protection et isolation de l'instance. Le tissu isole mieux dans la parka ; le cuir léger augmente la protection et la chaleur résistée. Qualité et matière restent distinctes. Chemise + pantalon, tenue tribale seule, couche extérieure et gilet pare-balles respectent les conflits anatomiques déjà livrés.

L'emplacement d'artisanat reste limité à la tenue tribale et travaille à vitesse 0,5. L'établi manuel propose les cinq familles à vitesse 0,5. Le nouvel établi électrique 3×1 demande 75 bois ou acier, 50 acier supplémentaires, 2 composants, 2 500 Core de travail et Construction 4. Il consomme 120 W, travaille à vitesse 1 alimenté et 0,5 hors tension. Il est débloqué avec **Vêtements complexes** ; aucun projet Électricité fictif n'est ajouté.

## Factures, matière et ouvrages

Une facture choisit une famille et autorise séparément tissu et cuir léger. Le planificateur agrège plusieurs piles du même textile, jamais les deux matières dans une pièce. Disponibilité, rayon, filtre, réservation de toute la quantité, emplacement de l'ouvrage et identité sont prévalidés.

L'inachevé garde recette, matière, parties incorporées, auteur, progression et facture liée. Une reprise liée attend son auteur. Une annulation restitue 75 % de la matière incorporée selon la transaction existante. La fin bloquée ne consomme rien, ne change pas la matière et ne relance pas la qualité. L'XP Artisanat, passions, traits et qualité sont acquis sur le travail réel ; la vitesse du poste ne multiplie pas l'XP par unité de travail.

Les identifiants historiques `cloth-tribalwear` et `cloth-shirt` restent valides. Les nouveaux produits ont une instance dont matière, qualité et PV sont autoritaires. Carte, portrait, protection, isolation, libellé, valeur et inspection lisent cette même instance.

## Usure quotidienne

Une fois par jour local de 6 000 ticks, chaque vêtement porté par une personne vivante et présente subit un tirage privé : 40 % de perdre un PV, sinon aucune perte. Le parcours est stable par ID d'instance ; son calendrier et son PRNG sont persistés. Il n'avance pas les flux de combat, maladie, météo ou narration.

Cette usure s'ajoute aux dégâts d'armure et au feu. Elle s'arrête au sol, en réserve, en cargaison, dans un ouvrage ou sur une dépouille conservée. À zéro PV, l'instance portée est détruite sans restitution et toutes ses références dérivées sont invalidées. La détérioration extérieure générale des piles reste absente.

Les pensées existantes restent strictement sous 50 % pour « abîmé » et sous 20 % pour « en lambeaux ». Les PV n'affaiblissent pas progressivement protection ou isolation ; ils gouvernent état, valeur, politique et destruction.

## Politiques et remplacement physique

V90 persiste des politiques partagées avec ID, nom, familles admises, matières admises, qualités minimale/maximale et plage de PV. Deux préréglages sont disponibles : **Tout vêtement** accepte le catalogue présent ; **Tenue entretenue** exige au moins 51 % des PV.

L'onglet Assignations permet, pour chaque colon joueur, de choisir un préréglage et d'activer ou désactiver l'automatisation. L'éditeur de politiques (création, copie, renommage, filtres détaillés et suppression) n'est pas livré : le moteur et le format de sauvegarde portent les critères, mais l'interface expose seulement les deux préréglages. Captifs, visiteurs et morts ne reçoivent pas une affectation ordinaire.

Une évaluation espacée de 600 à 900 ticks locaux retire d'abord une pièce non admise, puis cherche un meilleur candidat. Le candidat doit être dans une réserve, accessible, non réservé, autorisé et hors feu. Le score tient compte des couches, de l'état, de la qualité, de l'armure et du besoin thermique disponible ; un gain inférieur à 0,05 est refusé. Les égalités sont résolues par ID stable.

Le remplacement emploie les gestes existants : trajet, réservation exclusive, retrait au contact, dépôt réel, habillage et libération. Accès perdu, candidat disparu ou sol saturé conserve l'ancien vêtement et libère les réservations. Deux personnes ne choisissent pas la même instance.

Un ordre manuel **Porter** marque la pièce `forced` ; l'automatisation ne la retire pas et ne choisit pas un candidat qui entrerait en conflit avec elle. Le retrait manuel enlève ce marqueur. Un contrôle séparé « Effacer forcé » sans retrait n'est pas encore exposé.

## Persistance et migration

Le schéma V90 sauvegarde matière, qualité, PV, marqueurs, ouvrage homogène, calendrier d'usure, PRNG privé, politiques, affectations, automatisation et prochaine vérification. Il refuse matériau inconnu, PV impossibles, propriétaire multiple, couches incompatibles, politique absente ou tâche automatique incohérente.

La migration valide V89 avant ajout. Les vêtements et inachevés historiques sans matière deviennent explicitement tissu, sans changement d'ID, de quantité, de parties, d'auteur, de progression, de facture, de qualité ou de PV. Le calendrier d'usure commence prospectivement ; aucun jour écoulé n'est rejoué. Les deux préréglages sont créés, mais l'automatisation des anciens colons reste désactivée. Les nouveaux colons commencent sur Tout vêtement avec automatisation active.

La migration ne crée aucun vêtement, textile, ouvrage, atelier, recherche, XP ou ressource. Une ancienne partie qui connaît déjà Vêtements complexes voit les nouvelles recettes et le plan de l'établi électrique, sans bâtiment gratuit.

## Performance et limites

Usure et politique travaillent sur des échéances persistées ; aucun vêtement n'est réévalué à chaque tick ou chaque image. La recherche automatique borne ses candidats aux piles de réserve puis emploie la navigation et les réservations communes. Le rendu réutilise le personnage GPU résident avec couleurs de matière et couches ; aucune ressource graphique n'est créée par instance.

V90 ne livre pas casques, chaussures, ceintures, équipement utilitaire, armures fabriquées, autres textiles/cuirs, vêtements d'enfants, effets de vêtement de mort, verrouillages de quête, détérioration extérieure, teinture, réparation, recyclage, éditeur complet de politiques ni catalogue Core complet. Le petit marchand V88 n'élargit pas automatiquement son stock.
