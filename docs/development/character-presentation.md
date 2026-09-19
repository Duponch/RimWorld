# Inventaire, équipement et apparence des colons

V72 : la tenue tribale fabriquée réutilise la projection commune carte/portrait. `aEquipment.y` distingue absence/chemise/tenue ; pans de tissu sur les os rigides GPU, bras découverts, cargaisons inachevé/tenue dans le lot partagé. Aucun objet de squelette CPU ajouté. [Contrat](tailoring.md).

V66 : arrivants intégrés aux mêmes lots. Corps, cargaison et sélection conservent leurs meshes et matériaux quand la population change ; `pawn-buffers.ts` agrandit ensemble les géométries en préservant le partage des trajectoires. Seul `instanceCount` suit le nombre présent ; une réduction ne reconstruit pas les shaders. Zéro pipeline nouveau mesuré à 3→4, 30→31 et 100→101, sans garantie de cadence constante. [Preuves](../history/validation-arrivals-v66.md).

V63 : [vêtements physiques](armor.md), projection `character-apparel` partagée carte/portrait. L’attribut instancié `aEquipment` contient trois composantes sans nouveau buffer ; gilet dans le rig, chemise dans sa teinte, objets pliés dans les lots sol/cargaison existants. Habillage, retrait et destruction suivent le propriétaire présenté.

V59 : frappe orientée vers la cible et étourdissement stationnaire dans les attributs du rig GPU existant. La frappe part du sous-tick confirmé, sur l’horloge commune ; un segment immobile gèle aussi le pas des jambes. Le corps, la cargaison, le blessé porté et l’anneau gardent la même trajectoire fractionnée. Pas de nouveau lot par personnage, pas de squelette CPU. [Contrat](melee.md).

V56 ajoute orientation vers la cible, bras et arme levés dans le rig GPU existant, avec [projectiles instanciés](shooting.md) sur la même horloge. Les modèles restent procéduraux ; jauges, audio, effets et portraits 3D définitifs restent ouverts.

V53 : déplacements dirigés utilisent les poses GPU existantes ; bordure et état de mobilisation des portraits, inspection du groupe et commandes tactiques. [Contrat](drafting.md).

V52 livre la première attache GPU de revolver et une projection d’équipement partagée. Arme visible à la hanche ; portrait CSS cadré sur le buste, libellé et attribut d’état actualisés, arme hors cadre non dessinée. Géométrie extraite du rig ; vêtements et portraits 3D définitifs restent la cible ci-dessous. [Contrat actuel](equipment.md).

V51 : les trois doses médicales utilisent les variantes du lot de cargaison existant ; la dose tenue pendant collecte/soin disparaît au résultat présenté, pas à réception anticipée. Pas d’inventaire ni d’équipement permanent implicite. [Contrat](medicines.md).

V49 : l’auto-soin garde la direction précédente, sans angle vers soi-même. Au rechargement, `PawnLayer` retrouve la direction depuis la dernière arête sauvegardée avant les orientations de lit/cible. Le scénario natif a détecté puis vérifié la correction du retour arbitraire à 36°. Geste de travail générique maintenu.

V48 : [alimentation assistée](feeding.md), portion tenue par le médecin, geste GPU générique orienté vers le patient et posture allongée. Les trois phases et la consommation partagent l’horloge de scène. Animation définitive spécifique et portraits 3D restent ouverts ; arme ajoutée V52.

V47 réutilise la pose allongée pour le repos médical et le geste de travail orienté vers le patient pour les soins. Les phases viennent des snapshots présentés, sans nouveau squelette CPU ni lot par médecin. [Contrat](tending.md).

V46 ajoute une pose portée calculée en TSL : corps du patient, sa cargaison éventuelle et son anneau partagent les attributs de trajectoire du sauveteur. La principale est ajoutée V52 ; les amputations visuelles restent absentes ; [contrat](rescue.md).

Décision du 13 septembre 2026, à la demande utilisateur. **Contrat cible, pas fonctionnalité livrée.** Le prototype possède une cargaison temporaire de travail/repas, éventuellement conservée après interruption V44, et une arme principale V52. V63 étend cette base aux vêtements réels dans les portraits CSS.

## Ce que prévoit le corpus

Chapitre 2 : propriétaire matériel unique. Chapitre 8 : transporter, porter une cargaison, mettre en inventaire, équiper et enfiler un vêtement sont des actions distinctes. Chapitre 13 : personnage persistant incluant inventaire et équipement. Chapitre 20 : couches de protection et groupes anatomiques couverts. Chapitre 29 : points d'attache, variantes et sélection commune des accessoires du personnage.

