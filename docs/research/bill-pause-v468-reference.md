# Pause et reprise des factures — référence Core V468

**Préparation gelée le23octobre2026 ; qualification locale acquise par reprises, publication encore ouverte.** Cette base ordinaire de production permet d'attendre une baisse réelle de réserve avant de relancer une facture. Les résultats locaux sont consignés dans la [note de livraison](../gameplay/bill-pause-v468.md) ; aucun résultat de test, parcours joué ou gain de performance ne découle de la seule référence.

## Sources et corpus

Installation primaire identifiée : **RimWorld Core1.6.4871 rev590**, `E:/Steam/steamapps/common/RimWorld/Version.txt`. Assembly-CSharp.dll SHA256 **5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a**. ILSpyCmd8.2 privé SHA256 **c1635be8deba8b374b43863fe843950460f9860989decff3e522afab35d30904**. Douze types nommés,132074octets, extraits directement ; empreintes avant/après identiques, aucun dump global et aucun code ou asset propriétaire intégré au produit. Les deux recherches initiales sous mauvais namespace restent documentées avant reprises ciblées réussies.

La [primaire privée gelée](../../tmp/bill-pause-v468/primary-contract.md) fournit les lignes exactes et le manifeste ; la [décision ROOT avant code](../../tmp/bill-pause-v468/decision.md) fixe les adaptations. Types : Bill_Production, Bill, Dialog_BillConfig, Bill_ProductionWithUft, WorkGiver_DoBill, BillRepeatModeUtility, BillStack, ResourceCounter, Verse.RecipeWorkerCounter, Listing_Standard, Verse.AI.JobDriver_DoBill et Toils_Recipe.

Recherche Internet ciblée fraîche du23octobre, [relevé privé](../../tmp/bill-pause-v468/web-research.md). L'[annonce officielle Ludeon du12octobre2026](https://ludeon.com/blog/2026/10/announcing-the-waylith-engine-and-update-1-7/) situe1.7 sur unstable et1.6 sur la branche principale ; elle ne spécifie pas ces seuils. Aucun document officiel actuel détaillé obtenu ; les règles viennent de l'installation1.6 identifiée. Forums anciens, mods et miroirs non identifiés ne remplacent pas cette provenance.

