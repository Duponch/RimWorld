# V374 — preuve durable et clôture productive partielle

15 octobre 2026, schéma 238 conservé. Ce lot répare l’outil de qualification qui avait épuisé sa mémoire, puis clôt la campagne comme **partielle**. Aucune règle, interface ou source du jeu ne change. La publication produit V365 reste en place ; aucun build ou déploiement supplémentaire pour ce lot QA.

## Résultat utile et limites

Depuis le vrai état 93544 conservé après la perte du worker, deux interventions ont conduit au **98038**. Le repas déjà porté au départ a été consommé, la porte a reçu ses 25 bois et le bureau ses 100 acier ; leurs constructions et le début de recherche sont observés. Batteries atteint environ **0,45 sur 400 points**. Ni achèvement de recherche, ni réseau payé, ni charge/décharge utile ne sont qualifiés.

Les six paiements de murs perdus avec l’ancien worker restent non qualifiés. Les preuves précédentes, blessures, pertes anatomiques, dommages, biens et RNG restent conservés. La source historique de 488 555 964 octets n’est ni effacée ni reconstruite : sa projection opérationnelle de 92 897 octets conserve les tableaux causaux actuels et référence les six sous-arbres ancestraux par fichiers, SHA et pointeurs. Cette projection ne se présente pas comme le FULL original.

Le journal append-only écrit les payloads complets et les reçus export/recharge durablement. Le relecteur vérifie la chaîne, les bornes et l’état opérationnel ; les traces tronquées, altérées ou non scellées ne donnent aucune autorisation de reprise. Les métadonnées neutres restent false ; une continuation qualifiée exige en plus son sceau après rapport, attachment et contrôle de délai. Aucun agrandissement du heap ne masque la cause.

## Contrôles acquis, réutilisés à la clôture

ROOT seul, sources et pilotes figés :

| Contrôle | Résultat et portée |
| --- | --- |
| Extracteur privé | 17 cas bornés réussis ; extraction historique en flux, sans jeu ni génération |
| Journal et état opérationnel | 24 cas / 2 fichiers réussis, 2,709 s ; arrêt réel d’un processus enfant, intégrité, écritures partielles et refus de reprise |
| Typage | PASS 17,602 s |
| Chrome/WebGPU 93544 → 96565 | PASS 165,559 s ; repas hérité et porte payée/finie, deux recharges exactes |
| Chrome/WebGPU 96565 → 98038 | RED 99,473 s ; bureau payé/fini et recharge exacte 97908, arrêt sur une attente incorrecte du pilote |
| Images / conservation | Quatre captures inspectées ROOT ; trois recharges exactes au total, conservation finale 98038 non rechargée |
| Sources | 3 004 entrées uniques exactes avant/après natifs et à la clôture ; aucun contrôle inchangé rejoué |

Le second rouge vient du tabouret emballé 19695 : le pilote exigeait qu’il reste au sol en 123,111, alors que le stockage ordinaire l’a déplacé en 127,111. Son meuble contenu est inchangé. Le pickup/dépôt intermédiaire n’a pas été entièrement observé ; aucune chaîne de transport rétroactive n’est créditée. Il n’y a pas de bug du jeu démontré par cette garde trop stricte. Le ledger final de 105 982 octets et le journal de 126 413 octets ont bien survécu : relecture valide, état rejoué identique, aucune qualification ni reprise autorisée pour ce segment rouge. Les deux résumés disponibles ont errors/lifecycle/artifactErrors/conservationDiagnostics vides ; le premier échec métier demeure rouge.

Les logs restent sous `tmp/validation-runs/v374-*`. Les sorties natives sont sous `tmp/early-access-productive-research/worker-loss-adopted-01/`, dans `native-worker-loss-01/` et `native-worker-loss-02/`.

## État conservé et décision de clôture

Seul état réel actuel : `native-worker-loss-02/early-productive-research--961a2-energy-goal-only-in-summary/conservation.json`, SHA `d0e71c7b04c18282e7cad866bf02891db67ccd96373e38d3f49c94bb54bac40a`. Ledger SHA `7b78c1ab905fcf2ede4f36e7168db2f43eaee0cbf0f173dfb512f7b47cc29da5`, resumeAllowed false ; résumé SHA `a122ecfc8445a97d25e7775cf3bebf5ba0b3d9a6f7e79c77973432136c6c50f8`. Ne pas relancer les anciennes entrées 96565 ou 93544 pour obtenir une issue favorable.

Léonie recherche réellement au bureau ; Iris transporte du riz ; Gaël reste au repos médical. Une éventuelle reprise future doit conserver ces tâches et repartir de cet état avec une admission explicite. La borne historique 75566 → 111566 reste inchangée. L’analyse statique du profil de la chercheuse montre qu’elle ne permet pas d’achever seule les 400 points dans le temps restant, même sous des conditions optimistes : cette limite de scénario n’est pas un défaut moteur ni une raison de modifier les règles.

La demande humaine du 15 octobre au soir privilégie désormais les livraisons et les vérifications regroupées. **Ce lot est clos comme partiel ; la campagne n’est plus une condition préalable à tous les autres travaux.** Les trois biomes passent ensuite dans une vérification courte indépendante, puis viennent toundra, second site persistant et catalogue utile. La préparation longue historique reste disponible sans être exécutée automatiquement.

Les consignes et la roadmap courantes ont été raccourcies ; leurs chronologies intégrales restent dans les archives liées. Les pushes sur origin/main sont de nouveau explicitement autorisés par l’utilisateur. Références, branche UI papier, sauvegardes et sessions humaines restent préservées. Aucun gain FPS, campagne entière, parité exhaustive ou préparation early access complète n’est annoncé.
