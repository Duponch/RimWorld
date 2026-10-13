# V340 — deuxième récolte et continuation alimentaire partielle

13 octobre 2026. **Lot de qualification clos PARTIEL par décision ROOT ; aucun PASS natif V340.** Depuis le checkpoint littéral39073 de [V338](early-colony-food-v338.md), une seconde génération de riz est réellement récoltée, son cargo est rechargé exactement et quatre nouveaux produits sont attestés. Aucune ingestion nouvelle n'est attribuée. Une menace naturelle interrompt la continuation ; deux branches de défense conservent des blessures réelles, dont une mise à terre de Gaël. La tentative alternative ne récupère pas cette branche de contact. Aucun nouveau moteur, contenu ou gameplay n'est livré ; commit/push, vérifications finales de livraison et publication restent à ROOT.

## Départ littéral et faits historiques

World39073, SHA256 **e6eea52468ce91196a2a3b816b1df488e09acf47a498bfddb6891bb810a21925**, carte tempérée250×250, graine3398550437, originaux **Iris18530/Gaël18532/Léonie18534**, champ18770, cuisinière18884 et facture18886. Le World et le carnet V338 sont chargés et liés par empreinte ; le camp, la dotation et la préparation amont ne sont pas rejoués.

Le départ contient **17rations initiales,31riz et six repas simples** : deux repas au sol, trois dans l'inventaire du visiteur mort19071 et un porté par Léonie. Six repas ne sont donc pas six portions accessibles au sol. Bois150, acier370, médicaments26 ; combustible2528ticks, burned9472, autoRefuel actif. Station18884 à126,116, facture18886 riz seul, jusqu'à six repas, rayon30 et destination stock.

Gaël est vivant au39073, en sommeil médical, avec quatre contusions résiduelles toutes soignées et perte de sang0. Les soins de Léonie aux21639/21756, les blessures précédentes et leur récupération relèvent de V338. Visiteur19071 meurt par perte de sang24225 ; assaillant19176 meurt par perte de sang35664 après le bilan initial du raid. Ces décès restent conservés dans tous les exports examinés. Les24récoltes/39cargos/23resemis, quatre produits V338 et ingestion qualifiée d'Iris39072 ne sont pas recrédités à V340. Léonie termine sa portion déjà engagée19399 au39082 : fait de continuation, sans nouvelle cuisson attribuée.

## Acquis nouveaux et limites de provenance

| Critère | Preuve effectivement conservée | Verdict du lot |
| --- | --- | --- |
| Seconde génération | Pied19155, né32068 à114,116 après18878 récolté ; présent au départ39073 | Acquis |
| Deuxième récolte naturelle | Gaël18532/job19647, croissance0,661726045662759, récolte56910, source19650×3, quantité antérieure0 et événement concordant | Acquis |
| Cargo physique | Portion19651×3 sous Gaël au56911, haul deliver depuis19650, pickupCell114,116 ; checkpoint rechargé exactement | Acquis |
| Nouvelle cuisson après cargo | Quatre nouveaux IDs physiques, recette station18884/facture18886, dix riz transformés chacun | Acquis, portée bornée |
| Nouvelle ingestion attribuée | Aucun démarrage/achèvement qualifié dans attempts/eaten ; stocks de repas fusionnés | Non acquis |
| Conservation | Récolte/cargo56911 et préparations des branches rechargés exactement ; exports d'arrêt liés par SHA | Partielle ; aucune recharge d'ingestion ou finale civile |
| Résolution et soins après menace | Blessures réelles et mise à terre conservées ; menace encore active, aucun secours/soin final acquis | Non acquis |

La croissance du pied choisi est observée depuis0,19946427626151036 au39073. Gaël récolte trois riz au56910 avec une croissance supérieure au seuil local strict65%, sans maturité100% préparée. Le checkpoint56911 conserve déjà le transport engagé : `haul.sourcePileId=19650`, `carryPileId=19651`, quantity3, phase deliver, cellule de prise114,116. Source19650 absente et portion19651×3 sous propriétaire pawn18532 donnent le bilan `(avant0 + récolte3) − source restante0 = portion3`. Le premier pilote avait manqué cette transition rapide après sa capture ; son correctif reconnaît le cargo contenu réel. **Aucune phase pickup invisible n'est reconstruite.** Le jalon second-rice-cargo est réellement exporté/rechargé avant reprise à×6.

| Produit nouveau | Tick | Cuisinier | Riz transformé |
| --- | --- | --- | --- |
| 19656 | 57068 | Léonie18534 | 10 |
| 19665 | 57836 | Léonie18534 | 10 |
| 19713 | 61941 | Gaël18532 | 10 |
| 19718 | 62115 | Iris18530 | 10 |

