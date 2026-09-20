# Traitement et repos médical — V47

Contrat courant complété en V81 par les [infections de plaies](infections.md). Une infection admissible devient une cible médicale distincte, traitée avec les mêmes accès, réservations, médicaments et travail physique. Une plaie fermée n’implique pas que sa maladie soit guérie ; le besoin de repos peut donc continuer après cicatrisation.

V62 complète ce contrat par les [réveils après impacts et dommages](disturbance.md). Sommeil, repos médical, incapacité et deux échéances sont distincts ; les interruptions générales des autres emplois restent partielles. Les absences mentionnées dans les bilans anciens ci-dessous sont historiques.
17 septembre 2026. [Recherche fraîche et incertitudes](../research/tending-reference.md), [santé](health.md), [secours](rescue.md), [compétences](skills.md), [validation](validation.md). Corpus chapitre 15 SYS/TEST-094 et 096 ; chapitres 8/9 pour priorités et réservations. Le socle V47 décrit les traitements à sec ; [V51](medicines.md) l’étend avec produits et cinq plafonds, sans livrer l’hôpital complet.

## Chaîne jouable

Travail sépare **Patient**, **Médecin** et **Repos au lit**, par défaut 1/1/3. Patient recherche un traitement autorisé et un médecin valide, éveillé et accessible ; l'urgence hémorragique estimée à moins de 0,75 jour dispense de cette dernière condition. Repos au lit permet aussi la récupération après traitement et entre deux soins infectieux tant que l’immunité n’est pas complète. Si aucun médecin n'est disponible, ce second métier peut encore faire rejoindre un couchage. Un blessé fatigué peut utiliser le même choix médical lors du coucher ; un colon sain ne prend pas un lit médical pour dormir.

Les lits sont classés médical, propriétaire du patient, puis lit ordinaire libre, avec distance/ID et accès réel. Usage temporaire et propriété restent distincts ; un lit ordinaire choisi est attribué avant le départ. Aucun bonus pendant le trajet. À l'arrivée, l'état `resting` désigne une personne allongée, pas nécessairement endormie : `medicalSleep` porte son sommeil réel, et le repos ne monte que selon les règles de sommeil. La faim continue ; un patient mobile peut quitter le lit pour manger physiquement. L’alimentation assistée au lit est ajoutée en [V48](feeding.md), également pour un patient mobile en récupération.

Médecin choisit un patient réellement couché, réserve son identité et une place cardinale libre au chevet, la rejoint, fait face au patient et travaille. La place cardinale est une **adaptation 3D** du contact avec le lit. Deux médecins ne traitent pas simultanément le même patient. Aucun soin à distance, pendant l'approche, ou dans les bras du sauveteur. Un patient dans un lit ordinaire peut aussi être traité.

Le clic droit propose **Soigner** ; les doses éventuelles dépendent du plafond du patient ([V51](medicines.md)). Comme les autres ordres directs, un ordre accepté peut continuer après désactivation du métier ; l'ordre automatique est libéré. Maj/file de soins est refusée explicitement. Santé affiche la qualité et les cinq plafonds V51. Les anciens réglages binaires restent reconnus dans les sauvegardes historiques.

## Travail et résultat

