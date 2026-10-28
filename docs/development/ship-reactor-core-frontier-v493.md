# Réacteur et frontière physique — V493

État : correction committée et poussée dans5d8b227f, schéma297 inchangé ; aucun déploiement Cloudflare. Ce jalon précède le raccord de la victoire ; il ne livre pas le décollage.

## Écart et primaire

Le démarrage utilisait tick×10 et la validation exigeait startCore multiple10, malgré les phases physiques297. Une activation au Core1005 était enregistrée1000 ; un devis restait courant après un pas physique dans le même tick civil. Le passage opérationnel n'était avancé qu'au macro suivant, au lieu du premier Core strictement supérieur à l'échéance. Un caisson relié était aussi inspecté sans transmettre la preuve de phase courante.

Lecture fraîche le28octobre de CompProperties_Hibernatable et CompHibernatable dans Core1.6.4871rev590/DLL5cf1 : valeur par défaut14jours ; Buildings_Ship.xml ne la surcharge pas ; ajout en Float32 de TicksGame et14×60000, arrondi Unity au pair ; transition uniquement si TicksGame>endStartupTick. Le [Wiki réacteur](https://www.rimworldwiki.com/wiki/Ship_reactor) décrit15jours : divergence conservée, pas de remplacement de la primaire par une moyenne ou un témoignage. Aucun changement de la pression/du générateur de raids n'est déduit de ces seules classes.

## Correction

L'activation297 lit le Core réellement joué et son plan périme dès que cette frontière change. Les dates fines sont admises uniquement en297 ; les anciennes versions gardent leurs dates multiples10 et les versions futures restent refusées. La date native Float32 et le test strict après échéance sont conservés. Le contrôle des caissons reliés reçoit la preuve du même Core.

Une échéance locale WeakMap est reconstruite depuis les vrais bâtiments au chargement/premier pas et à chaque passe macro déjà existante. L'activation la révoque. Entre macros, la sonde est constante tant que l'échéance retenue est future ; elle ne parcourt pas les bâtiments. À échéance, la passe autoritaire relit les seuls bâtiments réellement présents, et le moteur impose une publication complète pour la transition. Retirer un réacteur ne permet pas de le terminer via une vieille référence. Ce cache ne figure pas dans la sauvegarde et ne peut remplacer l'état original.

## Contrôles acquis et limites

Les quatre régressions fonctionnelles ont été reproduites sur le produit précédent puis corrigées. Cas supplémentaires : absence de traversée sur les pas ordinaires, invalidation à l'activation, retrait avant échéance, sauvegarde entière et checkpoint public exacts, vrai pas moteur à échéance+1 avec publication complète et événement unique. Une fixture de frontière temporelle préparée ne prouve pas14jours de défense réellement joués.

Quatre anciens rouges de ship-reactor-lifecycle-v451 ont été reproduits exactement sur le gel cf752 : les faux schémas futurs277/278 sont désormais historiques. Maintenance des tests vers la vraie prochaine version, gardes produit inchangées. Trois rouges de transport legacy (registre de fixture/phase future injectée dans ancien274) sont conservés et comparés à la base ; aucun PASS global annoncé.

50cas distincts ciblés acquis par reprises :11nouveaux contrats,12lifecycle,1physique,14owner de publication et12parité moteur ; un ancien cas explicitementsuperseded reste sauté. Les défauts de préparation des fixtures de frontière (budget de chemin au tick0 et calendrier de détérioration au tick0 malgré le tick préparé84000) ont été corrigés en construisant explicitement leurs vrais propriétaires de frontière ; aucune garde produit assouplie. Les3rouges transport sont identiques sur la copie précédente exacte et restent ouverts. Deux relectures indépendantes ne trouvent pas de blocage ; l'une a demandé les cas à deux échéances et remplacement d'owner désormais couverts. Le vrai pas à phase0, son suffixe macro, l'événement unique, le Full obligatoire et la recharge entière sont également acquis.

Comparaison Node W/C/W, même monde préparé128×128,1800vrais pas Core par échantillon,5mondes frais par processus, mêmes sources précédentes gelées : moyenne murale326,095/325,319/499,973ms ; CPU403/422,4/525ms. Les15états finaux sont identiques, SHA0175cd8e2d3ffc33fefb367038dbddc9814f88e4a89a6ef6d93b37623dfe0c03. Le candidat est dans la dispersion des témoins ; la dérive du second témoin est conservée. Pas de recul net établi pour cette sonde, pas de gain causal, de mesure FPS/GPU ni d'équivalence globale. La calibration180Core antérieure est conservée séparément ; elle ne remplace pas ce protocole1800. Ce coût ordinaire sansréacteur teste la sonde ajoutée au moteur ; les contrats à échéance couvrent séparément le cas rare réel. Aucun nouveaubenchmarkx6/global n'est prétendu et PERF-V492-X6 reste ouverte.

Le mode sans vue physique sélectionnée conserve actuellement une publication au macro/pause : la publication fine complète qualifiée ici concerne une vraie vue physique sélectionnée, pas un affichage invisible instantané. Les raids gardent leur calendrier macro existant. Le cache ne sera pas repris tel quel en298 : ses gardes297, comme toute la famille physique, devront être étendus de manière fermée pour éviter un scan à chaque Core futur. Typage et compilation Pages passent ; sortie sur C uniquement, aucun déploiement. Références privées : tmp/victory-resume-v493/progress.md et Cvisualizations/victory-resume-v493 ; campagne réelle94de/T3328 exclue de toute QA.
