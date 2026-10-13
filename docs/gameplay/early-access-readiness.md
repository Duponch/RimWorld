# Préparer une version early access

Objectif humain du 13 octobre 2026 : une version prête à être essayée par des joueurs, avec progression autonome entre lots validés, commits/push et publications regroupées. Le statut actuel reste un jeu en développement ; un compteur de contenu RimWorld ne définit pas sa préparation.

## Critères de sortie

| Parcours joueur | Acquis actuellement | Qualification encore nécessaire |
| --- | --- | --- |
| Créer une colonie choisie | Cinq pages, site adopté, trois personnes parmi huit, trois biomes ; arrivée V335 et première nuit V336 acquises | Campagne durable ; autres scénarios explicitement absents |
| Comprendre et préparer les premiers jours | Carnet contextuel V334, outils et dossiers ; couchages gratuits V336, première nuit naturelle tempérée, boréale et aride | Renouvellement des ressources et incidents durant une campagne plus longue |
| Survivre et progresser | Construction, agriculture, cuisine, travail, besoins, soins, incidents et recherche déjà reliés | Campagne suffisamment longue pour observer consommation, renouvellement, saisons, incident et récupération |
| Conserver sa campagne | Copies nommées, autosauvegardes, import/export ; reprises historiques et départ choisi qualifiés | Reprises réparties pendant la campagne naturelle, conservation complète des identités et propriétaires |
| Comprendre une difficulté ou une issue | Diagnostics de chantier, santé, météo, ordres et sauvegardes ; [V337 acquis sur six situations préparées](colonist-availability-v337.md), absence expliquée, destinations réelles et six recharges exactes, sans fin prématurée | Observer ces diagnostics et les issues durant une campagne naturelle longue |
| Jouer avec les visuels actuels | UI, chambre, carton et LOD configurables ; contrôles natifs locaux | Surveiller fluidité active, mémoire et récupération graphique ; pas de promesse 240 FPS ni compatibilité matérielle exhaustive |

Une case de catalogue, un bouton grisé, une simulation préparée ou un test ciblé ne qualifie pas à lui seul une boucle naturelle. Les domaines Core absents doivent rester clairement identifiés. Les extensions et les nouveaux biomes viennent après la cohérence des trois biomes existants.

## Ordre de travail courant

1. Carnet contextuel V334 commité et poussé ; préserver toutes les mécaniques.
2. Arrivée physique V335 acquise : personnes et biens réellement détenus pendant la descente, mêmes identités et quantités à l’ouverture, pause et reprise exactes. Les écarts Core restent explicites, sans interdiction générique ou scorie fictives.
3. Couchage humain au sol V336 acquis avec trois camps de première nuit, ressources ordinaires et douze recharges exactes ; correction de précision du climat issu du globe, valeurs sauvegardées conservées. Les limites et reprises sont dans [la note V336](human-sleeping-spots-v336.md).
4. [V337 acquis : expliquer l’absence de colon contrôlable](colonist-availability-v337.md). Groupe unitaire ciblé137cas/14fichiers acquis par reprises, dont35nouveaux/2fichiers ; natif six situations préparées PASS163,438s avec six recharges exactes et destinations Santé/Monde/Menu par clic et clavier, continuation×1 sans pause automatique. Corpus63références/66fichiers PASS60,758s après correction d’admission d’IDs hors carte dans le bridge ; typage11,544s et build Pages/typage final15,572s passent, gel2855exact. Le résident à terre des unités et le décès clinique local préparé du natif sont distincts ; aucun ne prouve un décès durant un voyage naturel. Le critère d’absence est acquis sur ces états préparés, sans suite complète ni gainFPS certifiés. Qualifier ensuite la campagne longue avec reprises et incidents ; traiter les blocages et les issues possibles. Produit7c18d244 commité/poussé et publié une seule fois avecV336 en f604f7ac ;104réponsesHTTPS exactes, clôture dans la note de publication.
5. Publier une version d’essai avec une liste précise des parcours acquis, du contenu partiel et des problèmes connus ; poursuivre ensuite les priorités révélées par les joueurs.

La recherche et les validations peuvent préciser cet ordre. Les sous-métiers restent reportés ; la refonte papier demeure sur sa branche séparée. La relance de cette conversation est active à la demande humaine ; elle respecte toute nouvelle instruction d’arrêt ou de pause.
