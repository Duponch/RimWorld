# Corrections rencontrées pendant la partie réelle325

31 octobre 2026. La partie ordinaire325×325 a révélé un inspecteur de réserve qui se réaffichait après fermeture et un libellé de couchage animal tronqué. La lecture du parcours d'autorisation a également identifié un groupe de permissions contradictoires. La campagne reste conservée ; les tests ci-dessous utilisent des fixtures de composant explicites, jamais cette partie.

## Comportement corrigé

- Après une modification de stockage, X, Échap et Fermer libèrent la sélection et le panneau conservé par l'hôte. Le callback global de désélection des autres écrans ne change pas ; les hôtes sans fermeture de page restent compatibles.
- Autoriser ou Interdire sur une sélection mélangée applique le même état à chaque pile, selon l'action affichée. Les commandes restent individuelles et ordonnées ; chaque réponse est attendue et un refus interrompt le groupe avant les piles suivantes.
- La carte Architecte affiche « Couchage animal » ; son infobulle conserve le nom complet. Identité, dimensions physiques et commandes de placement ne changent pas.

## Contrôles et limites

Deux reproductions rouges sur le code précédent ; quatre contrôles dédiés verts sur le candidat puis dans le produit : fermeture après modification réelle de politique, hôte sans closePage, deux ordres de sélection mixte avec conservation des quantités/propriétaires/tick/RNG/id, réponse différée puis refus.

La passe voisine comporte34cas :29passent,5échouent. Ces cinq cas échouent également, avec les mêmes causes, sur le code précédent dans un témoin séparé à cinq cas sélectionnés, avec les tests non modifiés : deux attentes anciennes sur l'action des fragments, une ancienne dimension du dossier Bio, deux fixtures de sauvetage liées au schéma297. La suite voisine n'est donc pas déclarée entièrement verte. Reçus complets dans le checkpoint privé `playthrough-325-20261031/ui-fixes-private/v2` et le journal `tmp/validation-runs/play325-ui-targeted-2026-10-31T16-28-04.765Z-25100`.

La normalisation intervient dans la boucle de construction des commandes existante, sans seconde passe ni copie de liste. La fermeture intervient à l'action utilisateur. Aucun travail par image, modification de simulation, cadence, RNG, sauvegarde ou règle physique n'est ajouté. Ce bornage ne constitue pas une mesure de coût nul ni de FPS globaux. Typage, paquet Pages et publication sont qualifiés séparément dans `playthrough-325-20261031/ui-fixes-release` ; un commit seul ne vaut pas publication.

## Référence

La lecture primaire RimWorld Core1.6.4871rev590 (DLL5cf1) et la recherche ciblée du même jour ont confirmé l'affectation explicite d'autorisation des objets, distincte du transport. Le parcours de sélection groupée d'Elsewhere reste une adaptation d'interface ; ce lot n'ajoute ni raccourciF ni rectangle Autoriser. La note privée `research-starting-forbidden.md` conserve les classes et sources consultées, dont le [guide de démarrage](https://rimworldwiki.com/wiki/Quickstart_Guides#Landing).

Les six ensembles restent en pause. La prochaine étape est la poursuite du même jeu : chaleur, combustible, nourriture accessible, récolte et installation, avec corrections au fil des défauts réellement rencontrés.
