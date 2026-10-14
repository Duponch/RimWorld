# Plantes et chantiers V351

Le lot poursuit les correctifs demandés le14octobre : petites plantes devant les constructions, dégagement qui recommence et annulations plus larges. Les [arbres et annulations V349](tree-transfer-v349.md) et le [masquage du décor V350](../development/decor-occlusion-v350.md) sont déjà publiés en8840de17. Le schéma235 reste conservé.

## Comportement

Les neuf plantes à faible travail de récolte ne nécessitent plus une coupe préalable : herbe, herbe haute, ronces, mousse, riz, pomme de terre, maïs, coton et foin. Les plantes plus lourdes, dont arbres, agave et racines médicinales, conservent un vrai dégagement. Une coupe déjà commencée et sauvegardée continue avec son compteur réel.

Un chantier physique de bâtiment retire les petites plantes au premier paiement de matériaux. Un plan de sol conserve la plante et ses désignations pendant le chantier, puis les retire uniquement lorsque le sol est effectivement terminé. Cette destruction ne récolte rien, ne donne pas d’XP et ne tire pas de nombre aléatoire. Un plan de sol peut donc coexister avec un ordre de plante ; le simple placement du plan ne supprime aucune réservation.

Les objets réinstallés gardent leur identité et leurs attributs. La politique de leur forme finale décide du retrait végétal : un conduit, un pot ou un bac qui accepte les plantes n’a pas le même comportement que son ancien chantier de construction. Les couchages et emplacements instantanés restent compatibles avec les petites plantes. Les gardes historiques jusqu’au schéma234 restent inchangées.

Lorsqu’une coupe lourde ne trouve pas de place pour son produit, le colon conserve source, réservation et progression ; l’inspection explique « En attente · place pour les produits du dégagement ». Il réessaie avec le cooldown existant de20ticks, sans refaire le travail ni regagner de l’XP de coupe. Les besoins et l’entretien ordinaire des compétences continuent. Les commandes peuvent réveiller le planificateur plus tôt : ce n’est pas un délai universel imposé.

Le déplacement d’un pot retire seulement ses travaux de culture internes avant de l’emballer ; ses autres commandes restent conservées. L’annulation depuis le meuble source retrouve également son intention de déplacement. Une réservation en file reste distincte d’une exécution réelle : la sauvegarde accepte la première, mais l’admission empêche deux colons de couper la même plante simultanément. Une file demandée sur un colon libre démarre immédiatement et reçoit donc cette même garde. Les chemins automatiques rapide/complet suivent la plante de la seconde case d’un meuble, pas seulement son ancre.

## Référence et adaptations

Recherche primaire locale : Core1.6.4871rev590, assembly SHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Les neuf classes construction et le catalogue XML V348 restent privés. La nouvelle extraction ciblée du générateur de bâtiments et de PlantCut est conservée dans tmp/bugfix-v351/frame-reference avec ses SHA. Aucune classe entière n’est distribuée.

Core ignore les plantes dont harvestWork≤Dandelion200. Le Frame de bâtiment généré a fill0.2 et ne copie pas SupportsPlants ; le Frame de terrain a fill0/Ethereal. Les huit sols actuels ont une fertilité nulle. Ces distinctions motivent les phases précédentes. Dans le clone, la tombe commence déjà comme Frame à la désignation : sa petite plante est retirée au premier contact de travail, adaptation explicitement conservée.

L’attente réutilise une fraction strictement sauvegardable, duration−1/remainder9999, sans nouveau champ. Une fraction historique naturellement identique peut finir au plus0.0001unité de travail local plus tôt. Le retrait est une transaction synchrone revalidée : cible encore membre du monde, mêmes plantes et travaux, mêmes acteurs et plan de dépôt. Une charge dont le déplacement physique n’est pas terminé refuse avant toute suppression.

Les gardes écartent les travaux sans rapport avant de parcourir les acteurs. Les chantiers déjà vides ne créent pas la transaction/signature JSON de retrait ; ils relisent les ressources vivantes, sans cache ou marqueur durable. Aucun rendu, LOD, public ou bridge modifié. Cela borne les nouveaux parcours mais ne constitue pas une mesure de tempsCPU/GPU ou de FPS.

