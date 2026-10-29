# Formation et sauvegarde au Core physique courant

Le parcours privé de QA de la chaîne de victoire a exposé un défaut du lecteur partagé avec le produit297 : une préparation de caravane régulièrement admise devenait impossible à sauvegarder lorsqu'un impact provoquait un stagger entre deux réconciliations civiles. Ce lot répare cette lecture. Il ne change ni les ordres, ni le combat, ni la décision ultérieure de poursuivre ou d'annuler une formation.

## Cause et correction

Le lecteur réutilisait l'admission d'une **nouvelle** formation pour valider une formation déjà détenue par ses propriétaires. Le moteur joue la physique à chaque Core ; il réconcilie l'admission au macro suivant. À une phase1..9, un impact réellement survenu depuis le dernier macro pouvait donc produire un entier que le lecteur refusait immédiatement.

Une seule source change : `src/sim/group-human-admission-257.ts`. L'admission publique conserve sa signature et tous ses refus. Dans la validation d'une formation enregistrée seulement, le lecteur conserve un stagger fermé, valide et actif, né strictement après le dernier macro et au plus tard au Core courant. Tous les autres contrôles restent actifs : identité, propriétaire, passagers, portage, combat, stun et cargaison. La phase0, un timer ancien, futur, expiré ou mal formé restent refusés. Aucune valeur sauvegardée n'est réparée ou supprimée.

L'ordre du moteur a été relu : la physique de la frontière macro précède les réconciliations. Une première hypothèse d'exception en phase0 a été réfutée avant le correctif final et n'est pas implémentée. Il n'y a ni nouveau schéma, ni migration du contenu privé298 vers le produit297, ni réconciliation ajoutée à chaque Core.

## Preuves et conservation

Trois contrats portables utilisent une formation diagnostique admise par les vraies commandes, un runtime unique et des Core réellement joués. Le stagger de ces tests est une faute diagnostique déclarée appliquée par le producteur existant ; ce n'est pas une attaque revendiquée comme jouée. Sur l'ancien lecteur : un échec reproduit la lecture refusée, deux cas adverses passent. Sur le correctif : les trois passent, avec sérialisation et propre recharge exactes à zéro Core, admission fraîche toujours refusée et refus combinés conservés.

Le parcours réel de QA est distinct de la campagne humaine. Son résultat observé au Core98409, phase9, RNG3767855511, nextId73840 est conservé sous RAW `d47482c339363c7c501a27b0ab4eb6c14333417146cfbd4c2114db3649b5ac5d` ; Gaël porte le stagger98409→98504. Le rapport Source8 qui refusait cet entier reste un échec historique. Aucun retour à une sauvegarde précédente, soin, changement de timer, annulation ou pas de simulation n'est autorisé pour le rendre favorable.

La qualification directe a reproduit le refus dans le vrai désérialiseur Source8 puis chargé cet entier avec le seul lecteur corrigé : validation entière, sérialisation et seconde propre recharge strictement identiques aux23746405 octets, à zéro Core et zéro commande. Même RAWd474 et même gzipfe999770 ; aucun changement de personne, dommage, stagger, ordre, possession, horloge, RNG ou ID. Source9 privée assemble uniquement cette variante de lecteur sur les2098 sources inchangées par ailleurs. Aucune nouvelle qualification Native n'en est déduite. Une première assertion sur le RAW Planet3 non hydraté était un mauvais oracle ; son échec est conservé séparément, puis le vrai circuit de désérialisation a été testé sans hydratation manuelle.

Les trois nouveaux contrats passent aussi après installation produit. Huit cas voisins anciens des suites d'inventaire/propriétaires échouent dès leur préparation ; leurs huit noms et messages complets ont été reproduits strictement avec le lecteur précédent exact, sans modifier ces tests. Leur couverture métier n'est pas acquise et la suite globale n'est pas déclarée verte. Les contrôles et leurs reçus sont consignés dans le checkpoint privé désigné par [AGENTS.md](../../AGENTS.md). Aucun échec initial n'est promu rétroactivement.

## Portée

La correction ne prétend pas établir les règles natives de formation sous impact. Cette question de gameplay est séparée : la lecture primaire de RimWorld1.6.4871rev590, DLL5cf1, a identifié les transitions du Lord de formation, mais la chaîne complète StaggerHandler/stances/travel reste à examiner avant de modifier notre annulation runtime. Aucun code propriétaire n'est intégré.

La [méthode de fidélité et de coût](core-fidelity-and-performance.md) s'applique. Le chemin ajouté est borné par membre de la validation existante ; il n'ajoute aucun scan du monde ni travail de rendu. Trois processus successifs témoin/candidat/témoin ont mesuré le même entier diagnostique sain, sans changement de Core, RNG ou IDs. Pour300000 admissions fraîches : wall123,875/125,566/130,818ms ; CPU93/188/172ms. Pour6000 validations de formation : wall20,389/22,029/19,023ms ; CPU47/31/62ms. Le total wall du lecteur candidat est donc défavorable aux deux témoins ; cet écart de1,640 et3,006ms est conservé, sans déclaration d'équivalence. Les deux fenêtres réchauffées de4000 lectures donnent11,613/11,979/11,905ms. La granularité et la variation des mesures CPU ne permettent pas d'affirmer un coût CPU identique. Aucun réglage marginal supplémentaire n'a été engagé pour effacer ces chiffres.

Ces mesures ciblées restent distinctes d'une preuve de FPS/GPU ou de fluidité générale. La dette [PERF-V492-X6](movement-parity-v492-status.md) et la latence froide Home restent ouvertes. Les six ensembles ne sont pas déclarés achevés et aucune nouvelle publication Cloudflare n'est attestée par ce lot.
