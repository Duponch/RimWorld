# V223 — Les Aulnes, grande colonie sur carte normale

Schéma 198 inchangé. Ce lot corrige la taille et la richesse de l'exemple V221 selon le retour utilisateur. Les résultats effectivement observés sont consignés dans [la preuve V223](../history/validation-advanced-colony-v223.md).

La demande utilisateur porte sur une colonie avancée donnant l'impression de reprendre une vraie partie sur une carte 250×250. Le nouveau scénario rassemble les boucles disponibles dans un village développé et laisse des décisions concrètes : production industrielle, entretien, agriculture, prison, recherche, défense et voyage. Il prépare une nouvelle 61e entrée, **« Les Aulnes · grande colonie 250×250 »**, identité `advanced-colony-v223`, payload `public/test-saves/v223/les-aulnes-250.json`. L'entrée V221 et les 60 scènes existantes restent conservées.

## État initial déclaré

Le [préparateur](../../src/sim/advanced-colony-scenario-v223.ts) crée directement un site Crashlanded 250², graine 223350, forêt tempérée à petites collines. Seules les parcelles du village, des cultures et des voies d'accès sont aménagées. La périphérie conserve la génération naturelle ; les animaux initialement dans une parcelle aménagée reçoivent une autre position naturelle avant le début du jeu.

Quatorze colons adultes, leurs biographies, compétences initiales, équipements, priorités, politiques et besoins sont préparés. Deux couples et une fratrie sont des liens initiaux déclarés. Douze chambres hébergent les quatorze habitants avec de vrais lits individuels, dont deux chambres à deux lits. Le détenu adulte Dorian est créé séparément : faction des hors-la-loi, cellule, vêtement, lit et contusion légère préparés, politique de réduction de résistance. Sa capture n'est pas présentée comme un événement joué.

| Boucle | Préparation retenue | Décision ou condition réelle après reprise |
| --- | --- | --- |
| Vie quotidienne | Chambres meublées, réfectoire, chauffage, éclairage, six fauteuils devant la télévision, échecs, fers à cheval et sculptures | Horaires, accès, courant, besoins, opinions et loisirs restent traités par le moteur. |
| Alimentation | Chambre froide, deux cuisinières électriques, boucherie séparée et secours au bois ; repas, ingrédients et rations finis | Factures bornées, collecte, travail, dépôts, consommation et détérioration ordinaires. Le secours au bois a une facture initialement suspendue. |
| Agriculture et élevage | Riz, maïs, pommes de terre, coton et racines médicinales ; serre au sol, pâture, quatre mufalos et deux dromadaires femelles | Semis/récoltes, alimentation du troupeau, laine, lait et entretien demandent les personnes, ressources et conditions existantes. |
| Industrie | Usinage, fabrication, couture électrique et manuelle, art et taille de pierre ; matériaux locaux et factures limitées | Composants, composants avancés, vêtements, armes, protections et œuvres consomment leurs ingrédients et du vrai travail. |
| Recherche | Deux bureaux avancés, multi-analyseur ; Fabrication avancée déjà connue, Reconnaissance initialement à 1000/6000 points | Le casque initial est une dotation. Sa facture pourra être ajoutée après l'achèvement réel du projet restant. |
| Médecine et prison | Trois lits d'hôpital, un lit médical ordinaire, deux cellules dont une occupée, médicaments finis, médecins et gardienne affectés | Soins physiques et conversations ordinaires ; le joueur peut choisir ensuite le recrutement. La seconde cellule reste disponible. |
| Énergie et défense | Six générateurs au bois, solaire, éolienne, six batteries protégées, réseau de serre distinct ; quatre mini-tourelles au feu autorisé et sacs de sable | Fuel, charge, acier de réarmement et puissance restent finis. La serre et les ateliers partagent les contraintes de leurs circuits. |
| Voyage | Globe, rations réservées au voyage, argent et textiles accessibles | Le joueur choisit les adultes, la destination et les biens. Prises, chargement, sortie, trajet, transactions et retour doivent se produire réellement. |

Les réserves initiales, la croissance des plantes, la charge des batteries, les carburants, connaissances, bâtiments, œuvres et biens équipés sont une dotation déclarée. Les personnages ont des spécialisations et leurs priorités refusées par le passé sont annulées. Quelques plans de mobilier et de couvert restent ouverts, sans livraison, travail ou achèvement accordés.

## Continuation et publication

Le [générateur](../../scripts/create-advanced-colony-v223-test-save.ts) appelle `prepareAdvancedColonyScenario()` puis avance exclusivement `stepWorld` pendant le nombre de ticks choisi. Il ne saute aucune horloge et n'injecte ni ressource, soin, recrutement, recherche achevée, échange, déplacement ou retrait d'incident dans ce suffixe. Aucun groupe actif ni voyage terminé n'est fourni.

Tous les humains et domestiques initiaux sont suivis par leur identité et doivent rester présents sans décès ni chute. Le statut d'un détenu doit rester celui des règles ordinaires. Un checkpoint validé est conservé périodiquement, ainsi que les observations au vrai producteur : nouvelles sorties physiquement portées, activités par personne, besoins, gains des compteurs de recherche, événements et bilans existants. Une différence de stock reste un bilan et ne devient pas une production inventée.

Le World final doit passer la validation stricte, l'aller-retour exact de sauvegarde, le codec ordinaire et ses métadonnées. Une reprise d'un tick, effectuée sur des copies distinctes, doit conserver le World et le PRNG attendus ; elle ne prolonge pas l'horizon publié. Les preuves privées restent sous `tmp/advanced-colony-v223/generation/`, dans un répertoire propre à chaque tentative.

La publication doit préparer ses deux parties avant écriture : payload immuable créé exclusivement s'il manque, puis ajout 60→61 du manifeste. Une identité déjà publiée n'est admise qu'avec métadonnées et payload identiques. Les empreintes du préparateur et du générateur sont comparées avant/après ; les 60 anciennes métadonnées et tous leurs payloads conservent leur contenu. Les constructeurs de scénarios ne doivent pas entrer dans le bundle du jeu.

## Périmètre utile

La serre cultive le sol : l'hydroponie n'est pas implémentée. Reconnaissance fournit actuellement un casque. L'hôpital utilise les soins, lits et chirurgie thérapeutique disponibles ; moniteur vital, sols stériles et prothèses restent hors catalogue. Le détenu est un état initial ; aucune arrestation passée n'est reconstruite. Le voyage collectif porte les limites actuelles d'un groupe et d'un monde mono-carte. Les tourelles, armes et protections sont les objets du catalogue existant.

Les contrats actuels de [biographies](colonist-backgrounds-v210.md), [proches](family-v214.md), [tourelle](mini-turret-v212.md), [voyage collectif](planet-group-v216.md), [hôpital](hospital-bed-v205.md) et [colonie intégrée V221](established-colony-v221.md) restent applicables. La continuation a révélé un dépassement du besoin de confort : son plafond de 100 %, déjà exigé par [le contrat habitat](habitat-comfort.md) et la sauvegarde, est appliqué à tous les meubles réellement occupés. Les statistiques brutes, cadences, qualité et PRNG restent conservés ; ni nouveau catalogue ni migration ne sont requis.

La [preuve](../history/validation-advanced-colony-v223.md) fixe les résultats de préparation, accès, survie et travaux du suffixe, archives, catalogue, transport, reprise et visite native. Le checkpoint publié est au tick 6000 après une journée ordinaire, avec quatorze colons et le détenu. Cette scène ne certifie pas une colonie construite depuis zéro, une économie annuelle, une campagne longue, la parité RimWorld exhaustive ou un débit général CPU/GPU.
