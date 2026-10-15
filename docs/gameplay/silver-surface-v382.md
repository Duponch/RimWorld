# Argent de surface — V382

16 octobre 2026 — schéma 243. Lot qualifié ; publication regroupée avec le prochain lot produit.

Les nouvelles cartes de site peuvent générer le minerai d’argent dans ses occasions rares déjà réservées : amas4–12, roche1500PV, base40 argent. Le minerai utilise accès, contact, coups80, compétence, cumul de rendement, portage, réserves/étagères et commerce existants. Le produit est la monnaie physique existante ; aucun nouvel objet, recette, recherche, banque ni matériau de construction.

Migration **242→243** : valider strictement la campagne242, foyer puis carte secondaire avec le schéma242, avant de changer seulement le numéro. Un `ore:'silver'` dans l’une ou l’autre carte242 est futur et refusé. Les piles/monnaie/filtres/argent profond242 restent licites et inchangés. Aucune régénération de terrain, création d’argent, attribution d’ID, recherche, progression ou consommation de PRNG au chargement.

Sources adoptées après revue ROOT et revue statique indépendante ; aucune exécution par les agents. Contrats : génération sur250², vrai minage/reprise/rangement/paiement au contact depuis le produit extrait ; ancienne monnaie et argent profond conservés ; futur minerai rejeté sur les deux cartes ; checkpoint et delta confirmés/refus atomique. Un seul SVG original est généré hors navigateur, avec les constructeurs existants. Aucun gain CPU/GPU chiffré revendiqué ; pas de nouvelle boucle permanente. Les64 fiches publiques et leurs payloads restent intacts.

[Référence, choix et limites visuelles](../research/silver-surface-core-v382.md). Les contrôles ROOT ci-dessous distinguent le périmètre acquis de la préparation du lot.

## Qualification ROOT

- Passe ciblée regroupée PASS24,288s :23cas/5fichiers, dont4nouveaux. Génération250², minage interrompu/repris, rendement neutre40, transport et achat au contact depuis la monnaie produite ; migration242 stricte sur les deux cartes, argent profond et monnaie historiques conservés ; checkpoint/delta et référence publiée des Aulnes.
- Typage toutes sources et fichiers changés PASS14,012s. Corpus64 PASS102,367s : SHA, migration, roundtrip, Decoder complet et immuabilité, sans faire jouer les anciennes parties. Présentation Chrome PASS140,535s, aucun saut/occupation solide dans ce périmètre250² ; aucune mesure générale de FPS.
- Deux adaptations de tests historiques : le minerai « inconnu » uranium était déjà livré depuis V378, le témoin utilise désormais unobtainium. Le générateur AulnesV381 reste verrouillé242 ; après changement du schéma, son test compare intégralement la migration neutre de l’artefact publié, sans réécrire le patrimoine. Les assertions originales restent dans leur branche242.

Les fichiers déjà sauvegardés ne sont jamais reconstruits depuis leur graine. Une nouvelle partie ou la première entrée sur un site utilise le générateur courant ; la revisite retrouve la carte sauvegardée. Recréer aujourd’hui une nouvelle partie avec un ancien choix planétaire et la même graine peut donc produire des filons différents : aucune identité de génération avec une ancienne version ou avec RimWorld n’est promise.

L’occasion argent garde son poids existant ; son remplissage peut déplacer une occasion suivante sur une nouvelle carte. Aucun cadeau d’argent à une ancienne carte. Le prédicat `validOre` rejoint la validation de terrain déjà effectuée sur les checkpoints complets ; pas de scan ajouté par image ou tick, ni nouvelle scène/instance par minerai. Le coût précis de ce prédicat au chargement et les FPS généraux ne sont pas mesurés.

Sorties actuelles sous `tmp/silver-v382/`, `tmp/validation-runs/v382-*` ; parents privés et anciens fichiers publics conservés. Produit qualifié localement, à committer/pousser puis publier avec la prochaine tranche cohérente. La production publique reste V381/bd2107e4 tant que cette publication n’est pas confirmée.

- Premier natif RED68,406s : le pilote attendait40pièces dans un seul cargo, mais le transport existant est borné à10unités. Aucun défaut d’extraction ou perte prouvé. Correction de l’oracle : premier cargo10, reste30 exact et toutes40pièces effectivement rangées après les trajets ordinaires ; capacité et règles inchangées. Typage après correction PASS12,677s, aucun corpus ou banc de présentation inchangé rejoué.
- Natif02 Chrome/WebGPU PASS52,583s : filon préparé32² intact, mineur sain niveau8 et marchand produit par le helper existant, sans monnaie coloniale initiale. Premier contact/dégât15019, mobilisation et export/réimport de la roche endommagée exacts ; reprise du même filon, produit40, cargo191→192/10pièces observé15211, rangement40 terminé15309. Achat réel d’un médicament au contact15340 : prix unitaire25,20, paiement arrondi25, reste15 et argent marchand accru25 ; monnaie totale conservée. Deux exports/réimports exacts, trois captures inspectées ROOT, erreurs[]/aucun incident simulation ou graphique.
- Build Pages PASS2,086s. Gel04 de3316chemins exact avant/après ; rouges et captures conservés sous tmp/silver-v382/native-01 et native-02. Cette scène démontre une chaîne préparée et jouée, pas la fréquence naturelle d’argent, une campagne complète ou une conformité exhaustive des règles de transport et de commerce Core.

Documentation initialement RED1,189s sur quatre en-têtes de schéma restés242 ; index mis à jour vers243, puis PASS1,192s, contrôle inchangé.

## Publication groupée

V382 est maintenant en production avec V383, déploiement **31deee1d**, produit `e147f81a`. Les 120 réponses HTTPS et le package sont vérifiés ; voir la [clôture V383](vent-v383.md#publication-v382v383). Les mentions de publication en attente ci-dessus décrivent le moment du commit V382.