Ces quatre produits sont observés dans la reprise native-cargo ; les carnets de défense les héritent sans constituer quatre nouvelles cuissons à chaque passage. Les autres messages de cuisine/consommation du journal ne valent pas une attribution supplémentaire. `attempts=[]` et `eaten=[]` restent vrais dans les résumés fermés. Les fusions de riz et de repas conservent propriétaire et quantité, sans généalogie unitaire : aucun repas n'est annoncé comme contenant exclusivement les trois grains du pied19155. Les portions depuis un vieux stock fusionné sont refusées par l'oracle conservateur de nouvelle ingestion, même lorsqu'un événement rapporte un repas mangé.

## Bilans matériels et médicaux de continuation

Au56911 : **riz40 au sol +3 portés par Gaël**, repas5 au sol +1 porté par Iris en ingestion, rations16 au sol, bois105, médicaments26 ; combustible2840ticks/burned36160. Léonie travaille alors avec dix riz placés, mais cet état engagé n'est pas lui-même une sortie ou une ingestion achevée. Gaël n'a plus de blessures ni perte de sang : évolution réellement constatée entre39073 et56911, sans tick exact de dernière guérison attesté.

Au59991, le journal signale une intoxication alimentaire de Gaël. Aucun événement précis de guérison n'est crédité. Le premier arrêt66116 puis le départ de défense66123 conservent les trois originaux vivants ; Gaël a blessures[]/perte de sang0. La gazelle femelle18565 devient en rage au66100, détectée66110 sur le premier passage ; son manhunter commence au core661000. La menace est encore active aux arrêts.

Dernier état **de la branche alternative au66321** : riz19644×9 au sol129,113 ; deux repas au sol,19615×1 à126,113 et19735×1 à126,114 ; rations `survival-meal`18694×6 et18727×10, soit16 au sol ; bois18726×45+18755×30=75, acier370, composants30 et médicaments25+1=26. Aucun de ces repas n'est attribué comme ingestion nouvelle. Station/facture conservées, combustible10320ticks/burned46680/autoRefuel actif. Les compteurs de combustible total augmentent de45000ticks et le bois baisse de75 depuis39073 : bilan compatible avec le ravitaillement ordinaire, sans témoin unitaire source→fourneau qualifié par ce pilote. Le compteur de repas périmés passe0→3 ; les trois repas d'inventaire19073 du visiteur mort disparaissent, sans être comptés comme portions mangées.

Au66321, Iris et Léonie restent indemnes en refuge121,111/123,111, besoin alimentaire15,346666666665246/13,626666666665207. Gaël est vivant debout à120,118, avec deux blessures non soignées de sévérité cumulée10205 et perte de sang781020. **Les trois personnes restent mobilisées**, menace18565 active. Cette fin n'est pas une reprise civile, une guérison ni une réserve suffisante pour trois personnes.

## Défenses réelles et branches distinctes

**Première défense depuis66123.** Les gestes UI mobilisent les civils vers l'abri et Gaël vers126,114 avec son fusil original18558 toujours équipé. Une préparation danger-ready66123 est rechargée exactement. Au66317, Gaël présente six nouvelles contusions/fissures nées66298/66307/66316, sévérité20072, perte de sang0 ; gazelle à127,115, encore active. La garde de dommages interrompt le passage. Aucun ordre de tir manuel confirmé n'est consigné sur ce passage ; aucun tir victorieux n'est déduit de son résultat.

**Tentative de contact depuis66317.** Iris (« Soignant pacifiste ») et Léonie (« Éducation pacifique ») refusent le combat conformément à leur passé ; seul Gaël est combattant. Le premier passage contact attend un sélecteur Faune absent et termine en timeout480000ms, toujours au66317 : c'est un rouge du geste du pilote, sans nouvelle progression de combat. Le geste est repris par l'UI de contact existante. L'ordre de mêlée est réellement accepté66317, une nouvelle préparation est rechargée exactement, puis la gazelle subit contusions et pertes du nez/sabot. **Aucun bug moteur n'est établi : le contact a réellement infligé des dommages.** Gaël tombe au66424 ; export66431 conservé, dix-sept blessures, sévérité70486, perte de sang1744596. Gazelle vivante active, trois contusions encore présentes, nez et sabot arrière droit manquants, perte de sang1080000. Aucun secours, soin ou récupération de cet état n'est acquis.

Les gardes du **pilote de contact** sont adaptées explicitement, sans changement de règles moteur : le seuil de sévérité cumulée10000, déjà dépassé au départ blessé66317, est suspendu uniquement sous V340_CLOSE_CONTACT ; les anciennes blessures sont ancrées et leurs évolutions/deltas consignés. Les arrêts perte de sang≥15% de BLOOD_UNIT et nouvelle perte anatomique restent actifs. L'arrêt sur personne originale morte/à terre/prisonnière/en crise reste actif ; une garde alimentaire≤8 est ajoutée pendant ce bref contact. Les incidents techniques et nouvelles menaces restent des arrêts. La mise à terre66424 arrête effectivement la reprise ; aucun critère n'est adouci pour annoncer un PASS.

