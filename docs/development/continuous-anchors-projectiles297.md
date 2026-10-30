# Ancres de personnages et projectiles continus — schéma 297

Le 30 octobre 2026, deux causes de saccades de présentation ont été corrigées. Ce lot ne clôt pas le chantier de fluidité générale : les interruptions de données confirmées à ×6, les autres effets et certaines animations moyennes restent à traiter. Les six ensembles et la victoire restent suspendus.

## Comportement corrigé

**Personnage dans un lit, sur un siège ou à un point de contact.** Le Full résout la position du corps et sa hauteur. Une phase d’acteurs sales remplaçait ensuite cette ancre par la cellule et la hauteur du sol, même pour une personne toujours endormie. L’approche artificielle activait aussi la marche ; le prochain Full remettait le personnage sur le lit. L’alternance expliquait l’enfoncement et la marche couchée.

PawnLayer conserve maintenant la différence XYZ entre l’ancre résolue au Full et sa base cellulaire. Les phases déplacent cette base sans perdre l’ancre. Un tableau Float64 par slot résident, réécrit au Full, évite une nouvelle entrée Map et un objet XYZ par personnage et par Full. Le tableau ne grandit que lorsque sa capacité est insuffisante. Pas de recherche de lit, de travail ou de contact supplémentaire par phase ; pas de modification du World.

**Projectile à distance moyenne.** La pose était retenue à 12 Hz alors que le temps confirmé continuait d’avancer. Le vrai dessin restait donc immobile entre deux publications. Le petit graphe analytique déjà utilisé de près sert désormais aussi à distance moyenne. Le filtrage des projectiles trop éloignés et la disparition à l’arrivée sont conservés. La palette de poses et son attribut de slot sont retirés pour cette seule famille d’effets ; pas de nouvelle boucle d’animation, publication, passe ou draw.

Seules PawnLayer.ts et ProjectileLayer.ts changent dans les sources produit de ce lot. La physique, la vitesse, le Worker, les commandes, la sauvegarde et le schéma 297 restent identiques. La nouvelle politique MotionTimeline étudiée en privé n’entre pas dans cette livraison.

## Preuves ciblées

Le dossier privé courant est désigné par le début d’AGENTS.md ; les artefacts suivants restent conservés sous `action-fluency-20261030/whole-animation-audit-20261030` sur le volume scratch.

- `sleep-red-v2.json` reproduit six refus sur le vrai Noé 19871, lit 19938, dans le public v386 Les Aulnes : hauteur 0 au lieu de 0,5 et marche active à ×3/×6. L’ancien échec v1 provenait d’un contrôle de sauvegarde appliqué au Full de présentation et est conservé séparément.
- Le correctif Map initial a acquis 18 cas ciblés. L’équivalence Map → Float64Array a ensuite acquis un cas comparant les attributs, indices et trois uniformes soumis sur seize replays des mêmes quinze personnes, avec vrai Full/phase et conservation du Whole. Ce contrat privé à module de référence n’est pas intégré aux tests produit.
- Une observation Native de 1 080 soumissions à ×1/×3/×6 garde deux dormeurs à leur hauteur et leur centre de lit, sans marche parasite. Ce candidat comprenait aussi une horloge privée : cette observation n’est pas présentée comme une exécution Native des seuls octets produit finaux. Le contrat d’ancre est vérifié à nouveau dans l’intégration produit.
- `middle-projectile-author-v2/gpu-baseline-v2` reproduit exactement quatre refus fonctionnels au GPU : à 20 et 40 ms, le projectile moyen ne bouge pas, alors que le rendu complet original avance. Le rapport conserve son statut FAILED_FUNCTIONAL_ORACLE.
- `middle-projectile-author-v2/gpu-candidate-v2` passe le même contrat WebGPU : onze petits dessins et lectures de pixels sur le même tir réellement joué jusqu’à son arrivée à 37 Core. Les trois instants moyens suivent le graphe complet original ; pause, near, far, arrivée, Whole, recharge et validation GPU sont contrôlés. Aucun nouveau tir favorable n’est choisi. L’essai v1 avait échoué au lancement du navigateur avant toute acquisition ; il reste conservé.
- Deux tests portables gardent le temps vivant avec des flux de vol stables, puis naissance, retrait lointain, réadmission et arrivée confirmée. Ils ne prétendent pas remplacer l’oracle de pixels.

L’intégration acquiert **21 PASS, 0 FAIL, 38 cas filtrés**, en 73,302 s ; typage 18,099 s et Pages CODE 3,783 s. Le paquet intégré et ses résultats exacts sont dans `product-anchor-projectile-v1/report.json` ; typage et construction Pages CODE y sont consignés. Le dossier public est résolu sans être recopié. Les cas filtrés et les adaptateurs historiques des voisins restent déclarés ; aucune suite globale verte n’est affirmée.

## Coût observé et limites

Une seule contre-mesure du chemin d’ancre a été exécutée après suppression des allocations Map, avec les mêmes données, chauffe et 240 replays W/C/W. Temps wall cumulés en millisecondes :

| Chemin | W1 | Candidat array | W2 |
| --- | ---: | ---: | ---: |
| Full + phase + déplacement | 102,912 | 116,790 | 88,517 |
| Full seul | 74,300 | 63,472 | 58,355 |
| Phase + déplacement | 12,333 | 10,383 | 9,431 |

Le fil CPU du chemin couplé mesure 109/110/94 ms, le processus 172/187/172 ms. Le candidat reste adverse sur le chemin couplé : environ 0,058 à 0,118 ms de wall supplémentaire par replay de quinze acteurs par rapport aux deux témoins. Cela n’est ni un gain causal ni un PASS de non-régression global. Le Full seul et les phases ne donnent pas un verdict uniforme ; la quantification CPU, les premiers blocs et la dérive sont conservées. La première version Map adverse (112,814/163,064/90,829 ms couplés) reste archivée ; aucune comparaison historique causale Map/array n’est déduite. Le conflit de websocket de préparation est gardé, aucun serveur existant n’a été fermé et aucun rejeu ne le masque.

Pour les projectiles, les contrôles de dessin conservent les buffers de vol entre les instants. Le candidat supprime la palette retenue et son écriture CPU, mais réintroduit le petit calcul analytique dans les sommets moyens. Aucune durée GPU ni variation des FPS globaux n’a été mesurée : on ne revendique pas un coût GPU nul ou un gain GPU.

La dernière continuation Native de diagnostic, distincte des campagnes humaines, est le RAW `17d04403283c5ad4d79d9f7715c16f841b9cdac04a0085f86d1a337687d8bd98`, Core 108870, propre recharge exacte. Ne pas revenir à ses parents pour obtenir un résultat favorable. Le profil unique qui l’a produit montre surtout un épuisement de l’historique confirmé à ×6 et des admissions parfois longues ; il ne profile pas le Worker et n’attribue donc pas le déficit au moteur.

Les campagnes humaines et QA protégées, les sauvegardes et les serveurs existants sont préservés. Aucune publication Cloudflare n’est faite par ce commit ; la dernière attestée reste V491. Le travail continue exclusivement sur la fluidité et la stabilité générales.
