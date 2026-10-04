# V205 — Lit d’hôpital

Lot autorisé en mode jour, schéma 187. Le schéma 186 est validé strictement avant une migration neutre : aucun lit, projet, composant, soin ou bonus passé n’est créé. Le lot ajoute un couchage spécialisé, pas un système hospitalier exhaustif.

## Référence et adaptation

La [recherche Core](../research/hospital-bed-core-v205.md) relève Core 1.6.4871, ses XML et les consommateurs cliniques. Le projet coûte 1 200 points, requiert Microélectronique, Mobilier complexe et un bureau de recherche avancé réellement alimenté, sans multi-analyseur obligatoire. Core exige aussi Matériaux stériles ; ce projet et ses sols sont absents de Lisière. Ce parent est explicitement différé dans ce lot : pas de faux projet sans contenu. Les autres prérequis restent effectifs.

Le matériau métallique disponible pour la construction est l’acier : 40 unités de matière plus 80 acier fixe et cinq composants, soit **120 acier + 5 composants**. Construction 8, 2 800 ticks Core / 280 ticks locaux neutres ; compétences et facteurs de travail existants s’appliquent. Empreinte 1×2 orientable, PV 150 avant matière, qualité produite une seule fois, rôle médical par défaut. Le lit peut changer de rôle selon les commandes ordinaires ; prison, propriétaire, réservations et accès au chevet restent effectifs.

## Usage clinique physique

Seul le lit réellement utilisé apporte ses statistiques : confort 0,80, repos 1, immunité 1,11, qualité des soins +0,10, réussite chirurgicale ×1,1, guérison naturelle supplémentaire de dix points par jour Core contre quatre pour un lit ordinaire. Qualité/matière affectent confort, repos et chirurgie selon leurs règles existantes ; elles n’affectent ni le bonus de soin, ni l’immunité, ni la guérison supplémentaire. La guérison ne se multiplie pas par 2,5 : la base naturelle et le repos restent distincts.

Le bonus de soin intervient après médecin et puissance du médicament, avant réduction de l’auto-soin et plafond du médicament. Les contextes d’immunité et de guérison résolvent le lit une fois au contact clinique existant. Être transporté, voyager vers un lit ou être couché au sol n’accorde aucun bonus hospitalier. La sélection privilégie un lit médical hospitalier accessible ; elle conserve le lit déjà occupé et valide. Construire un meilleur lit ne téléporte pas un patient.

Construction, livraison, annulation, réparation, désinstallation, transport et réinstallation réutilisent les transitions physiques, recettes et propriétaires existants. Un paquet conserve identité, qualité, PV, matière et rôle ; sa réinstallation ne réinitialise pas son rôle médical.

## Présentation et validation

Architecte, recherche, inspection et commandes de lit exposent le contenu jouable et ses prérequis. Un cadre métallique pastel, matelas et barrières rendent la silhouette distincte dans le lot mobilier résident. La surface du couchage reste à 0,5 ; aucun nouveau shader, squelette ou mesh par acteur. Les instances supplémentaires ont un coût réel, sans promesse de coût nul.

Contrôles ciblés : ancienne sauvegarde/futurs champs, recherche et poste réel, ingrédients/construction/qualité, rôles et réservations, soin/immunité/guérison/chirurgie depuis le lit réellement occupé, continuation, réparation et transfert physique. Une scène publique préparée doit permettre de tester la clinique sans présenter sa préparation comme une campagne naturelle. Les contrôles et mesures réellement exécutés sont consignés dans la [preuve V205](../history/validation-hospital-bed-v205.md) ; les campagnes longues restent périodiques.

Moniteur vital, sols stériles, lits animaux, greffes, prothèses et hôpital exhaustif restent différés.
