# Présentation continue du temps réellement confirmé — schéma297

**Lot intégré localement ; fluidité générale encore ouverte.** Le produit corrige déjà plusieurs poses et effets, mais son horloge fine rejoint presque chaque reçu puis s'épuise entre les publications. À×6, une source qui confirme environ20ticks locaux/s pour36 demandés ne peut pas alimenter un lecteur restant aveuglément à36. Ajouter de l'histoire ne répare pas ce débit physique.

La correction garde une réserve nominale de36ms et avance uniquement dans l'histoire déjà confirmée. À débit régulier, le lecteur conserve exactement le rythme nominal. Lors d'un sous-débit établi, un estimateur scalaire observe le progrès Core et le même temps mural, filtre les paquets puis corrige progressivement le rythme visuel selon l'histoire disponible. Il commence au remplissage réel de la réserve ; l'attente initiale avant le premier Core ne devient pas un faux ralentissement. Main transmet le même temps host après le drain des admissions pour éviter un RAF daté avant les états qu'il vient d'admettre.

La physique, les commandes, les ACK, les crédits Runtime, le schéma, les vitesses sémantiques et la branche native PawnTweener>=5 restent inchangés. Aucune anticipation Core, aucun nouveau RAF/timer/passage acteur ou GPU. Pause rejoint immédiatement le dernier front confirmé ; reset/load efface les mesures antérieures. Les doublons ne renouvellent pas le dernier progrès. Un vrai silence>100ms autorise le secours rare explicite sur l'histoire acquise ; les reçus ordinaires ne font pas de jointure.

La politique ne garantit pas zérohold ou un âge mural absolu face à des livraisons arbitraires. Sa correction est bornée au nominal ; une source revenant exactement au nominal peut donc conserver une dette déjà confirmée. Le seuil de régulation100ms repose sur une estimation, tandis que le contrat mesure indépendamment l'âge réel depuis les commits. Une dette cumulative ou un dépassement doit rester visible, pas être masqué par une seule baisse des holds.

## Preuves privées acquises avant intégration

Les vrais contrats Runtime/Engine/publisher/frameOwner conservent les publications authentiques et Whole/oracle/Pause/recharge. Le nouveau cas unique alterne nominal→sous-débit→reprise deux fois, sans écrire d'horloge World ou fabriquer des paquets. Le témoin a reproduit trois holds sur18frames de sous-débit ; les contrôles de conservation/recharge précèdent ses assertions de fluidité.

La première V4 a conservé11PASS mais échoué trois finalités nominales : le déficit de démarrage polluait l'estimation. Le reset au passage buffering→ready est le seul correctif suivant. ROOT a ensuite qualifié les trois finalités rouges : zérohold/jointure ordinaire, âges moyens des deux reprises63,237/65,813ms et maximum68,932ms dans cette trace. Les14finalités horloge sont acquises par reprises, sans prétendre une nouvelle exécution monolithique. Les attentes des deux anciens contrats NUM de réserve doivent suivre la politique36ms ; leurs oracles Whole, chemins et garanties historiques ne sont pas retirés.

Ces observations ne sont pas des mesures FPS/GPU ni une preuve de débit physique rétabli à×6. Les dettes de simulation×6 et Home restent distinctes. Les six ensembles/victoire demeurent suspendus selon la priorité humaine exclusive de fluidité. Aucun déploiement Cloudflare n'est déduit de ce lot.

## Validation de livraison à renseigner par ROOT

- Intégration :31PASS/0FAIL/15filtrés en18,993s ; type21,012s et PagesCODE4,558s, public résolu sans recopie. Trois sources de présentation, quatre nouveaux tests et deux maintenances NUM.
- Coût scalaire300000frames W/C/W :17,117/24,796/10,151ms muraux. Surcoût observé0,026–0,049microseconde/frame ; CPU processus109/47/31ms, fil31/16/16ms, JIT/granularité et dérive conservés. Même code des quatre modules réellement chargé par transformation TypeScript, sans stub ; pas World/Engine/FPS. Première préparation Vite interrompue et préflight libTS absent conservés, seule mesure finale acquise.
- Native compact initial FAILED avant toute fenêtre : la cible approuvée était hors écran après le geste caméra. Zéro Core joué mais mobilisation réelle conservée ; nouvel ACTUAL2c573dc8/gzip42b990b2/Core110480/RNG3451972258/nextId29237, propre recharge exacte. Ce n'est pas une qualification des trois vitesses. Original et gardes complets gardés : C1,446Gio au footer puis4,496Gio à un garde frais, cause de variation inconnue ; pas nettoyage ni attribution au jeu. Ne jamais recharger af98 après cette conséquence.
- Carte source produit2080/schema297 :f03f9ddd6b439d454ef79eacedebac608804fe12588d0d8fe8c092192dbdc332. Enregistrement Git dans le checkpoint courant, aucun déploiement.

Sources locales et rapports détaillés : checkpoint `Cbase/action-fluency-20261030/whole-animation-audit-20261030`, propositions/gels `clock-fix-author-v4`, correctif unique `clock-fix-author-v4-startup-fix`, trace ROOT `clock-startup-action-followup-v1/clock-trace.json`. `Cbase` est la racine scratch de ce chat. Aucun RAW humain/mission94de/d474 n'a servi à ce contrat.

## Cause restante certaine

Les poses de rig au détail moyen demeurent retenues à12Hz dans ActorAnimationCache/PawnLayer/WildlifeLayer/MechanoidLayer. Les coefficients des bras, de la tête et des microtranslations sont lus sans interpolation ; le cycle de travail peut dépasser10Hz à×6 pour12samples/s. XYZ et cette horloge ne réparent pas ce chemin. Ce défaut bloque toute déclaration de fluidité générale terminée ; chantier exclusif suivant, sans reprise des six ensembles. Un nouvel essai Native compact attend sa correction, afin de ne pas répéter une matrice qui ne pourrait qualifier ce défaut.
