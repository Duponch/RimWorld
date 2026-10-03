# Culture médicinale domestique — V195

Lot livré après V194 `6602049`, schéma **182**, dans le périmètre de sa [preuve](../history/validation-healroot-domestic-v195.md). [Recherche Core](../research/healroot-domestic-core-v195.md), [agriculture](farming.md), [Plantes](plants-skill-v179.md), [racine sauvage](healroot-wild-v178.md), [vie végétale](site-climate.md), [serre](greenhouse-v189.md), [médicaments](medicines.md). Les contrôles V178/V179 attestent leur périmètre historique, pas cette nouvelle chaîne.

## Décision du joueur et contenu

Une zone peut choisir **Racine médicinale** (`healroot`), espèce cultivée distincte du `healroot-wild` naturel. Sol sans plancher, fertilité ≥0,7, température et lumière agricoles existantes ; aucun matériau « graine » ni recherche préalable inventé. Le choix ne convertit ni plante existante ni dose : politique, dégagement, réservations, annulation et nouvelle identité au ressemis restent ceux des champs.

Le semis exige **Plantes 8 à sa proposition/acceptation**, automatique ou forcée. Cette garde ne bloque pas récolte et dégagement ; le profil historique absent se lit au niveau neutre 8 selon V179, sans XP offerte. Un travail de semis déjà accepté ne s'interrompt pas pour une baisse de niveau seule, comme le conducteur Core observé. Changement de zone, sol/pile/accès/capacité ou disparition de cible gardent leurs refus physiques communs. Un ordre en attente devenu non admissible est refusé lors de sa nouvelle acceptation.

Budgets neutres **80 ticks locaux au semis**, **40 à la récolte**, adaptés des 800/400 Core. Vitesse, capacités, lumière et XP réellement travaillée utilisent V179 ; aucune XP de trajet, réservation ou désignation. La plante naît à la fin effective du semis, adaptation historique conservée plutôt qu'un plant provisoire offert au début. Croissance nominale **sept jours biologiques**, rendement nominal une dose, **60 PV**, âge nominal maximal **56 jours** ; les intervalles de lumière/température/fertilité/repos restent ancrés, donc aucune date de récolte garantie.

## Récolte, produit et conservation

Récolte manuelle à croissance **strictement >0,65**, automatique à maturité. Aucun seuil Plantes 8 au récolteur. Croissance/PV puis compétence et arrondis PRNG suivent V179 ; étendre le facteur PV à ce nouveau cultivé seulement, sans changer les anciennes cultures. La sortie est explicitement `herbal-medicine`, pile/masse/péremption et filtre Médicaments existants ; aucun défaut vers baies/food et aucun médicament alimentaire.

Un résultat positif exige un dépôt réel prévalidé : saturation ou refus ne consomment plante, pile, identité ni PRNG du résultat. L'XP passée reste acquise. Échec ou quantité zéro consomment le plant non persistant et les tirages confirmés sans créer de dose. Annulation, destruction et prétendants concurrents passent par les libérations conservatives communes. Un ressemis reçoit une nouvelle identité et une nouvelle ancre.

La **coupe de dégagement est stérile**, comme pour la racine sauvage locale : c'est une adaptation explicite, différente du produit potentiel de PlantCut Core mûr. Elle conserve le budget local de dégagement des cultures, sans nouvelle XP de récolte ni faux soin. La pâture du plant vivant apporte sa nutrition Core 0,2 à partir de 65 %, selon les réservations et l'exclusion locale du feuillage absent déjà utilisées par la racine sauvage ; aucune dose ne nourrit un animal.

Le froid extérieur dépouille le healroot sans destruction immédiate (`dieIfLeafless=false`). Réchauffement permet croissance/récolte avant expiration de cet état visuel, puisque l'absence de feuilles n'est pas un veto Core de rendement. Seuil individuel/cadence/délai locaux V87 conservés ; obscurité, âge, feu et autres dégâts peuvent toujours détruire le pied. Riz/coton/pomme de terre/maïs conservent leur mortalité historique au gel.

## Persistance et présentation

Valider strictement **181 avant migration neutre vers 182** : seul le numéro change. Refuser le futur identifiant dans plantes, zones, pertes de feu et paquets de snapshot anciens, y compris sans croissance ou avec compte nul. Aucun plant, dose, recherche, XP, âge, exposition ni tirage rétroactif. Reprise au milieu du travail et changements au même tick restent exacts ; un paquet corrompu n'engage pas sa révision ni ne remplace le World.

Réutiliser le modèle médicinal et les lots de buissons déjà résidents ; ne pas créer une cinquième allocation de cultures pleine carte. Présentation distingue taille de croissance et dépouillement, détecte les changements au même tick et conserve matériaux/TSL/capacités selon [préparation graphique](shadow-preparation.md). Aucune scène par plante ou calcul métier par image, aucun pigment si textures désactivées. Le nombre de sommets/uploads effectivement nécessaires reste un coût, sans promesse de coût nul.

La vue éloignée conserve ses slots par identité, libère les retraits et ne réécrit que les catégories modifiées. La croissance d'une catégorie remplace ses buffers de capacité sans changer le Mesh, le matériau ou les attributs TSL nommés. Son `colorBuffer` évite le varying implicite que Three r186 active avec le nom `instanceColor`. La préparation temporaire restaure les instances exactes, sauf nouvelle révision reçue entre-temps.

## Contrôles et limites

Les contrôles ciblés couvrent admission, travail, conservation, croissance, rendement, froid, sauvegarde et bridge. La 45e colonie publique **« Champ médicinal et soins · 3 colons »** exerce par la vraie UI semis, récolte, transport, rangement et soin ; maturité et contusion sont préparées. La preuve sépare ce parcours matériel, le contrôle GPU de croissance des buffers et le microbanc CPU d'adoption. Les mesures sont successives et bornées ; régression exhaustive et campagnes naturelles longues non exécutées.

Hydroponie, maladies végétales, difficulté agricole générale, nouvelles doses/recettes, neige accumulée et agriculture Core exhaustive restent différées. V195 ouvre une acquisition médicale planifiée ; ni une zone ni un test court ne prouvent une autonomie universelle.
