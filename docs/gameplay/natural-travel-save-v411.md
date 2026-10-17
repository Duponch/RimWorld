# V411 — Sauvegarder les déplacements sur sol moussu

**17 octobre 2026, schéma256 inchangé ; fondations encore partielles, publication différée.** Le déplacement sur le sol moussu du nouveau générateur est correctement facturé par le moteur, mais son coût capturé de0,3tick était absent de la liste admise par la sauvegarde. Une partie pouvait donc devenir impossible à exporter pendant ce déplacement. La garde reconnaît maintenant exactement0,3 et4,3 avec le supplément d'un piège connu, uniquement à partir du schéma256. Les anciens formats et les refus de coûts voisins, de durée ou de délai restant falsifiés sont conservés.

Le coût reste celui capturé au départ de l'arête, même si son terrain disparaît ensuite. Aucun déplacement, besoin, propriétaire, objet, tirage aléatoire ou champ persistant n'est réécrit. Les valeurs proviennent des définitions de terrain et de pièges déjà raccordées ; aucune nouvelle règle de voyage n'est ajoutée.

## Défaut observé et contrôles

Le vrai parcours du nouveau générateur a atteint le camp200² au1037, puis déchargé ses35bois et8repas au1062. La première continuation a échoué sur un geste du pilote : le sélecteur de matériau était dans le panneau Architecte fermé. La suivante a réellement construit un tabouret, puis l'export a refusé deux durées de déplacement. Ces deux essais restent rouges.

Une reproduction déterministe depuis le dernier export1062 a trouvé dès1063 Inès sur `mossy-soil` : durée et délai restant corrects, facture0,3 refusée par la garde. Le diagnostic est sous `tmp/world-foundations/camp-resume-after-cp03/travel-refusal-reproduction/` ; son état de simulation n'est pas une sauvegarde jouée.

- Quinze cas dans trois fichiers passent en14,884s : arêtes réelles avec/sans piège, conservation après disparition de la source, recharge, snapshots full/delta et frontières historiques. Typage :46,755s.
- Après correction, le parcours Chrome/WebGPU exporte réellement le tabouret28360 au1147, après consommation de25bois. Le contrôle suivant reste rouge sur sa limite de35s avant confirmation de la coupe. L'export final réel au2423 est valide : arbre22256 absent,27bois28386 produits,10bois initiaux restants, mêmes Léonie7/Inès9. Deux repas ont été consommés pendant ces vrais ticks.
- Dernier état complet de ce contrôle : `tmp/world-foundations/camp-resume-after-cp03/native-03-motion-fix/camp-work-from-supplies-v4-98e11-ement-and-exact-home-reload/failure-current-no-replay.json`, SHA256 `c6cb1e48659c1b05fd1be668c0c065c272ec8e20f6ef72d5c2ac6faee56ea463`. Ce dernier export devient le parent de la continuation ; ni construction ni coupe ne sont rejouées.

## Retour réel et retrait du camp

La continuation depuis2423 a réellement reformé le groupe, repris les37bois et les provisions restantes, quitté le camp et rapporté ces mêmes biens au foyer. Le camp est retiré au3293, avec son marqueur d'abandon jusqu'au Core1832930. Le tabouret laissé sur place et les autres constructions sont perdus ; les mêmes piles de10bois16052 et27bois28386 sont déposées au foyer, désormais302bois au sol. Léonie7, Inès9, Salomé8 et le chat2389 sont conservés, sans perte de personne.

Deux erreurs de pilote restent distinctes : lecture initiale du foyer complet à la place de la projection du camp, puis attente d'un groupe encore hors carte alors que le retour et les dépôts étaient déjà terminés lors de l'export. Ce dernier essai reste rouge en91,431s ; son état final réel au3602 est conservé, sans refaire le voyage : `tmp/world-foundations/camp-resume-after-cp03/native-05-ui-context/camp-return-from-work2423--93a5a-ement-and-exact-home-reload/failure-current-no-replay.json`, SHA256 `b97e122fb93311e20e23cc7e8b2c3cfea32aca7104a54ed70bceb5421262802c`.

Le contrôle Chrome/WebGPU suivant passe en59,433s **en lecture seule depuis ce3602** : une colonie/carte restante, mêmes personnes et biens, camp absent, marqueur et information « Aucune carte locale », deux exports/recharges complets exacts, tick inchangé et erreurs navigateur vides. Les deux captures finales sont inspectées par ROOT. Ce contrôle qualifie le résultat et sa reprise ; il ne transforme pas les chronologies rouges précédentes en une suite entière verte. Sources gelées :1595chemins `src` exacts après normalisationLF, `tmp/world-foundations/camp-resume-after-cp03/freeze03-motion-fix.json`.

Build Pages local :16,520s ; contrôle documentaire final :1,792s. Le corpus, le parcours de présentation et les bancs de performances non affectés sont réutilisés. Le paquet local reste distinct de la productionV403 ; aucun déploiement n'est acquis par ces contrôles.

Le correctif ferme le refus de sauvegarde observé. Le camp travaillé, son retrait et le retour sont acquis par ces reprises, avec leurs limites d'observation déclarées. Aucun gain de performances n'est démontré. Les autres frontières des [fondations monde](../development/world-foundations.md), leur qualification composée et la nouvelle démonstration restent à terminer. Les Aulnes et leurs archives sont intactes ; productionV403 inchangée.
