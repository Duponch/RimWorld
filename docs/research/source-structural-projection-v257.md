# V257 — éviter les seeds structurels, conserver le coût complet

Le candidat est écarté après composants et coût : seuil déclaré non satisfait, aucun FPS ajouté. Produit V242/schéma 198 conservés. [Contrat](../development/source-structural-projection-v257.md), [preuves](../history/validation-source-structural-projection-v257.md).

La cause visée est concrète dans le producteur V256 : le nombre de membres est comparé avant l'application des edits, puis retraits, nouveaux IDs et changements de kind provoquent aussi un seed. Ce seed recopie les Resource utiles, initialise l'agenda, observe les naturels et renouvelle la génération. Le journal MAIN reçoit alors un full, invalide les anciens curseurs et peut faire reprendre un parcours Nature complet. Cette cascade est visible dans le code ; les onze fulls de la fenêtre V256 ne disposent toutefois pas de motifs archivés permettant de les attribuer individuellement à une action.

V257 préserve les rangs relatifs des survivants et ne traite que les mutations du paquet. Les rangs ne sont ni les IDs ni les ordinals courants du tableau. Cette distinction permet de conserver l'ordre des cultures et des naissances sans recenser N membres après chaque suppression. Ordre arbitraire et frontières de contexte restent complets, et les insertions/shifts agricoles restent payés. Les helpers mathématiques et le backend d'agenda ne changent pas : ce n'est pas un nouveau certificat ou une nouvelle heap.

Les références primaires sont réutilisées des recherches V255/V256 :

- La [sérialisation structurée HTML](https://html.spec.whatwg.org/multipage/structured-data.html#structuredserializeinternal) conserve le graphe d'un message, sans rendre gratuit son volume. La réduction des fulls et octets doit donc rester distincte du temps de publication/livraison réellement mesuré.
- Le [modèle des Workers](https://html.spec.whatwg.org/multipage/workers.html#worker-processing-model) ne confère aucune autorité sur un World du seul fait de son emplacement. Le contrat numérique et la fermeture source hérités ne remplacent ni le lecteur strict MAIN ni sa qualification native manquante.
- La [documentation Vite des Workers](https://vite.dev/guide/features.html#web-workers) motive la conservation des véritables entrées et IDs canoniques. Les importations dynamiques dormantes du banc doivent rester résolubles ; leurs modules copiés ne sont pas pour autant chargés dans la mesure.
- La [référence Performance Chrome](https://developer.chrome.com/docs/devtools/performance/reference) distingue temps propre, descendants et parents. Circuit, source et callback se recouvrent ; leur addition ne forme pas un budget CPU et un corpus sériel ne fournit pas un FPS.

Le critère de poursuite est écrit avant le coût : sur Aulnes, au moins 5 % de baisse du circuit complet ; à défaut, au moins 20 % de baisse du callback, avec circuit ≤102 % et source ≤110 % du produit. Ce seuil est une décision d'investissement dans la qualification restante, pas un test de signification statistique ou une preuve d'adoption.

Le coût constate un full/97 paquets par corpus, contre les 11 Aulnes et 19 mixed observés dans V256. Le volume de valeurs passe à 2 640 216 octets Aulnes et 386 904 mixed par cohorte B. Ces volumes déterministes expliquent ce que le prototype retire ; ils ne permettent pas d'additionner ou de comparer causalement les durées de deux bancs exécutés dans des états chauds différents.

Sur le nouvel ABBA, Aulnes circuit −1,99 %, callback −11,46 %, source presque neutre ; mixed circuit −0,26 %, callback −7,73 %, source +0,51 %. Le callback local s'améliore, mais le critère préalable échoue. Les p95 de circuit ne montrent pas d'amélioration nette ; froid et maxima conservent leurs variations dans les preuves. Aucun profil exclusif n'attribue le résidu à une phase précise.

Décision : ne pas engager les grands graphes natifs, le GAME ou un build de ce candidat. Les états finaux/RNG exacts du coût et les composants ne qualifient pas tous les graphes intermédiaires, le raccord MAIN fixe, le GPU ou la reprise complète. L'audit Aulnes V256 ne se transfère pas automatiquement à la nouvelle Source leaf V257. Aucun gain de langage, 240 FPS ou résultat général à toutes les parties n'est établi.