**Alternative open-rifle.** ROOT recharge le départ réel66123, en conservant la branche de contact66431 ; ce retour est une tentative alternative explicite, **pas la récupération du blessé à terre**. Gaël reçoit un poste120,118 plus ouvert. Préparation66123 rechargée exactement, ordre de fusil manuel accepté au66245 contre18565. Le passage s'arrête au66321 sur les deux nouvelles blessures de Gaël ; la menace reste active. La gazelle présente alors quatre contusions/fissures nées66285/66311, sans blessure gunshot attestée. L'acceptation de l'ordre ne qualifie donc ni impact du fusil ni victoire. ROOT clôt ce lot utile mais partiel ; aucune répétition de stratégie supplémentaire n'est retenue pour obtenir artificiellement une réussite.

## Contrôles ROOT, sorties et conservation

ROOT seul exécute les contrôles, sur pilotes figés à chaque passage. Toutes les campagnes fermées ci-dessous sont **rouges** et leurs résumés portent `result:partial-failure`, erreurs navigateur[]. Erreurs[] ne transforme pas leur verdict. Les durées body proviennent des résumés ; celles des rapports JSON incluent le passage Playwright. Les durées terminales ROOT819,005s/467,283s/83,633s sont conservées séparément et ne sont pas substituées aux nombres des rapports.

| Sortie sous tmp/early-access-v340 | Rapport Playwright JSON | Body | État/raison |
| --- | --- | --- | --- |
| native | RED818,405s ; terminal ROOT819,005s | 814,517s | Récolte56910/recharge56911 ; menace, export66116 |
| native-cargo | RED466,536s ; terminal ROOT467,283s | 461,683s | Cargo rechargé et quatre produits ; ingestion absente, export66123 |
| native-defense | RED81,179s | 67,566s | Dommages nouveaux, export66317 |
| native-contact | RED484,404s | 480,303s | Timeout du sélecteur mêlée, monde66317 |
| native-contact-ui | RED52,454s | 47,595s | Contact effectif, mise à terre66424/export66431 |
| native-open-rifle | RED82,963s ; terminal ROOT83,633s | 78,360s | Ordre fusil66245, dommages nouveaux/export66321 |

Chaque ligne possède son `native[-suffix]-report.json`. Sous native/native-cargo, le dossier de sortie est `second-colony-food-v340-V3-4736b-w-cooking-and-new-ingestion/` avec second-food-summary.json ; sous native-defense/native-contact/native-contact-ui/native-open-rifle, il est `second-colony-danger-v340--940cf-exact-civilian-continuation/` avec second-danger-summary.json. Exports JSON, carnets .evidence.json liés par empreinte, captures et rouges restent privés sous ces chemins ; le timeout contact n'ajoute pas un nouvel export d'arrêt. Le décompte des recharges retient uniquement les exports dont le chemin appartient au passage : les checkpoints hérités ne sont pas recomptés. Les copies héritées des receipts gardent leur état historique : un ancien reloaded:false n'est pas réécrit parce qu'un passage suivant a chargé son fichier.

| Export / branche | Tick | SHA256 | Conservation effectivement acquise |
| --- | --- | --- | --- |
| second-harvest / native | 56911 | a1e16b606dbe31783601bc320c5cf4e944ee7879a8501e15118b324975042747 | Recharge exacte |
| second-rice-cargo / native-cargo | 56911 | a1e16b606dbe31783601bc320c5cf4e944ee7879a8501e15118b324975042747 | Recharge exacte distincte du même World |
| failure-continuation / native | 66116 | 10941a1a849a970a030f7113716a2f84c1a8bc7e6040ece1450c57dfbcc07658 | Export conservé ; non rechargé par son passage |
| failure-continuation / native-cargo | 66123 | 3773d1d2bf181083692a9c8da50ac98aa060feb68eaea9151b613c57471fadcb | Export repris littéralement par défense et alternative |
| danger-ready / native-defense | 66123 | a2d1540f4c7d7b36929be2f398eee47e6b947b017fc755722cc0b957eb29c440 | Recharge exacte |
| failure-continuation / native-defense | 66317 | bd441d55be604ae73eb595bbcf1c2746b8bc67c70657de98e9579a3678304bc3 | Export repris littéralement par les contacts |
| danger-ready / native-contact-ui | 66317 | 419e6b735acee5ca52f83aad878e0b9e657940cf534db4a920ee22903e04d6e8 | Recharge exacte |
| failure-continuation / native-contact-ui | 66431 | 8477b29fec55f7dbe657ec3df05bb4a4047b3fde123ca4b1f91bc9fb5a6f0560 | Branche à terre conservée, aucune récupération/recharge finale acquise |
| danger-ready / native-open-rifle | 66123 | ba921d10a908b7003607307be5ce97f72a6d061bedf32130a76a4364b78dbae2 | Recharge exacte |
| failure-continuation / native-open-rifle | 66321 | 468843ce219c4eff5f9e3da32cf81d148fcbf1a0f7a1fa207ebd978156711f1b | Dernière branche conservée ; aucune recharge finale civile acquise |

