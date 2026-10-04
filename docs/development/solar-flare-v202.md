# Éruption solaire et résilience électrique — V202

Lot borné après V201, fondé sur la [recherche Core 1.6.4871](../research/solar-flare-core-v202.md). Aucun nouvel appareil ni météo graphique. Le joueur protège le froid, la lumière, les cultures et les ateliers avec les solutions physiques déjà présentes ; une batterie ne contourne pas cette condition.

## Autorité et calendrier

`World.worldIncidents` est un agenda mondial Cassandra privé, distinct de Misc de carte et ThreatSmall. Adoption prospective à la première avancée réelle d’une partie avec `gameProfile`, sans rattrapage, sans changement des flux existants. Premier contrôle 90 100 ticks locaux, cadence 100, tentative 1/900. Enveloppe fixe 4 : Eclipse 1,5 absent, SolarFlare 1,3 livré, Aurora 1,2 absent. Les tickets absents ou refusés restent silencieux. Cette enveloppe ne prétend pas reproduire les pondérations contextuelles exhaustives de Core.

Une éruption exige absence de condition identique et quinze jours révolus depuis le dernier début. Aucun filtre d’appareil, richesse, biome ou météo ajouté. Durée tirée et arrondie au pair de 9 000 à 30 000 Core ; `endCore` persisté et expiration strictement après cette borne. L’agenda est desservi après les dix frontières électriques du tick : un début au tick N s’applique à partir de N×10+1 ; la fin est publiée à la première frontière locale strictement supérieure. Le réseau retrouve son fonctionnement dès le premier Core supérieur à `endCore`, même si la fin visible est publiée au plus neuf Core plus tard. La fin est traitée avant une nouvelle occasion mondiale au même tick.

## Effets physiques

Pendant la condition, `advancePower` bloque les démarrages et les transferts de charge/décharge. Aux multiples de vingt Core, délestage des consommateurs de sortie effective négative : maximum entre un et cinq pour cent arrondis au pair, tirages avec remplacement. Les réseaux équilibrés sans batterie doivent participer. Les sources positives ou nulles restent actives, le bois brûle normalement, les batteries fuient normalement à 5 Wd/jour, même emballées. Aucun vidage, dégât ou effacement de connexion/interrupteur. Reprise par les cadences et réserves ordinaires, jamais réallumage global.

Lumière, froid, croissance, conservation, portes et ateliers lisent leur alimentation réelle. Pas de garde globale anticipant le délestage. Couture électrique manuelle au facteur 0,5 préservée ; autres postes suivent leurs contrats d’arrêt, de matière, d’ouvrage, de progression et de dépôt. Pluie électrique et pannes restent distinctes ; une batterie exposée chargée au-delà de 100 Wd reste vulnérable. Aucune immunité météorologique ni changement de ciel.

## Persistance, présentation et coût

Schéma 184 : valider strictement 183 puis changer uniquement la version. Refuser le champ futur, y compris présent avec `undefined` dans un objet ancien. Chargement, pause et pas nul n’adoptent ni calendrier ni condition, énergie, histoire ou tirage. Forme fermée, échéances, counters, cooldown et PRNG validés ; snapshots/checkpoints/deltas atomiques, changements au même tick et témoins immuables inclus.

Lettre et inspection observent les snapshots confirmés, palette actuelle, `textContent`. La 48e colonie publique prépare une occasion future puis exerce réellement début, délestage, reprise et sauvegarde. Elle ne prouve pas une fréquence naturelle. Pas de nouveau shader, lot, texture, lumière Three ou upload graphique. Le calendrier stable coûte une consultation O(1) ; seules les frontières électriques réemploient les candidats des réseaux existants. Mesure CPU isolée puis Chromium matériel et présentation successifs, sources gelées ; aucun coût GPU nul ou gain général annoncé.

## Validation et frontières

Contrôles ciblés : J15 strict, poids absents, refus/cooldown et durée/expiration ; fuite sans transfert, sources/fuel et réseaux équilibrés ; reprise physique ; couture manuelle, matières de cuisine/recherche conservées, lampe/croissance et froid sans rattrapage, porte engagée ; pluie/panne ; migration neutre, rejet atomique et continuation exacte. Rejouer les voisins pertinents, build/typage, scène native et présentation ; pas de campagne longue systématique.

Eclipse, Aurora, monde multicartes, DLC/sous-sol, EMP, Zzztt, sons solaires dédiés et narrateur mondial exhaustif restent différés. Les preuves seront consignées dans [la validation V202](../history/validation-solar-flare-v202.md), sans transformer une scène préparée ou un microbanc en preuve générale.