Sans médicament, une opération traite une seule cible admissible : plaie, partie fraîchement manquante ou infection. Le classement commun compare saignement ×1,5, bénéfice de soin infectieux et menace vitale, puis sévérité ; ses seuils sont définis dans [le contrat des infections](infections.md#sélection-médicale-et-renouvellement). Une maladie ne rejoint jamais le groupe de vingt PV de plaies traité avec une seule dose. Les parties manquantes ne repoussent pas et les cicatrices permanentes ne sont pas guéries par cette action. Soigner une plaie arrête son saignement et aide sa guérison ultérieure ; soigner une infection réduit temporairement sa progression, sans donner immédiatement des PV ou de l’immunité.

Le soin infectieux a une durée de bénéfice et une échéance distincte de renouvellement. La qualité suivante remplace la précédente et conserve le reliquat selon le contrat dédié. L’immunité complète interdit un nouveau soin mais laisse agir le traitement déjà actif. À la fin d’une opération, un besoin de récupération peut transformer l’intention Patient en Repos au lit sans libérer le service du même couchage. Une infection immune ne force plus seule le repos volontaire ; incapacité et autres blessures gardent leurs règles propres.

Lors du soin réussi d’une plaie encore candidate à l’infection, le lieu réel du **patient** fournit un facteur capturé. La propreté calculée est limitée aux terrains de la pièce ; objets, saletés, nettoyage et planchers spécialisés restent absents. Un toit n’est pas une preuve de stérilité. Déplacer le patient ou modifier ensuite la pièce ne réécrit pas cette capture ; voir [le contrat du lieu de soin](infections.md#capture-du-lieu-de-soin).

Durée capturée au début du travail : partie entière de `600 / vitesse` ticks Core ; progression de dix unités par tick local et reliquat conservé entre plaies. La vitesse combine niveau Médecine (`0,4 + 0,06 × niveau`), Manipulation, Vue (importance 80 %, plafond 130 %) et lumière, avec minimum 0,1. Un changement pendant une opération ne retime pas la durée capturée. Sauvegarder conserve la progression ; interrompre la perd.

À l'achèvement, 250 XP de base humaines sans médicament passent par passion/saturation communes **avant** la qualité. Aucun apprentissage pendant trajet ou interruption. Qualité : base `0,2 + 0,1 × niveau`, Manipulation à 100 %, Vue à 70 %, capacités plafonnées à 140 %, puis courbe Core documentée. Sans médicament, puissance 0,3, plafond 0,7 ; variation **additive** uniforme −0,25..+0,25, bornée, résultat persisté en millièmes. Lumière et lit ordinaire ne donnent pas un bonus de qualité. Le PRNG autoritaire n'avance qu'au résultat qui en a besoin.

Politique désactivée, patient mort/déplacé, service perdu, place devenue solide ou médecin incapable arrêtent les soins avant résultat/XP. Les intervalles de santé sont ancrés sous leur ancienne posture avant changement ou libération. Les réservations ne survivent pas à leur tâche.

Une personne devenue incapable alors qu'elle repose déjà au lit conserve son service physique, indépendamment des priorités Patient/Repos au lit et de la fin du traitement. Le marqueur d'intention volontaire est retiré ; cela évite de libérer artificiellement le lit puis de secourir une seconde fois son occupant.

## Frontières et continuation

`care-access.ts` partage accès et réservation de patient avec V48 ; `care-rules.ts` porte cibles et statistiques ; `patient-rest.ts` les intentions et l'utilisation médicale ; `tending.ts` choix, commandes et exécution ; `care-save.ts` formes et relations. Navigation/budgets et réservations restent communs. Aucun DOM, horloge réelle ou rendu dans la simulation. La présentation observe approche/travail, posture et résultats sur sa même horloge ; geste de travail et pose allongée réutilisent les buffers GPU existants.

V46 est strictement validée avant V47 : Patient 1, Repos au lit 3 et Médecine niveau 8/sans passion/0 XP ajoutés ; rien d'autre n'est inventé. Les nouvelles parties utilisent Ada 6/passion, Noé 3/sans passion, Mina 8/passion brûlante en Médecine. Ce sont des profils de départ, pas une génération de biographies. La migration V42→43 reste strictement limitée à Construction ; elle ne doit pas injecter Médecine avant validation V46.

La sauvegarde rejette futurs champs dans les anciens schémas, conflits d'activités, doublons de patient, mauvaises phases, progression/durée invalides, place éloignée et absence de lit réel. Les données de chemin/pose restent distinctes de ces réservations.

## Limites maintenues

Auto-soins ordinaires ajoutés en [V49](self-tending.md), médicaments en [V51](medicines.md), première infection et immunité en [V81](infections.md). Ordres de repos forcé, files médicales, chirurgie, autres maladies, hôpital spécialisé, nettoyage et propreté complète restent à développer. V50 ajoute la [branche urgente et la revue au lit](urgent-care.md) ; V81 conserve son seuil hémorragique et n’invente pas de préemption universelle des travaux par une maladie. Les premières hostilités sont livrées ; diplomatie, prisonniers et soins vétérinaires demeurent distincts. Les lièvres peuvent développer une infection, mais aucun médecin ne les traite dans cette version.

Les cinq scénarios profonds de `care.test.ts` croisent statistiques/résultats, repos/sommeil, réservations, accès, interruptions, mort, amputations, migration, snapshots et reprise. Le parcours UI observe les gestes, l'inspection, les attributs GPU et le rechargement pendant traitement. Le pilote de colonie enregistre état médical et XP sans injecter de blessure dans son camp sûr. Les audits 2/30/100 personnes mesurent CPU et navigateur séparément.