Typages rapportés ROOT : reprise initiale corrigée **PASS11,755s**, gel2861exact ; contrôle cargo interrompu03:36 sans verdict, puis reprise **PASS21,669s** (`v340-typecheck-cargo-resume-2026-10-13T18-12-15.497Z-11020`), gel2864exact. Dernière préparation open-rifle/food opt-in : **PASS18,175s**, gel2863exact avant mise à jour de cette note. Les empreintes successives privées freeze*.json correspondent aux pilotes adaptés entre passages, pas à un fichier identique revendiqué à travers tous les essais. Aucune suite complète ou buildPages V340 n'est annoncé. Les vérifications finales de périmètre/livraison appartiennent encore à ROOT.

ROOT inspecte les deux captures finales contact-ui/open-rifle : maison intacte, deux civils en refuge, Gaël blessé/à terre et alertes cohérentes. Cette inspection ne qualifie aucun FPS. Les autres captures restent conservées ; aucune inspection supplémentaire n'est créditée ici.

V340_SINGLE_BATCH est **préparé et typé, non exécuté** : réglage UI de la facture jusqu'à un repas et éventuelle récolte d'un pied déjà réellement au-dessus65% si moins de dix riz au sol. Aucun réglage ou résultat correspondant n'est crédité aux exports précédents. Il demeure un outil guidé pour une future continuation, pas une preuve d'autonomie ou d'ingestion acquise.

## Méthode, référence et clôture bornée

Le contrôle alimentaire dispose d'un budget body18minutes/test20minutes ; croissance/attente avancent à×6, fenêtres courtes de récolte, cuisine et ingestion à×1. Les interventions utilisent les commandes joueur existantes et des snapshots confirmés ; la progression, les soins, les résultats de combat et les événements restent naturels. Aucun tick, maturité, besoin, ressource, PRNG ou résultat d'incident n'est forcé. Les adaptations du pilote et refus d'oracle sont consignés dans la revue privée `tmp/early-access-v340/review.md` ; aucun rouge n'est effacé et aucun critère d'ingestion n'est réduit pour obtenir un PASS.

La recherche privée `tmp/early-access-v340/priority-review.md` reprend **Core1.6.4871 rev590**, assembly SHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Plant_Rice dans Plants_Cultivated_Farm définit growDays3/rendement nominal6. [Les règles locales](../../src/sim/plants.ts) conservent récolte au-dessus65%, horloge6000ticks/jour, lumière/température/fertilité et rendement effectif : ni100% de croissance, ni six unités garanties, ni trois jours civils ne sont promis. La [présentation primaire RimWorld](https://rimworldgame.com/) situe agriculture, besoins, blessures, saisons et incidents dans une campagne ; les nombres retenus viennent des Defs locales identifiées.

**Qualification finale : seconde récolte, transport conservé et nouvelle production acquis ; chaîne jusqu'à une ingestion attribuée et reprise après menace incomplètes.** Schéma232 conservé, aucun changement moteur/rendu/bridge/public au titre de ce lot QA. Aucun gainFPS, autonomie alimentaire, survie durable des trois originaux, guérison après le contact, campagne entière/multi-saison, compatibilité exhaustive ou early access100% certifié. Le bilan ne confond ni stock total avec nourriture accessible, ni ordre accepté avec impact victorieux, ni branche alternative avec récupération du blessé. Cette note n'annonce aucun commit, push ou déploiement V340 : ROOT demeure responsable de la livraison finale et des publications regroupées.



Vérifications finales ROOT : gel2863exact après le dernier natif ; documentation **PASS12,310s** (`v340-docs-2026-10-13T19-22-54.651Z-20440`) et diff sans erreur d’espacement. Livraison QA-only : aucun nouveau build ni publication pour ce lot ; le produit V339 attend la prochaine publication regroupée.

Livraison observée : V340 commité et poussé sur main en **f3f80307**, sans déploiement pour ce lot QA-only. Les branches blessées restent ouvertes ; la suite V341 rend l’aide initiale accessible et répare le guide, sans récupérer ces personnes.
