# V373 — reprise productive, retrait physique et limite du pilote

Qualification de campagne partielle, **schéma 238 conservé**. Aucun changement produit, de moteur, de règle ou de rendu ; V36528a2e8a9/publication2f42e85c reste publié. Le lot conserve chaque vraie issue88700→89523→89574→90588→93544. Aucun retour à un état plus favorable.

## Résultats et limites

Le troisième assaillant20141 se relève naturellement89501. Le premier contrôle s’arrête comme prévu au danger89505, puis conserve89523 : il est déjà en retraite physique vers le nord, sans engagement. ROOT autorise ensuite ce seul retrait observé, après lecture du moteur existant. Aucun bonus, blessure effacée, immunité ou attaque de barrière admise. Tout autre danger reste arrêtant.

La première fenêtre de retrait est rouge sur un défaut du pilote : Play×6 produit un premier échantillon89550, soit27ticks depuis89523, au-delà de GAP8. L’export89574 est conservé ; l’intervalle89523→89574 demeure explicitement non qualifié. La nouvelle admission part de cette vraie issue et reprend à×1 dès le premier clic tant que20141 reste sur la carte. GAP8 n’est pas augmenté.

Le contrôle suivant passe jusqu’à90588. L’assaillant sort réellement au124/0 à90100, avec sa chemise20142 à93PV, archive physique et possessions contrôlées. La baisse94→93 est compatible avec l’unique échéance d’usure90000 ; aucun tirage RNG n’est anticipé ou attribué rétrospectivement. Son couteau20143 reste interdit au sol. Aucun nouveau dommage humain ou structurel observé pendant cette fenêtre.

Léonie termine naturellement une ingestion : cargo20194, progrès41/44/47 vus90560/63/66, événement90569, constat90570 avec faim99,9733 et cargo consommé. La chaîne de prise à la source n’étant pas intégralement qualifiée, sourceChainQualified reste false. Au90588, elle nourrit déjà Gaël avec un autre cargo20197, progrès6/75 ; aucun ordre ne lui est redonné.

La continuation réelle90588→93544 avance la construction : les six murs restants sont présents à l’issue, ancien mur18619 réellement absent, porte20371 en frame avec20bois20373 et bureau20372 avec20acier20375. **Le worker Node épuise ensuite son tas4Go pendant la finalisation.** Le contrôle est rouge, même si le vrai export93544, sa recharge UI exacte et son attachment ont été atteints. Aucun ledger ni résumé final du segment n’a été écrit. Les observations intermédiaires en mémoire sont perdues : les six paiements historiques restent qualifiés, les six nouveaux murs sont seulement des constats d’issue, sans paiement rétrospectif crédité. Cette limite du pilote ne prouve pas un bug du jeu ou une régression mémoire de celui-ci.

Au93544, les trois originaux sont vivants, sans nouvel ID de blessure ; Gaël reste au repos médical avec six anciennes plaies traitées, le gros orteil perdu/pansé et sang0. Son infection1 n’est plus présente dans l’issue, sans guérison globale annoncée. Iris est en loisir ; Léonie nourrit réellement Gaël, cargo20383 HELD, progrès13/75 : laisser finir ce travail. Sept médicaments coloniaux et trois personnels restent distincts. Batteries0, aucun réseau, charge ou lampe sur batterie qualifiés ; l’annexe n’est pas réputée isolée ou achevée.

## Contrôles ROOT séquentiels

| Contrôle | Résultat |
| --- | --- |
| Typages des trois adoptions | PASS16,651s ;21,041s ;20,044s |
|88700→89523, Chrome/WebGPU | RED68,979s, garde de danger ; body40,076s/overall55,946s |
|89523→89574, Chrome/WebGPU | RED72,707s, cadence27>GAP8 ; body27,201s/overall48,915s |
|89574→90588, Chrome/WebGPU | PASS215,886s ; body149,224s/overall174,346s ; progrès partiel seulement |
|90588→93544 | RED201,755s, worker134/heap out of memory ; pas de bilan final |
| Exports/reprises et images | Cinq exports/recharges UI exacts atteints cumulés, dont le dernier avant l’échec ; sept images inspectées ROOT |
| Gels normalisés avant/après |3008,3009,3021 chemins uniques ; continuation étendue3024 exacts |

