# V369 — troisième raid défendu, pertes conservées

Schéma238 conservé. Ce lot QA regroupe le contact et sa continuation sur la même campagne réelle85990→86133. Aucun moteur, règle, rendu, interface ou sauvegarde produit modifié. Le raid est réellement défendu ; les pertes et le besoin de soins restent présents. Aucune guérison, recherche productive, campagne entière ou performance certifiée.

## Deux interventions d’un même engagement

| Parcours | Faits observés | Contrôle ROOT |
| --- | --- | --- |
| 85990→86114 | Iris revient réellement après son arête héritée puis se replie121113 ; Léonie se replie122112. Leur mobilisation abandonne légalement les61,2unités du repair20149, sans PV réparé. Porte18648 détruite, observée86009. Gaël reste123114 et combat réellement au contact. Nouvelle garde anatomique observée86112 après perte du gros orteil gauche86111. | Chrome/WebGPU RED56,888s ; body36,619s/overall51,405s. Entrée85990 exportée/rechargée exactement ; conservation86114 non rechargée. |
| 86114→86133 | Seul Play×1 après import/export/recharge exacte. Aucun nouvel ordre d’attaque, déplacement, mobilisation, équipement ou réparation ; les mêlées et récupérations capturées continuent. L’ennemi tombe86130 ; raid3 reason defended/killed0/downed1. Issue86133 exportée/rechargée exactement. | Chrome/WebGPU PASS31,457s ; body11,213s/overall26,165s. Zéro ordre de domaine dans cette continuation. |

Les deux parcours enregistrent errors[], lifecycle[], artifactErrors[] et conservationDiagnostics[]. Trois recharges UI exactes et quatre captures inspectées ROOT. Le rouge initial et les réservations de chaque entrée restent intacts. Aucun ancien état n’est rejoué favorablement ; toutes les pertes, possessions, blessures et clocks sont conservées.

Le menu Tirer est accepté86016 : cela ne prouve pas une balle partie ou un impact. La première frappe de Gaël relève d’une mêlée automatique auto:draft observée86021 ; poing droit hit àCore860211, première contusion ennemie née86022 et constatée86023. Le menu mêlée86026 hérite de ce combat et de sa récupération. Les dégâts ennemis ne sont donc pas attribués aux seuls clics manuels. La dernière frappe conservée de Gaël est grip/hit àCore861291, suivie de deux lésions ennemies nées86130. Aucun jet futur n’est exécuté pour décider de la suite.

## État réel à l’issue

Gaël est vivant, debout et mobilisé123114, fusil18558 toujours équipé. Il garde six anciennes plaies traitées et trois nouvelles26/27/28, nées86053, encore non traitées : fissure tibia droit et coupures torse/jambe droite, chacune8499unités. Missing exact : `{part:'left-big-toe',bornAt:86111}`, sans identifiant de blessure inventé. Neuf plaies sont présentes, nextInjuryId30, bloodLoss4841532 et saignement toujours actif. La continuation ne crée pas de nouvelle plaie ou missing supplémentaire, mais la perte de sang augmente normalement. L’infection1 du torse reste active, severity586467104/immunity940932382 ; aucune guérison n’est déduite de cette avance.

Iris121113 et Léonie122112 restent saines, mobilisées et immobiles ; les deux visiteurs19768/19771 sont encore couchés, sans nouveau dommage de ce lot. Leurs anciennes blessures, l’infection du visiteur19771 et les biens personnels restent distincts. Dix médicaments coloniaux19678 restent au sol124114 ; trois personnels19776 restent chez le visiteur. Aucun soin ou invariance future de doses n’est promis.

L’assaillant20141 est **à terre**, vivant124114, neuf lésions, et n’a pas été capturé, soigné ou supprimé. Son couteau20143 est réellement lâché au sol124113 et interdit ; son éventuel relèvement reste un risque futur. Le raid3 est achevé86130, completed3, killed0/downed1. Gaël conserve encore la récupération de sa dernière frappe jusqueCore861411 ; sa commande melee est devenue nulle normalement. Aucune poursuite ou exécution n’a été ordonnée.

Porte18648 détruite et mur nord18661 démonté demeurent absents. Le ledger destroyed count2/lostwood30 est conservé tel quel : cette somme contient des pertes antérieures et n’est pas attribuée entièrement à ce seul segment. Le vrai remboursement nord20151×2bois reste hérité, avec deconstructed count1/lostWood3. Bois143 physiques, meubles/paquet tabouret et douze blueprints20050..20061 non payés restent identiques. Aucun nouveau dégât collatéral d’ouvrage observé ; aucune enceinte thermique close, annexe, bureau, Batteries ou énergie utile acquise.

## Mandats, gardes et contrôles

