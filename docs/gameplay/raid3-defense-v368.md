# V368 — défense partielle du troisième raid

Schéma 238 conservé. Ce lot qualifie deux interventions réelles sur la même campagne, depuis le vrai export85531. Aucun moteur, règle, sauvegarde produit, rendu ou interface de jeu modifié. Le raid reste actif au dernier état ; aucun succès de défense, de soin global ou de recherche productive n’est annoncé.

## Parcours et limites

| Entrée → conservation réelle | Faits constatés | Contrôle ROOT |
| --- | --- | --- |
| 85531 →85961 | Trois originaux mobilisés par la vraie UI. Iris et Léonie réellement abritées85599 ; Gaël au poste128114. Ordre de tir au fusil accepté85831, sans blessure ennemie constatée. Repli commandé85887 ; porte interdite puis physiquement fermée85927. Premier nouveau dégât de porte16 observé85959. | Chrome/WebGPU RED90,372s ; body70,022s/overall85,452s. Entrée85531 exportée/rechargée exactement ; conservation85961 non rechargée. Gel2992 exact. |
| 85961 →85990 | Foyer sur la seule porte, vrai repair20149 et vrai démontage20150 par les deux pacifistes démobilisées. Mur nord18661 réellement démonté85986 : remboursement20151×2bois et perte3, sans tirage anticipé. Iris reprend ensuite une cuisine et entame une arête vers l’ouverture85987 ; garde de sortie civile85988. | Chrome/WebGPU RED39,978s ; body20,400s/overall35,161s. Entrée85961 exportée/rechargée exactement ; conservation85990 non rechargée. Gel2995 exact. |

Les deux parcours enregistrent erreurs[], lifecycle[] et artifactErrors[]. Deux recharges UI sont exactes, quatre captures inspectées ROOT. Les sorties rouges et leurs réservations restent conservées ; aucune entrée antérieure n’est rejouée favorablement. Le premier repli a protégé les personnes sans terminer le raid. La seconde tentative a ouvert un passage mais n’a pas qualifié le poste126110 ni un nouveau tir.

Iris a réellement fini son démontage puis choisi une tâche ordinaire autorisée : cuisine18884/bill18886, ingrédients encore à la source. Son passage124111→124110 commence85987 et finit85990,95. La garde a arrêté le pilote ; cela ne démontre pas une régression du moteur. Une consigne après achèvement peut arriver trop tard face à une décision de travail dès le tick suivant. Un futur mandat doit gérer cette reprise et la vraie arête en vol, sans déplacer Iris instantanément ni rejouer85961.

La réparation est réellement réservée et exécutée par Léonie depuis124114. À85990, progress61 et workRemainder2000, sans warmed : le premier seuil80 n’est pas encore atteint. **Aucun PV rendu n’est crédité.** La porte est fermée/interdite à34/104PV, damage70. Construction0 limite la réparation à0,255PV par tick local en pleine lumière ; elle ne soutient pas à elle seule la pression de ce couteau. Les nouvelles pertes de porte sont conservées.

## Pilotes et validation

Deux pilotes opt-in distincts sont ajoutés : raid-third-defense et raid-third-flank. Ils n’allouent aucun navigateur par défaut, utilisent les gestes réels du joueur et les lecteurs purs de géométrie sur l’état courant. Aucune avance de simulation ou RNG de combat n’est exécutée pour choisir une issue favorable.

La revue indépendante a corrigé, avant le premier contrôle, un faux signal de contact : un ordre de poursuite melee peut commencer à56 cases, avant la portée36,9 du fusil. Le premier mandat se replie àdistance20 ou frappe engagée. L’absence de l’ennemi exige une sortie physique enregistrée. Un danger découvert pendant la pause finale tente aussi une conservation UI ; une erreur PNG ne bloque pas cet export et reste rouge. Les bornes sont contrôlées après export/recharge finale. Ces protections restent dans les copies figées ; aucun validateur produit n’est assoupli.

