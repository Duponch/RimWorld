# Filtrer les biens du chargement de caravane

La liste de chargement conserve ses pages de seize piles, mais permet désormais de choisir un type de bien. Une longue liste de matériaux n'oblige plus à parcourir toutes les pages pour retrouver la nourriture ou un objet précis. Le sélecteur utilise les contrôles de l'interface3D existante et ses matériaux carton.

Un seul fichier produit change : `src/ui3d/native-world.ts`. Le filtre et sa page sont des préférences temporaires du brouillon d'interface. Ils ne deviennent ni une règle de simulation, ni une quantité réservée ou chargée, ni un champ de sauvegarde ou de commande. Changer de type remet la pagination à la première page tout en conservant les quantités choisies dans tous les types. La confirmation envoie toujours le chargement complet à l'autorité existante.

Les options proviennent exclusivement des choix publics de chargement, sans parcours d'inventaires cachés. Les interdictions et capacités restent déterminées par la simulation. Un type disparu est retiré et la pagination est ajustée ; un ancien callback ne peut pas agir sur un brouillon remplacé ou sur un type devenu absent. Un bien devenu interdit reste refusé lors de l'aperçu, même si sa quantité sélectionnée a été conservée.

## Vérification et coût

Deux contrats portables ont d'abord échoué sur le contrôle absent, puis passé avec le seul NativeWorld candidat : pages/types distincts, quantités conservées, commande complète, interdiction maintenue, disparition/restauration du même original et callbacks périmés. Les mêmes deux contrats et les sept voisins de pagination passent après installation. La fixture UI est déclarée ; elle réemploie seulement la géographie publique419 immuable et ne joue aucune formation ou commande SIM. Aucun résultat de campagne n'en est déduit.

Une comparaison ciblée témoin/candidat/témoin reconstruit soixante fois le modèle de page avec1512 choix de piles, sans personne sélectionnée et avec le filtre « Tous ». Même entier diagnostique, zéro commande, mêmes seize piles visibles. Totaux wall150,080/154,612/151,181ms, CPU157/172/187ms. Le candidat présente donc un surcoût wall de0,0755 et0,0572ms par reconstruction face aux témoins ; ces écarts restent conservés. Les mesures CPU du processus et les petites fenêtres ne prouvent pas une égalité CPU.

Le filtre ajoute du travail lors de la reconstruction de cette page. Ce lot n'ajoute pas de boucle au Core, au rendu du jeu ni au HUD fermé. La comparaison ne mesure ni la géométrie/atlas, les interactions du navigateur, une sélection admissible complète avec devis, la branche d'un type filtré, les FPS ou le GPU. Aucun gain global ni coût nul n'est annoncé. Un premier préparateur de mesure non exécuté utilisait une saisie numérique vide ; il a été remplacé avant les mesures par une saisie valide dont l'acceptation et la nouvelle page sont vérifiées. Les reçus distinguent cette version obsolète du banc effectivement mesuré.

Les contrôles et l'état Git figurent dans le checkpoint privé désigné par [AGENTS.md](../../AGENTS.md). Produit297 conservé ; aucun contenu privé298 ni règle de retrait sous impact n'est intégré par ce lot. Les [six ensembles](core-completion-plan-20261020.md), la [dette de débit×6](movement-parity-v492-status.md) et la latence froide Home restent ouverts. Une publication Cloudflare est distincte de ce commit.