Adopter SYS-055 et TEST-055 pour l'inventaire distinct du portage ; UI-014/015 pour équiper/enfiler avec conservation de l'ancien objet ; CAT-034..037 pour vêtements, protections et utilitaires ; GAP-007 reste ouvert pour les couches/couvertures à exporter. Les portraits synchronisés ne sont pas suffisamment spécifiés par ces chapitres : le contrat ci-dessous complète nos documents, sans modifier les originaux.

Le [cache de portraits consulté](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/PortraitsCache.cs) possède notamment des paramètres vêtements, couvre-chefs, teintes et état de santé, ainsi qu'une invalidation par personnage. Lecture du 13 septembre 2026 ; miroir communautaire, pas preuve d'identité avec l'exécutable commercial choisi. Cela confirme la nécessité d'une projection commune, sans imposer son moteur ni sa politique de cache.

## Contrat de simulation

Un objet appartient à un seul lieu : sol, inventaire personnel, équipement, vêtements, cargaison temporaire, chantier ou futur conteneur. Changer de lieu transfère la même instance ; l'objet conserve identité, définition et variations. La masse et les capacités ne se confondent pas avec le nombre de slots visuels. Le futur repas emporté dans l'inventaire reste distinct de la portion tenue pour ingestion.

Équiper/enfiler exige accès et transfert, contrôle des incompatibilités, puis traitement explicite de l'ancienne arme ou des vêtements incompatibles. Annuler ou perdre la cible ne duplique ni ne supprime l'objet. Les vêtements couvrent des groupes anatomiques et occupent des couches ; plusieurs pièces compatibles peuvent coexister. Les politiques de tenue, l'usure, les matériaux et la qualité doivent agir sur leurs règles propres, pas seulement sur leur couleur.

Le propriétaire d’arme est sauvegardé en V52 ; V63 ajoute les vêtements ; inventaire personnel exigera une autre migration. L'onglet d'inspection distinguera inventaire, équipement, vêtements et cargaison. Un simple champ cosmétique ajouté au modèle ne constituera pas la livraison de l'inventaire.

## Projection 3D et portraits

Une projection commune de l'état du colon déterminera corps, visage, cheveux, teintes, vêtements et accessoires. La carte et les portraits consommeront cette même projection. Une tenue changée, perdue ou chargée depuis une sauvegarde mettra à jour les deux présentations. Les options de portrait, comme masquer un couvre-chef, seront explicites ; elles ne retireront pas l'objet de la simulation. Une arme équipée ne doit pas nécessairement apparaître dans un portrait cadré sur le buste : cadrage, posture et visibilité doivent être définis et testés séparément.

Les vêtements squelettiques compatibles partageront la pose GPU et la convention d'os du personnage. Les objets rigides utiliseront des points d'attache GPU. Aucune instance d'AnimationMixer ni mise à jour CPU de squelette par colon et par frame. Le pipeline d'import devra valider noms/indices d'os, poses de repos, attaches et masquage des parties du corps avant remplacement des placeholders.

Les portraits utiliseront un atlas ou des rendus hors écran conservés, invalidés par changement d'apparence ou de paramètres. La technique exacte sera choisie après mesure ; aucune scène Three, texture, matériau ou squelette CPU autonome par avatar à chaque frame. Limiter et mesurer les actualisations simultanées, libérer les ressources à la disparition de l'acteur et invalider correctement après chargement.

## Livraison et validation futures

G0 : prolonger le contrat de propriété avec l'inventaire ; G3 : équipement, anatomie, protections et représentation correspondante ; G5 : contenu et finitions. Cela reste dans le calendrier [ROADMAP](../ROADMAP.md).

Enrichir les scénarios existants avec échange d'arme, vêtements compatibles/incompatibles, cible disparue, interruption, pleine capacité et reprise sauvegardée. Côté présentation, vérifier la même identité/tenue dans la carte et les portraits après changement puis chargement, y compris couvre-chef masquant les cheveux. Auditer un lot de changements simultanés sur une foule, en séparant projection CPU, uploads et rendu. Les validations d’arme seule sont exécutées en V52 ; V63 ajoute celles des chemises/gilets ; portraits définitifs encore futurs.

V60 : pendant la récupération d’un tir automatique, l’ordre peut déjà être retiré. Le rendu utilise alors la dernière cible réellement attaquée, persistée, pour restaurer l’orientation après chargement. Contrôle des attributs GPU dans le parcours natif ; aucun déplacement ou dégât déduit de cette orientation.