Corpus : [chapitre11 original](../reference/originals/Documentation_developpement.html#chap-11), **SYS/TEST-062..064 et UI-025**, avec interactions approvisionnement051–054, travail/exécutants, ouvrages/auteurs, stockage/détenteurs et conservation. Les lignes originales sont conservées dans `tmp/bill-pause-v468/corpus-rows.json`. Ces propositions/non-évaluations ne valent pas résultat local. Aucun identifiant global, domaine ou ensemble clos ; originaux préservés.

## Règle native établie

La pause automatique possède une mémoire `paused`, distincte de l'option `pauseWhenSatisfied` et de la suspension manuelle `suspended`. Avec cible10 et reprise5 : une facture encore active à6 peut travailler ; après avoir atteint10, elle reste paused à9 ou6 et reprend à5 inclus. Le même nombre de produits entre les seuils peut donc correspondre aux deux états selon son histoire.

ShouldDoNow suit cet ordre : hors TargetCount, effacer paused ; si suspended, refuser sans compter ni changer cette mémoire en TargetCount ; sinon compter par le WorkerCounter propre à la recette. Option active et compte>=cible acquiert paused ; ensuite compte<=reprise ou option inactive efface paused. L'admission exige encore compte<cible. Cet ordre reste pertinent pour les états de seuil atypiques : effacer la mémoire ne donne jamais, à lui seul, permission de produire au-dessus de cible.

La même autorité de comptage sert à l'affichage, à l'atteinte et à la reprise. Il s'agit d'une réserve admissible, pas d'un total des objets produits par la facture. Le compteur natif possède une branche ResourceCounter stockée et des branches filtrées lisant objets/détenteurs réels. ResourceCounter se rafraîchit notamment tous204Core ; le toil de fin d'une recette TargetCount force aussi ce rafraîchissement. Cela ne prouve pas que chaque mutation native soit immédiatement visible.

Les réglages ne réinitialisent pas directement paused ; la prochaine évaluation emploie les nouvelles valeurs et la mémoire précédente. En natif, ShouldDoNow peut être appelé depuis BillStack, le WorkGiver et la couleur de l'interface. La présentation native peut donc faire évoluer la mémoire même en pause de jeu. Aucun tick autonome de Bill_Production n'a été trouvé dans les types ciblés.

## Cible, seuil et reprise manuelle

Le dialogue natif déplace le seuil de reprise du même delta que la cible, avec plancher0. Si l'option est active, il borne ensuite la reprise à cible−1. Cible0 peut donc produire reprise−1 après le contrôle numérique min0 : ce bord natif est explicite. Les boutons de liste +/- ont leurs propres planchers0 et ne réalisent pas exactement le même clamp du dialogue. L'étiquette « Infinite » à partir de999999 ne retire pas le test numérique de cible.

Un nouvel objet natif initialise cible10 et reprise5, avec option/mémoirefalse. Le chargement d'un champ absent utilise cible/reprise0 et boolsfalse ; ces defaults de sérialisation ne sont pas les initialisateurs neufs. L'état acquis est persisté et cloné indépendamment de suspended. Aucun clamp des seuils n'est démontré au chargement ou dans ValidateSettings.

Le helper de reprise manuelle reconnaît TargetCount, option active, mémoire acquise et compte<cible. L'action retire seulement paused ; elle ne change ni cible, seuil, option ni suspended. Au-dessus de cible, une nouvelle évaluation acquiert à nouveau la pause.

## Engagement et ouvrage

Une nouvelle sélection, y compris manuelle, passe ShouldDoNow. Une fois le job engagé, JobDriver_DoBill et Toils_Recipe ne relisent pas paused/ShouldDoNow. Le toil de travail teste suspended : la pause acquise n'est donc pas l'interruption manuelle. Un cycle déjà engagé peut dépasser la cible et garde collecte, ingrédients, ouvrage, auteur, progrès et sortie physique selon les autres règles du job.

Après véritable interruption, une nouvelle admission d'ouvrage consulte la pause. La pause ne détruit pas l'ouvrage, ne cède pas son auteur et ne transforme pas les ingrédients en produits comptés. La preuve ciblée porte sur le job existant et les nouvelles prises ; aucune équivalence directe de toute la file réservée locale n'est revendiquée.

## Décisions locales avant qualification

**Adopter :** mémoire automatique distincte, arrêt>=cible et reprise<=seuil, compteur autoritaire unique, engagement actif conservé, nouvelles admissions/reprises d'ouvrage filtrées, sauvegarde de la mémoire et reprise manuelle distincte.

**Adapter :** domaine prospectif optionnel `CookingBill.reservePause={enabled,resumeAt,paused}`, schéma289 ;288 validé strictement avant migration numéro seul, sans adoption rétroactive. Commande de politique séparée et sans état paused fourni par l'appelant ; reprise manuelle dédiée. Cible locale0..9999 et reprise−1..9999, défaut d'adoption conservant l'écart5 autant que possible (`max(0,cible−5)`, puis cible−1 si nécessaire). Les nouvelles factures gardent leurs règles et compteur historiques avant adoption explicite. Les51recettes compatibles parmi55 sont celles acceptant déjà une réserve ; fusion d'armes/vêtements, crémation et combustion de vêtements restent hors domaine.

L'interface utilise un brouillon Appliquer/Annuler et des commandes confirmées. Rendu, inspecteurs et billWanted restent purs. La simulation réévalue les factures installées explicitement concernées avant planification, en fin de pas local10Core, après un commit de production pertinent et après les commandes concernées ; changements de propriété/stockage vus au prochain pas. C'est un calendrier adapté, sans reproduction revendiquée de chaque micro-transition native ou cadence204 inventée. Une capture de compte ne vit que pendant une passe synchrone, jamais entre ticks ou dans World.

Les ordres locaux déjà admis et réservés conservent leur engagement pour la nouvelle mémoire paused, comme le choix V461, avec les anciens contrôles suspended/cible/intrants/contact maintenus. Cette adaptation de file est déclarée. Les changements généraux de facture gardent leurs règles de libération existantes ; modifier la seule politique utilise la commande autonome.

Le même meuble emballé, en voyage, en caisson ou archivé conserve paramètres et mémoire sans compter un stock absent. Seul le poste réellement installé sur sa carte simulée évolue ; réinstallation sans reset offert. Gardes RAW, Snapshot complet/delta, Resident, campagne et détenteurs actuels doivent refuser ancien/futur, getter, héritage et champs mal formés avant mutation. Ces frontières demandent leur qualification produit.

**Différer :** copie/nom exhaustifs, nouveaux filtres/comptages, choix de stockage détaillé, nouveaux catalogues, DLC et prévention du feu. Les autres bases Core restent comparées après ce lot ; les six ensembles, campagnes durables, victoire et cible FPS restent ouverts.

Les tests de règles couvrent hystérésis, ordre des égalités, mémoire/suspension, dépassement d'un lot de4, cible0/reprise−1, formes fermées et compatibilité des recettes. Ils ne constituent pas à eux seuls une fabrication physique ou une qualification d'interface. Les145cas distincts acquis par reprises, quatre anciens rouges reproduits, boucle physique, trois recharges natives entières, présentation et coût mixte sont consignés dans la note canonique ; aucune parité générale ou clôture d’ensemble n’en découle.