Le second mandat est distinct et lié au ledger complet V367 et à son parent de défense. Il autorise uniquement la déconstruction18661, vérifie ses restitutions et admet les dégâts de porte tant que ses PV restent>20. Autres dégâts d’ouvrage, première nouvelle blessure humaine, incapacité, crise, infection distincte ou nouveau danger arrêtent. Le garde de cible ennemie est conservé : le stagger de balle courant ne supprime pas son ordre melee, aucune exception hypothétique n’est ajoutée.

ROOT seul exécute les contrôles successifs sur sources/tests/pilotes/inputs figés : typages PASS12,717s puis12,610s, deux natifs rouges bornés et leurs gels exacts. Aucun build, corpus, banc fuel ou test produit inchangé rejoué. Gate documentaire PASS1,205s. QA seule : produitV36528a2e8a9/publication2f42e85c et106HTTPS exacts restent acquis ; aucune nouvelle publication. Aucun gain FPS, campagne entière, parité exhaustive ou EA100% certifié.

## Preuves et prochaine entrée

Préparations et revues privées : raid3-85531, raid3-85531-independent, raid3-repair-85961 ; adoptions ROOT séparées raid3-adopted-01 et raid3-north-adopted-01 sous `tmp/early-access-defense/`. Les fichiers historiques restent intacts.

- Premier dossier natif : `raid3-adopted-01/native-01/raid-third-defense-Real-ra-92b94-otected-civilians-and-rifle/`. Conservation85961 SHA `996eb6ec714569d3ed87461d2b84f1e87b9ac6e718da7d9f2e336473d7dedc32`, ledger `9c4018a58e1efebc9ddb41b04097811c9b7c7201d2c649d4fb5cd1ec8a8b0e82`, summary `1cf5a23aa287946993f7e8f0f6e04f9e78c2b6ad195bdd48441e62d6e5b52052`.
- **Nouveau canonical** : `raid3-north-adopted-01/native-01/raid-third-flank-Real-raid-5883c-g-and-counterfire-from85961/conservation.json`, tick85990, SHA `7ef6d416f91042a03e7a877e341a71f8ef11163bd7168fc4b759c61e79b0eabc`, **non rechargé**. Ledger `8b9a885e63cd46d946a4affb614341ab011c69ab6ebafafb43bea2a71c3bc352` **resumeAllowed:false**, summary `5af400cbe0a369e6216d624fda5a36a6c40009f0055c5fe3d38642d90e24b4de`.

Au85990, Gaël est mobilisé123114, fusil18558 équipé et holdFiretrue ; six anciennes plaies traitées et infection1 toujours active, aucune nouvelle blessure. Iris est civile en arête nord et Léonie civile au vrai repair20149. Assaillant20141 reste126114, sans blessure constatée, frappant18648 ; la porte n’est plus une protection durable. Les deux visiteurs reposent encore dans la pièce. L’ouverture nord ne prouve plus une isolation thermique close.

Bois143 physiques : les141 antérieurs sont conservés plus les2 remboursés. Les douze plans de l’annexe restent non payés ; aucune annexe, Batteries, charge ou énergie utile acquise. Origine productive75566 et horizon111566 restent attachés au FULL ledger V367 fca539be6d24875ca99f31a4f14525769222172cbdd61b3031c91d68d2057591 ; le temps de défense ne remet pas ce budget à zéro.

Reprendre uniquement85990 avec nouveau mandat ROOT revu ; ne réactiver aucun ancien ledger. Priorité : reprendre le contrôle réel d’Iris et répondre à la brèche imminente, sans attendre passivement derrière cette réparation insuffisante. Ensuite seulement revenir à Batteries payées/utiles, matrice des trois biomes et extensions déjà autorisées. Références humaines, UI papier, personnes/possessions/mémoires, branches blessées et sessions préservées ; sous-métiers reportés.