Le premier mandat accepte la perte réelle de la porte et les blessures ordinaires du seul combattant, sans garantir la victoire. Il s’arrête à la première partie manquante et conserve ce rouge. Le mandat suivant est explicitement distinct, lié au vrai86114 : la poursuite du même engagement accepte les pertes anatomiques de Gaël jusqu’à une véritable incapacité fonctionnelle, douleur incapacitante, défaillance vitale, downed/death, perte d’arme ou crise. Aucun soin, buff, changement de règle ou reset de récupération. Les autres protégés gardent leur premier nouveau dommage arrêtant ; Gaël reste sur son poste, les civiles dans leurs refuges. Nouveau danger, infection distincte et limites de biens arrêtent aussi.

ROOT corrige la copie de continuation avant contrôle : deadline active lors de la garde finale et après export/recharge ; hausse nextInjuryId des autres protégés pour détecter aussi une lésion fusionnée dans un ancien ID. Cette hausse est consommée par l’écrivain de dommage avant fusion. La guérison ordinaire n’est pas assimilée à une nouvelle blessure. Revue indépendante ciblée confirme ces deux corrections statiquement.

Les traces bornées conservent sans suppression les changements de santé, anatomie, engagements, dommages d’ouvrages et arêtes des civils. Les journaux diagnostiques tournants sont séparés. Elles ne reconstituent pas tous les impacts intermédiaires : le World final strict reste autorité. Une erreur diagnostique ou PNG ne bloque pas une conservation UI ; elle est journalisée et reste rouge. Les wrappers vérifient les SHA et le gel avant navigateur puis réservent une seule origine SHA et un seul segment. Les anciens ledgers false restent immuables.

ROOT seul exécute séquentiellement : typage contact PASS12,964s puis continuation PASS12,587s ; les deux natifs ci-dessus et leurs gels2997 chemins uniques exacts. Gate documentaire PASS1,139s. Aucun build, corpus ou banc produit inchangé rejoué. QA seule : produitV36528a2e8a9/publication2f42e85c et106HTTPS exacts restent acquis ; aucune nouvelle publication.

Rectification V368 : les sorties de gel annonçaient2992/2995 entrées, avec configuration en doublon ; les nombres de chemins uniques étaient2991/2994, tous SHA exacts. La note V368 et ses en-têtes sont corrigés ; anciens outputs et résultats restent littéraux. Les deux comptes2997 de V369 désignent chacun leur propre ensemble dédupliqué, pas un contrôle identique rejoué.

## Preuves et suite

Sous `tmp/early-access-defense/` :

- `raid3-contact-adopted-01/native-01/raid-third-contact-Real-ra-4c4ab--from85990-retaining-losses/` : conservation86114 SHA `c2c0c462102536f4ac4e77f2392711f5e81b4bd01a5a8bb337b33ae283f3239f`, ledger `189102809ef9d59bcf4b67f76e44a395712865260cf1918b900f30f35798f372`, summary `668e5f683b1c186d6373376dcdf9440c81ead9052021d7a80f61bdfb8ea83189`.
- **Nouveau canonical** : `raid3-contact-continuation-adopted-01/native-01/raid-third-contact-continu-8fef3-etaining-anatomy-and-losses/issue.json`, tick86133, **rechargé exactement**, SHA `3f9d2672a857aa40e88a93e91756fa590f49f02d071b34fa412a1f9080f1f395`. Ledger `7b51b1f8d2743b315f0aace907891cb0be1301b407e28b79429f9e4aa3b46d09`, resumeAllowed:false ; summary `2508ec3d25707863e6a1c91523427e714b1b34464b532334f9ba3c1c5c0d1a41`.

Préparation continuation0d9d6f7d/manifestc9b7e070 ; adopté ROOT corrigé a3c8c7c5 et entry-review ab21e3e0. Revues privées séparées sous raid3-contact-86114-independent. Les deux pilotes et leurs specs opt-in de ce lot n’allouent aucun navigateur par défaut.

Le FULL ledger V367 `fca539be6d24875ca99f31a4f14525769222172cbdd61b3031c91d68d2057591` reste entier dans la chaîne, origine75566/horizon111566 inchangés ; la défense consomme le temps de campagne. Aucun crédit productif rétrospectif. Reprendre uniquement le vrai86133 par un nouveau mandat de soins : démobilisation réelle, repos médical et arrêt du saignement prioritaires, sans ignorer un éventuel relèvement ennemi. Revenir ensuite à Batteries payées/utiles et aux essais des trois biomes ; nouvelles extensions autorisées suivent. Références, UI papier, sauvegardes historiques, personnes/biens/mémoires et sessions humaines préservées ; sous-métiers reportés.
