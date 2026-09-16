# Inventaire, équipement et apparence des colons

Décision du 13 septembre 2026, à la demande utilisateur. **Contrat cible, pas fonctionnalité livrée.** Le prototype ne possède aujourd'hui qu'une cargaison temporaire de travail ou de repas, éventuellement conservée après interruption involontaire V44 ; les portraits CSS ne représentent pas un équipement réel.

## Ce que prévoit le corpus

Chapitre 2 : propriétaire matériel unique. Chapitre 8 : transporter, porter une cargaison, mettre en inventaire, équiper et enfiler un vêtement sont des actions distinctes. Chapitre 13 : personnage persistant incluant inventaire et équipement. Chapitre 20 : couches de protection et groupes anatomiques couverts. Chapitre 29 : points d'attache, variantes et sélection commune des accessoires du personnage.

Adopter SYS-055 et TEST-055 pour l'inventaire distinct du portage ; UI-014/015 pour équiper/enfiler avec conservation de l'ancien objet ; CAT-034..037 pour vêtements, protections et utilitaires ; GAP-007 reste ouvert pour les couches/couvertures à exporter. Les portraits synchronisés ne sont pas suffisamment spécifiés par ces chapitres : le contrat ci-dessous complète nos documents, sans modifier les originaux.

Le [cache de portraits consulté](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/PortraitsCache.cs) possède notamment des paramètres vêtements, couvre-chefs, teintes et état de santé, ainsi qu'une invalidation par personnage. Lecture du 13 septembre 2026 ; miroir communautaire, pas preuve d'identité avec l'exécutable commercial choisi. Cela confirme la nécessité d'une projection commune, sans imposer son moteur ni sa politique de cache.

## Contrat de simulation

Un objet appartient à un seul lieu : sol, inventaire personnel, équipement, vêtements, cargaison temporaire, chantier ou futur conteneur. Changer de lieu transfère la même instance ; l'objet conserve identité, définition et variations. La masse et les capacités ne se confondent pas avec le nombre de slots visuels. Le futur repas emporté dans l'inventaire reste distinct de la portion tenue pour ingestion.

Équiper/enfiler exige accès et transfert, contrôle des incompatibilités, puis traitement explicite de l'ancienne arme ou des vêtements incompatibles. Annuler ou perdre la cible ne duplique ni ne supprime l'objet. Les vêtements couvrent des groupes anatomiques et occupent des couches ; plusieurs pièces compatibles peuvent coexister. Les politiques de tenue, l'usure, les matériaux et la qualité doivent agir sur leurs règles propres, pas seulement sur leur couleur.

Sauvegarder ces propriétaires et états exige une prochaine migration. L'onglet d'inspection distinguera inventaire, équipement, vêtements et cargaison. Un simple champ cosmétique ajouté au modèle ne constituera pas la livraison de l'inventaire.

## Projection 3D et portraits

Une projection commune de l'état du colon déterminera corps, visage, cheveux, teintes, vêtements et accessoires. La carte et les portraits consommeront cette même projection. Une tenue changée, perdue ou chargée depuis une sauvegarde mettra à jour les deux présentations. Les options de portrait, comme masquer un couvre-chef, seront explicites ; elles ne retireront pas l'objet de la simulation. Une arme équipée ne doit pas nécessairement apparaître dans un portrait cadré sur le buste : cadrage, posture et visibilité doivent être définis et testés séparément.

Les vêtements squelettiques compatibles partageront la pose GPU et la convention d'os du personnage. Les objets rigides utiliseront des points d'attache GPU. Aucune instance d'AnimationMixer ni mise à jour CPU de squelette par colon et par frame. Le pipeline d'import devra valider noms/indices d'os, poses de repos, attaches et masquage des parties du corps avant remplacement des placeholders.

Les portraits utiliseront un atlas ou des rendus hors écran conservés, invalidés par changement d'apparence ou de paramètres. La technique exacte sera choisie après mesure ; aucune scène Three, texture, matériau ou squelette CPU autonome par avatar à chaque frame. Limiter et mesurer les actualisations simultanées, libérer les ressources à la disparition de l'acteur et invalider correctement après chargement.

## Livraison et validation futures

G0 : prolonger le contrat de propriété avec l'inventaire ; G3 : équipement, anatomie, protections et représentation correspondante ; G5 : contenu et finitions. Cela reste dans le calendrier [ROADMAP](../ROADMAP.md).

Enrichir les scénarios existants avec échange d'arme, vêtements compatibles/incompatibles, cible disparue, interruption, pleine capacité et reprise sauvegardée. Côté présentation, vérifier la même identité/tenue dans la carte et les portraits après changement puis chargement, y compris couvre-chef masquant les cheveux. Auditer un lot de changements simultanés sur une foule, en séparant projection CPU, uploads et rendu. Ces validations ne sont pas encore exécutées, puisque ces systèmes sont absents.