Un écart distinct reste préparé pour V352 : la base Core PlantWork produit le rendement avant la destruction de PlantCut, tandis que certaines coupes typées du clone donnent encore zéro. Ce lot ne modifie pas ce producteur. Le retrait gratuit au changement de Frame/sol doit rester sans récolte. Aucune parité exhaustive de rendements, difficulté ou durée n’est annoncée.

## Qualification

ROOT seul exécute les contrôles lourds, séquentiellement sur les sources/tests/pilotes figés. Groupe final227cas/13fichiers PASS37,989s, dont110nouveaux/3fichiers. Typage final PASS12,374s et buildPages PASS2,018s. Corpus63références/66chemins PASS62,049s : fichiers littéraux inchangés, migrations strictes, export/recharge exacts, un vrai tick/rejeu et delta sans mutation du premier snapshot. Seule l’omission historique gatherId propre undefined déjà documentée reste admise.

ChromeWebGPU acquis par reprises : première scène légère PASS28,1s/body27,902s dans le groupe initial rouge135,479s, puis scène saturée PASS84,314s/body80,278s. Six recharges exactes2012/2055/2064/2135/2160/2379, erreurs[] ; cinq captures acquises et deux captures rouges inspectées ROOT. Le texte d’attente est également vérifié par assertion DOM. Les images précèdent parfois la dernière mise à jour des compteurs HUD ; elles ne constituent pas une comparaison pixel exacte. Typage de livraison PASS12,416s et documentation PASS1,219s. Prêt au commit/push ; publication PENDING. Gel2921 exact. Les scènes sont préparées32² ; les sauvegardes des deux captures humaines n’ont pas été fournies. Aucun FPS, sauvegarde humaine réparée, campagne entière, early access100% ou parité exhaustive certifiés.

## Rouges conservés

Les sorties privées restent dans tmp/validation-runs/v351-* et les notes de reprise sous tmp/bugfix-v351. Premier groupe rouge21,797s :145/160acquis,15échecs. Fixtures corrigées : priorité désactivée,100acier sur une seule case de capacité75, support de toit non adjacent et création de Job attendue avant son ordonnanceur. Le pot a révélé un vrai ordre de semis orphelin pendant son retrait, corrigé sans désactiver le semis automatique.

Reprise rouge31,966s :161/171acquis. Les neuf bacs passent leur Frame mais dépassent la borne500 car le premier paiement ne livre que10acier : il reste90acier, un composant et280unités de travail. La borne2000 inclut ces vrais voyages et le travail. L’ancien oracle de sol refusait un plan désormais admis ; il vérifie maintenant conservation exacte du colon, de sa coupe, des plantes, piles et RNG au placement. L’ancien oracle de toit imposait deux exécutants concurrents ; il vérifie désormais refus immuable, annulation explicite puis coupe unique, et conservation du travail étranger lors d’une future commande annulée.

Reprises120cas PASS19,959s et37cas PASS15,981s ; dernière revue statique signale puis fait corriger le démarrage immédiat avec queue:true et la cellule de dégagement décalée. Contrôle26cas rouge14,715s :24acquis, deux nouvelles scènes erronées ; ancien constructeur encore autorisé à couper après son annulation, et seconde désignation manuelle de buisson déjà interdite par le produit. Priorités déclarées corrigées et scène inadmissible retirée, sans assouplissement moteur ; reprise18cas PASS8,427s puis groupe final ci-dessus. Typage rouge13,383s sur les types des seules scènes : Object.assign de matériau et compétences explicitement présentes, valeurs et assertions conservées ; reprise finale ci-dessus. Aucun rouge effacé ni résultat futur acquis.

Le rouge Chrome conserve trois exports2135/2160/2519 et erreurs[]. La scène saturée avait16sols mais la case12,9 occupée par le coupeur empêchait le dernier :15sols/45bois payés, capacité45 inférieure au rendement46. Cette préparation insuffisante est corrigée par20plans hors de cette case ; reprise seulement du cas saturé, aucun moteur modifié. À2379,16sols sont terminés,48bois consommés et46produits, soit76723unités conservées contre76725initiales ; l’arbre184 et le Jobtoit sont retirés une seule fois. Les quatre plans restants ne sont pas prétendus terminés. Artifacts initiaux dans native-first, reprise dans native ; SHA et ring privés conservés.
