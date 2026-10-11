# V311 — fonderie électrique et fusion des armes

**Lot fonctionnel qualifié, schéma 222.** La boucle choisit une arme entière au sol, la transporte vers une fonderie alimentée, la détruit au terme du travail, puis range un métal réel réutilisable. V310 est commité/poussé en `4092589e` ; ce document rassemble le contrat, les acquisitions par reprises et leurs limites. [Référence Core actuelle et adaptations](../research/smelting-core-v311.md), [guide joueur](player-guide.md#fondre-une-arme--v311).

## Construction et facture

La **Fonderie électrique** (`electric-smelter`) se construit dans Architecte→Production :170acier+2composants, Construction4,350ticks neutres,3×1 orientable,180PV. Électricité accessible comme socle ; terrain sec compatible et obstacles contrôlés par le chantier commun. Traversée coût5, sans stationnement sur son emprise. Minification, réinstallation, démontage et conservation du même meuble suivent les circuits existants.

Consommation700W ; alimentation réelle, commutation, panne, pluie etEMP suivent le réseau commun. Lueur orange rayon6 et chaleur alimentée1,5/tick ; chaleur supplémentaire3,2×fraction/tick de travail, répartie entre les cases de la région thermique. Une coupure arrête le travail, sans mode manuel à mi-vitesse. Température, lumière et rôleWorkshop restent les facteurs d’environnement communs.

La recette **Fondre une arme** (`smelt-weapon`) utilise les factures existantes : nombre ou toujours, suspendre, rayon et destination dépôt/réserve. Le mode « jusqu’àX » est refusé pour cette seule recette, car sa sortie spéciale est variable. Nouvelle facture : nombre1,rayon999,destinationréserve,PV0–100%,qualitédéplorable–légendaire ; les **quatre types d’armes sont décochés**. Le joueur active les types sacrifiables et ajuste les bornes avant tout ramassage. L’avertissement indique destruction de l’arme,25% des métaux et aucun composant.

## Circuit physique et rendement

Artisanat doit être activé pour un colon libre capable de manipulation, même pour l’ordre direct local. Aucun niveauArtisanat minimum, capacitéViolence, arme équipée ou médicament n’est exigé ; aucune XP ou qualité nouvelle n’est gagnée. Travail neutre160ticks ; vitesse `max(.1, manipulation×(.7+.3×min(1,sight)))` puis environnement commun, avec capacités appliquées une seule fois.

Seule une des quatre armes entières, autorisée et initialement au sol, peut être choisie. Type, qualité et pourcentage de PV arrondi au pair sont revalidés pendant collecte/portage/staging et avant consommation. L’objet reste le même ID avec son WeaponState au ramassage et au dépôt. Les claims partagés excluent équipement, transport, commerce et production en file concurrents ; la station, l’interaction et le staging sont réellement réservés.

| Arme consommée | Produit réel |
| --- | --- |
| Revolver |7–8acier |
| Fusil à verrou |15acier |
| LanceurEMP |18–19acier |
| Couteau en plastacier |7–8plastacier |

PV et qualité n’affectent pas ces rendements. Au seuil, les préflights vérifient objet, staging, worker, poste/facture, claims, cargo, limite de piles et nouvelID. Un seul tirage est projeté, même pour15acier fixe. La transaction retire l’arme, crée une pile métallique portée avec nouvelID, engage le PRNG, décrémente seulement la facture nombre et passe enoutput. L’inspection, le planner et les échecs ne tirent aucun hasard. La consommation libère le slot nécessaire à sa sortie.

Le produit porté rejoint le dépôt ou la réserve existante ; une livraison partielle garde le reste et son ID. Le sol saturé conserve le métal porté jusqu’à une place disponible. Après dépôt, ce métal utilise normalement transport, stockage et construction/fabrication ; il n’est pas un compteur décoratif.

## Interruptions et reprise

Changement de réglages, permission de l’arme au sol, suppression de facture/poste, mobilisation, étourdissement, incapacité ou perte de courant réemploient la libération commune. L’arme placée reste au sol ; le cargo tenu reste physique et l’arête engagée est conservée. La progression peut être perdue avant consommation, faute d’inachevé de fusion. Une commande volontaire sans place pour conserver le cargo échoue avant publication. Interruption après production ne refond pas l’objet disparu et ne recrée aucun tirage.

Fichier et Decoder partagent `validSmeltingTransport`. Schéma221 est strictement validé avant la seule modification de numéro vers222 : aucun bâtiment, filtre, travail, objet, ressource ou tirage ajouté rétroactivement. Les anciennes versions refusentkind/recette/filtre futurs, y comprissmeltFilter sur une autre facture ou dans une archive réelle. Les modes historiques des autres recettes restent admis.

Source/held/placed : une armequantity1, ownerground ou porteur exact, étatcanonique, filtre courant, claims uniques et staging commun. Gatherprogress0 ; workprogress entier0..1_600_000, seuil compris lorsqu’un préflight bloque. Output : ingredients[],progress0,un seul produitownerpawn lié àproductId ; acier1..19 ou plastacier1..8, sans WeaponState/ApparelState. La garde accepte une sortie dans cette enveloppe sans inventer un ledger de son arme disparue ; le rendement exact relève de la transaction jouée. Une réservation de sortie partielle doit respecter quantité et capacité réelles.

## Contrôles et limites

ROOT exécute seul les contrôles, séquentiellement sur sources/tests/pilotes figés. Les groupes ciblés et historiques totalisent **79cas uniques dans huit fichiers**, acquis par reprises : **46nouveaux cas dans trois fichiers** (18SIM,25persistance,3présentation), plus production, commandes, usinage, biocarburant et équipement. Les quatre armes aux trois stages, sortie bornée/partielle, filtre et copie de commande, claims concurrents, migration neutre/refus221 et adoption avant/après consommation sont couverts. Ce résultat n’est pas un passage unique de tous les fichiers.

Le corpus public **63références/66fichiers PASS68,624s**, rapport `tmp/smelting-v311/public-controls/public-context-check-vmioAn` : DecoderRAW et corpsMAIN courant extrait littéralement, deux copies avec un véritable tick ordinaire par référence, anciennes vues retenues et reload canonique exact. Les bytes/census des sources et fichiers publics restent exacts. Typage préliminaire PASS13,565s ; le contrôle final PASS14,441s couvre les sources et pilotes clôturés.

Les rouges sont conservés sous `tmp/validation-runs/v311-*` : premier groupe11,209s (import de sauvegarde et whitelist des minifiés), reprise20,170s (cycle d’import des recettes et fixturehistorique), reprise16,002s (présence d’un ancien segment prise à tort pour mouvement actif). Les réparations séparent le contenu pur de fusion, gardent les champsabsents des versionspré20/25 sans admettre un conteneur malformé, retirent le champzoneId futur de la seule fixture35 et testent `motion.end>tick`. Les gardes produit ne sont pas assouplies pour passer une fixturefuture. RepriseSIM finale18cas PASS7,067s ; les autres fichiers déjà verts ne sont pas rejoués sans cause.

Trois premiers parcours natifs restent rouges :133,468s sur l’observateurscanner-off (état final déjàoff, cause du timeout non établie),129,634s avec livraisons incomplètes et besoins réels du constructeur, puis233,462s avec deux constructrices. Ce dernier acquiert les170acier+2composants, la construction alimentée au tick14144 et un **save/reload complet exact14160**, avant un timeout du pilote cherchant le dockZones caché par son panneauTravail. Artifacts `tmp/smelting-v311/native-first`, `native-observer`, `native-builders` ; gels `freeze-2O5okW`, `freeze-rm5IUn`, `freeze-4Vv73L`, tous2634entrées exactes. Aucun résultat de fusion n’est déduit de ces rouges.

La reprise lit le checkpoint14160 obtenu par le jeu, SHA `4de7f87d257d9a66c19fd3b71eaaa8211c3a7451e379a62aa4e0d88d6f4a4fd2`, et ne change aucun besoin, stock, ID, tick ou tirage. Le helper ferme désormais le panneau par Échap avant de sélectionner un outil du dock. Son premier essai FAIL28,407s lit la nouvelle facture avant son adoption ; l’attente de publication est corrigée. La reprise suivante FAIL170,716s acquiert les refusPV/qualité, le vrai cargo et les rechargesheld14322/work14432, avant un ordre de coupure donné à Salomé trop éloignée : l’arme a normalement été consommée avant son arrivée. Répertoires `native-fusion-red`/`native-bill-red`, gels `freeze-kT2TtW`/`freeze-im3HwA`,2634entrées exactes.

La continuation finale du **vrai checkpointwork14432**, SHA `9904e4183e57e9d24a50945cd7e161d496f01ac7d7073b0c42415628ae2902ef`, passe en **128,946s**, Chrome/WebGPU2560×1440. Ada, physiquement plus proche, coupe puis réactive le poste ; la même arme placée demeure intacte au tick14500. Sacha reprend et produit15acier avec nouvelID32309 au tick14697, arme22499 consommée et facture décrémentée. La pile est portée puis rangée dans la réserve125/177 ; Ada en livre une unité à la nouvelle conduite125/178, laissant14acier sur la même pile au tick14835. Les deux armes témoins et les15humains sont conservés, erreurs/incidents vides. Les buffersaCargo résidents observés prouvent arme puis métal porté ; troisPNG de transport, travail et site final sont inspectés.

Cette continuation acquiert quatre recharges complètes exactes14432/14500/14697/14835 ; elle complète les étapes8434/14160/14322/14432 déjà acquises dans les rouges conservés. Rapport `tmp/smelting-v311/native-work-final/report.json`, gel `freeze-lLMoWV` exact2634entrées ; navigateur/Vite5382 fermés. **Le PASS128,946s concerne la continuation interruption/sortie/rangement/réemploi**, pas un nouveau parcours intégral vert. Construction, filtres et trajet de l’arme sont qualifiés séparément par les acquisitions précédentes. Aucun stock/besoin/tick/PRNG n’est préparé entre ces passages.

L’inspectionPNG révèle le libellé générique « repas simple » pour le nouveau travail ; seule la branche de diagnostic est corrigée en « Fond une arme ». Le cas de présentation existant contrôle désormais ce statut à50%, PASS3cas/7,910s, et l’inspection native finale contrôle le libellé réel. Aucun changement de vitesse ou de règle n’est attribué à cette correction de texte. Présentation commune Chrome PASS119,162s : deuxPNG inspectés, aucun saut, excès de trajet continu ou occupation solide. Typage complet PASS14,441s, buildPages PASS2,254s, typage du harness public PASS5,344s ; gel final2634entrées exactes et ports5173/5382 fermés. Les mesures de frames de cette petite scène contrôlent les animations, sans comparaison de performance ni certification240FPS/vrai×6 des Aulnes. Documentation contrôlée après clôture des résultats.

Le parcours prolonge une copie privée des Aulnes250²/tick8434/15humains, sans dotation, SHA source `6d75f98d4435e8b4569f11fce1969a71d31ba523fcf36ad864f35ba3191eedb1` : Salomé et Ada construisent via leurs priorités normales, Sacha travaille ; les700W du scanner sont libérés par un véritable geste d’interrupteur. Aucune nouvelle sauvegarde publique isolée n’est ajoutée ; les63références/66fichiers historiques sont conservés. Campagne naturelle, industrie complète et gainFPS ne sont pas présumés.

Armures, textiles, scories, multicargo, réparation des équipements, reliques/DLC et destruction sans récupération restent hors lot. PublicationsCloudflare regroupées ; poursuite fonctionnelle autorisée après commit/push, relance planifiée toujoursPAUSED.
