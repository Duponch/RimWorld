# Palette de précipitations compatible avec les camps — V410

**17 octobre 2026, schéma256 inchangé.** La pluie d’un camp200² dépassait la hauteur maximale de texture du périphérique utilisé et arrêtait le rendu. Les lignes logiques des paramètres FX sont désormais réparties sur les deux axes de leur texture. Aucun changement de particules, de météo simulée ou de sauvegarde. Les voyages et cartes temporaires restent en cours ; aucune publication de ce lot, productionV403 inchangée.

## Correction et limites

Le premier parcours réel a conservé le tick1037 avant l’entréeCamp, puis rencontré une texture6×16384 pour une limite observée de8192. Ce rouge est conservé. `FxAnimationCache` répartit maintenant les émetteurs sur plusieurs colonnes de cellules, avec une hauteur maximale de2048. Les offsets linéaires et les lectures existantes restent identiques : pour une ligne logique `r`, une cellule `c` et `P` colonnes d’émetteurs, l’adresse est `x=(r mod P)×cellules+c`, `y=floor(r/P)`.

Les capacités météo200²/250² produisent48×2048 et celle400² produit192×2048. Données CPU et GPU, propriétaires de palette, valeurs échantillonnées et nombre de particules sont conservés ; pas de réduction graphique de secours. Le nœud de texture reste le même, la croissance remplace et libère son image comme auparavant. Un uniforme résident règle le nombre de colonnes. Cadence, publications, positions et normales restent inchangées.

La correction traite les dimensions rencontrées et contrôlées, pas toute combinaison arbitraire de cellules et d’émetteurs FX. Elle ne prouve aucun gain FPS ou coût GPU nul : l’adressage ajoute des opérations entières aux lectures. Le diagnostic général des performances demandé reste distinct.

## Contrôles acquis

- 23cas/trois fichiers PASS19,364s, dont deux nouveaux : lecture des vraies coordonnées TSL et de la texture allouée aux frontières2048/8192, conservation des anciennes valeurs et des nœuds déjà construits, libération, météo200²/250²/400² et publications en pause. Aucun validateur de sauvegarde assoupli.
- Type PASS12,458s, puis contrôle global avec les corrections graphiquesV409 PASS9,889s. Builds et tests de règles inchangés réutilisés ; aucun changement d’horloge, bridge ou phase de travail nécessitant de rejouer la présentation générale.
- Le parcours depuis le vrai1037 a effectivement créé le camp200² et conservé son export complet avant assertion. Son contrôle UI ultérieur reste ROUGE : la première lecture de l’état affiché n’a pas répondu, puis le diagnostic du pilote a masqué ce timeout avec une lecture de notice. Aucun mismatch de champs n’avait été obtenu ; ce rouge n’est pas promu en résultat vert.
- Audit distinct en PAUSE depuis cet exportCamp : Chrome/WebGPU PASS46,053s. Le clone de l’état affiché, sa sérialisation et son transfert répondent ; la projection est exactement celle de la sauvegarde, puis l’export complet est identique à l’entrée. Pluie visible, deux cartes conservées, tick1037 inchangé, erreurs[] et aucun incident. Capture inspectée ROOT. La cause profonde du blocage antérieur n’est pas établie ; ni un correctif d’oracle arbitraire ni une amélioration de fluidité ne sont annoncés.

La lecture instrumentée de cet audit prend environ186ms pour le clone,33ms pour la sérialisation et355ms pour le transfert de9,13millions de caractères. Ces opérations d’observation QA ne mesurent ni le coût ordinaire d’une image ni le GPU. Aucune nouvelle acquisition, construction ou boucle de retour n’est qualifiée par cet audit.

Sources, entrées et logs : `tmp/validation-runs/camp-v410-fx-*`, `tmp/world-foundations/camp-v410/freeze01.json` et `tmp/world-foundations/camp-cp03-readonly/`. SourceCamp au1037 SHA256 `174a81e67b9d64e1c1e5a2c44e043e279bc33fa11e8bec806ac2617675470c21`. Le parent avantCamp et les premiers échecs restent immuables. Les Aulnes, archives, parties personnelles, personnes et biens sont préservés. Prochaine étape : continuer les travaux et le retour depuis ce vrai camp, sans rejouer le départ.