Les stdout des trois gels annoncent3015/3015/3027 avant normalisation : certains alias slash/antislash se recouvrent dans la table SHA. Les nombres uniques ci-dessus viennent des clés JSON finales ; les sorties historiques restent littérales. Le gel étendu3024 du dernier segment est exact après le rouge. Aucun banc produit, corpus, build ou déploiement QA inchangé rejoué.

Errors[], lifecycle[], artifactErrors[] et conservationDiagnostics[] sont acquis dans les trois résumés disponibles. Leur absence de bilan au dernier worker interdit de lui attribuer les mêmes listes vides. Le stack natif ne prouve pas une ligne JS exclusive ; le candidat principal est la sérialisation finale du FULL488555964octets, avec texte, objet, clone et deuxième sérialisation simultanés. Le prochain correctif doit borner cette mémoire et rendre les observations durables avant la fin du worker.

Le diff du pilote ne modifie aucune source du jeu. L’observateur matériel/recherche/fuel, les fenêtres alimentaires et le pipeline physique restent textuellement identiques au HEAD antérieur ; observateur SHA329f51f4. L’exception20141 reste nominative, avec retrait groupe3, progression nord, aucun engagement/coup et sortie physique plus biens. FULLs, anciennes issues rouges, treize dégâts de la crise, besoins, RNG, identités et horizon75566→111566 restent conservés. Les anciens false ne sont pas réactivés.

## Preuves et prochaine entrée

Dossier commun : `tmp/early-access-productive-research/`.

- Premier rouge : `post-tantrum-adopted-01/native-post-tantrum-01/`, vraie issue89523/SHA4e4fef78, FULL3605249c, résumé36f1b96d.
- Rouge cadence : `post-retreat-adopted-01/native-post-retreat-01/`, vraie issue89574/SHA32822090, FULL02f72525, résumé32a54886.
- Fenêtre qualifiée : `post-retreat-gap-adopted-01/native-post-retreat-gap-01/`, final90588 SHA `2643d7d76f9a5297f4a4004a499141bdd8ebdd1020becb77444778bde39b7505`, FULL `ccd1f912f7c70d4a0d1bd29ffdcb04617cee021af3edc62c7273ece0183f18d6`, résumé `be46c40ae5bd8c9724350938775c3f154ae3b4a93aa334f06fd4ae31d78d3b99`. Ce true historique n’autorise pas à rejouer90588 après l’avancement93544.
- **Seule entrée réelle suivante93544** : `post-retreat-gap-adopted-01/native-post-retreat-gap-02/early-productive-research--961a2-energy-goal-only-in-summary/final.json`, SHA `8f10bc05af435cb83e746c4049f3c94809754b8995aec13f56ebd7d96c12a65d`. Attachment identique ; pas de ledger/résumé final.
- Conservation ROOT distincte : `post-retreat-gap-adopted-01/worker-loss-93544-root-preservation.json`, false ; référence le dernier FULL durable sans le modifier ni lui inventer le segment perdu.
- Revues statiques privées : delta89574 `07d0a1b7`, preuve90588 `4c0aa845`, diff suivi `b2994a24`. Aucun contrôle lourd délégué.

Reprendre depuis93544 uniquement après nouveau mandat ROOT qui porte explicitement l’intervalle non qualifié et protège le feeding13/75. Corriger d’abord la finalisation mémoire et la durabilité du pilote. La revue statique révèle aussi que la batterie prévue124117 serait enfermée entre bureau et murs sans case de construction cardinalement accessible : corriger ce plan QA avant sa désignation, sans changer les règles de construction. Finir bureau/recherche utile et réseau reste prioritaire, puis matrice trois biomes et extensions déjà autorisées. Aucun succès futur, campagne entière, FPS ou EA100% certifié.

Commits locaux seulement. Le push V372 a été refusé par la revue automatique au titre de la consigne AGENTS réservant les pushes à l’utilisateur ; la demande d’accord explicite a déjà été posée et reste sans réponse. Aucun nouveau push, publication indirecte ou remise à zéro. Références, branche UI papier et sessions humaines préservées ; sous-métiers reportés.
