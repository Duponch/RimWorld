# V466 — Référence de l’exposition thermique animale locale

Préparation du23octobre2026 après la [réévaluation de tous les domaines après V465](../development/audit-core-20261022.md#réévaluation-après-v465). La [note de livraison](../gameplay/animal-thermal-v466.md) consigne la qualification ciblée acquise et ses reprises ; les résultats de préparation ne valent ni campagne complète, ni clôture de l’ensemble3 ou des six ensembles.

## Primaire fraîche et corpus

Core **1.6.4871 rev590** relu dans l’installation locale. DLL SHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`, identique avant/après. ILSpy8.2 SHA256 `c1635be8deba8b374b43863fe843950460f9860989decff3e522afab35d30904` ;20types nommés ciblés,408336octets, aucun dump entier.26XML utilisés sont hachés avant/après et inchangés. La [note privée](../../tmp/animal-thermal-v466/primary-reference.md), les manifestes et le tableau des53espèces gardent les chemins, lignes, héritages et erreurs de recherche ; un namespace de GiverSet erroné a été corrigé, sans effacer l’essai initial. Aucun code ni asset propriétaire n’est livré.

La [publication officielle du12octobre2026](https://ludeon.com/blog/2026/10/announcing-the-waylith-engine-and-update-1-7/), relue le23octobre, distingue la branche principale1.6 de la bêta instable1.7. Les règles exactes ci-dessous viennent de la primaire installée, sans mélanger les animaux des extensions. Corpus : animaux SYS/TEST121–125, santé089–097, température126/conditions131, déplacements113–117, détenteurs051–054 et reprise143–145. Ces rapprochements ne ferment aucun identifiant global.

## Règles retenues

Les53espèces représentées héritent de `OrganicStandard` : sa liste actuelle appelle saignement, froid, puis chaleur, avec une barrière de décès après chaque giver.50sont Normal, y compris reptiles et oiseaux ; les trois Insectoid sont Megascarab, Spelopede et Megaspider. Ces trois races reçoivent **HypothermicSlowdown**, un état distinct non létal par sévérité, jamais une hypothermie humaine de remplacement. Tous reçoivent Heatstroke.

Le vrai HealthTracker admet une occasion de giver par `IsHashIntervalTick(60,delta)`, avec hash signé de l’identité. La simulation conserve son pas10Core et son kernel de sévérités entières1e9 : ce choix numérique existant n’est pas une égalité bit à bit avec les floats natifs. Les plages raciales sont lues dans les autorités déjà représentées ; les53plages sont comparées à un oracle XML fraîchement résolu. Les sept espèces historiques sans marque de profil natif conservent leur ancien comportement ; aucune marque n’est offerte au chargement.

| Condition | Exposition ordinaire | Récupération d’un état existant |
|---|---|---|
| Chaleur | Air strictement supérieur à maximum confortable+10 ; courbe d’excès native, minimum0,000375 par occasion | Air strictement inférieur au maximum ; réduction bornée0,0015..0,015 selon sévérité×0,027 |
| Froid Normal | Air strictement inférieur à minimum confortable−10 ; minimum0,00075, sinon écart×0,0000645 | Air strictement supérieur au minimum ; même réduction bornée |

Les deux paliers de10°C et leurs bornes ne sont pas des guérisons gratuites. Le froid est appliqué et le décès réconcilié avant la chaleur. Les états létaux s’arrêtent à1 ; les stades0,04/0,2/0,35/0,62 affectent les capacités déjà représentées.

La température vient de la vraie région d’air ou de l’extérieur actuel. Pendant une arête inachevée, le PathFollower natif n’a pas encore changé Position : l’origine physique reste l’autorité. À l’arrivée, la destination devient la case clinique. Un animal porté lit la vraie case physique de son porteur. **AnyParentSpawned reste vrai pendant ce portage local** : le patient ne gagne pas la réduction de froid hors carte. Sommeil, état à terre, domesticité, aire et pansements ne suspendent pas la thermie. Le vrai caisson et les détenteurs suspendus figent leur original ; la sortie ne rejoue aucune occasion passée.

## Raccord et limites explicites

Une seule occasion est fournie par la passe animale du moteur, après l’intervalle clinique courant. Les autres appels de médecine avant impacts, soins, alimentation et portage n’inventent pas de dose. Un dossier déjà courant après un piège n’est pas une preuve d’exposition reçue. Aucun rattrapage avec l’air d’aujourd’hui, aucune réécriture d’âge/horloge, aucun dossier humain de substitution. Dossier sain absent et variation nulle restent littéralement absents. Première variation réelle : création au frontier actuel seulement.

Les animaux explosifs et toxiques intègrent ce nouvel effet dans leur résultat privé avant réservation du décès ; un refus de vague ne doit adopter ni dose, ni RNG, ni nettoyage d’intentions. Le lecteur d’air partagé conserve les températures vivantes et reconstruit ses références si une explosion remplace les régions au milieu de la passe ; aucune recherche de trajet ni index de carte par animal.

**Différés distincts :** refuge autonome SeekSafeTemperature, HypothermicSlowdown des insectes, gelures anatomiques quand air<0 et sévérité>0,37, brûlures d’air au-delà de maximum+150, terrains à `heatPerTick>0`. Ces branches ont été identifiées dans la primaire ; le seul état Heatstroke/Hypothermia n’en est pas une réalisation complète. Les appareils, geysers et feux actuels changent l’air, sans inventer le terrain chaud spécial. Aucun tirage RNG factice ne feint ces dommages absents.

Le kernel hors carte259 préexistant appelle encore chaleur avant froid ; sa description historique n’est pas une preuve de l’ordre primaire actuel. V466 ferme le raccord **local** et conserve cette divergence hors carte nommée. Les retours gardent leur même animal et dossier, sans soin offert à l’entrée. Le refuge autonome, ses trajets, choix et interruptions seront fermés séparément.

**Schéma287 inchangé**, aucun nouveau champ persistant ni migration. Activation locale actuelle seulement ; branches directes historiques conservées et futur fermé par les gardes existants. Sauvegardes, historiques et originaux préservés. Voir les contrats privés [détenteurs](../../tmp/animal-thermal-v466/owners-contract.md) et [runtime](../../tmp/animal-thermal-v466/runtime-contract.md). Aucune qualification complète ou cible FPS n’est déduite de cette préparation.
