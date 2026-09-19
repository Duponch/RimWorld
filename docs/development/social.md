# Interactions passives et opinions — V70

[Recherche et limites de version](../research/social-reference.md). Première tranche sociale de l’étape 3, obtenable dans un camp ordinaire pendant travail, déplacements et besoins éveillés. Le joueur consulte **Social · opinions** dans l’inspection. Il peut rapprocher postes et activités ; aucune commande « amitié », téléportation ou interruption de tâche.

## Contrat

Deux colons présents, différents, éveillés et non à terre ; initiateur capable de parler. Sommeil médical, inconscience, crise, fuite, combat actif, étourdissement et patient porté exclus. Le mobilisé inactif utilise le mode calme. Distance de cellules inférieure ou égale à six, rayon euclidien ; roches pleines, bâtiments pleins et portes fermées bloquent la vue. Aucune recherche d’itinéraire ni règle de couvert/lean pour parler. Les positions de cellule sont celles de la simulation, sans dépendre des poses graphiques.

Un échange applique deux souvenirs dirigés, en utilisant l’impact de l’autre personne avant l’apprentissage. Bavardage : +0,66 × impact cumulatif, opinion affichée plafonnée à +10, cumul sous-jacent conservé ; −1 par jour depuis l’ancrage initial, fusion sans rajeunissement. Discussion : +15 × impact, durée vingt jours, plateau quatorze puis décroissance sur six ; dix occurrences par interlocuteur, ×0,9 par rang du plus récent au plus ancien. Limite 300 souvenirs par catégorie. Arrondi par groupe, minimum +1 si positif, opinion totale plafonnée à 100. Aucune pensée d’humeur pour ces contenus.

Social reçoit 4 ou 10 XP de base **pour l’initiateur seulement**, modifiées par passion, apprentissage et saturation ; oubli/remise à zéro quotidiens communs. Niveau et XP consultables. Impact : base 0,82 + 0,0275 × niveau, facteurs de parole/audition et minimum 0,2. Les équipements sociaux restent absents. Niveau absent = 0, sans passion, sans passé inventé.

## Propriété et performance

`social-state.ts` : types, courbes, impact, opinions et entretien des souvenirs. `social.ts` : admissibilité physique, tirage, transaction, passage de simulation. `social-save.ts` : validation stricte. `social-inspection.ts` : présentation sûre avec textContent, actualisation au rythme HUD, pas par image GPU. L’UI ne recalcule la liste que lorsque sa signature change.

`Pawn.social` contient PRNG propre, intention en attente, dernier échange et souvenirs identifiés par ID de personne. Aucune référence objet croisée. La compatibilité est dérivée de la paire/graine, l’âge restant neutre ; la simulation sociale n’avance pas le PRNG de récolte, soins ou combat. Les mémoires sont nettoyées même sur les corps retenus. Un décès n’efface pas l’identité ; les proches ne reçoivent pas encore de deuil.

À la fin du tick, après activités/raid, un seul passage ordonné traite les acteurs. Pas de réservation sociale ni modification de trajet, de rythme ou de cargaison. La capture de vue est construite seulement après un tirage réussi avec un partenaire proche, partagée dans ce passage sans mutation du décor ; elle inspecte bâtiments et cellules traversées, jamais toute la végétation ou toute la grille. Aucun travail par frame, aucune allocation d’une grille 250² par échange. Les candidats restent une recherche linéaire, à mesurer avant index spatial supplémentaire.

V69 strictement validée avant migration neutre V70. Social/compétence sociale facultatifs ; aucune conversation passée inventée. PRNG, intention, horodatages, IDs, types et bornes sont contrôlés ; mémoire inconnue, interlocuteur absent/self, doublon cumulatif, cumul excessif, date future/expirée ou attribut inattendu refusés. Les colons actuels ne quittent pas la carte ; leur futur transfert exigera un registre social hors carte, pas la suppression silencieuse des souvenirs.

## Validation et borne de livraison

Scénarios ciblés : disponibilité/vue, opinions asymétriques, capacités et XP, cumul/vieillissement, intention persistante, continuation exacte et corruption. Vraie UI 1×/6× pendant chantiers, inspection et sauvegarde ; pilote ordinaire cinq jours avec arrivée/raid, opinions et XP naturelles. [Preuves](../history/validation-social-v70.md).

Ce lot atteint le critère proche de l’étape 3 ; il ne termine pas G3. Insultes/bagarres, amour/parenté/deuil, rencontres sociales organisées, récréation sociale, catalogue des traits, âges/biographies et effets des opinions sur d’autres systèmes restent absents. La prochaine priorité est la filière utile et la recherche de l’étape 4, exclusivement dans [ROADMAP](../ROADMAP.md).
