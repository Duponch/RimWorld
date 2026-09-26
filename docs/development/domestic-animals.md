# Lièvre domestique libre — V106

V106 ajoute une seule boucle de domestication jouable : **le lièvre**. L'animal reste le même être physique, avec son identité, ses besoins, sa santé et sa position, qu'il soit sauvage, possédé ou mort. Les quatre autres herbivores des biomes jouables restent sauvages : leur prise en charge exige des enclos et une conduite qui ne sont pas livrés. Le [relevé Core 1.6.4871](../research/domestic-animals-reference-v106.md) distingue le lièvre non errant de ces espèces. Le [guide](../gameplay/player-guide.md) décrit les commandes.

## Désigner et apprivoiser

**Faune** liste les bêtes sauvages. On peut y cocher **Apprivoiser** pour un lièvre vivant, ou le faire depuis son dossier Info/Santé. Le nouveau travail **Animaux** doit être activé dans **Travail** chez un colon de compétence **Animaux 8** au moins, capable de parler, d'entendre et de manipuler. La désignation attend un dresseur, un chemin et une pile accessible d'au moins deux unités de baies, riz, pommes de terre, maïs ou fruit d'agave. Elle ne crée ni nourriture ni progrès instantané.

Le dresseur prélève et porte ces deux unités, rejoint le lièvre, puis réalise trois échanges et deux nourrissages effectifs. La nourriture passe dans l'animal au nourrissage, pas au ramassage. La tentative se termine par un seul tirage, influencé par la compétence et les capacités du colon. Un échec laisse le lièvre sauvage ; une nouvelle tentative attend une demi-journée locale, soit 3 000 ticks. Une interruption restitue les aliments encore portés selon les règles physiques habituelles. L'interaction ne retient l'animal qu'une fois le colon réellement au contact ; trajet et réservation ne le figent pas. Feu, fuite et combat gardent priorité.

Un succès donne au **même lièvre** la propriété de la colonie et cinq niveaux de familiarité. La chasse désignée ou en cours contre lui s'arrête ; les ordres ordinaires de chasse et d'attaque ne peuvent pas viser ce nouvel allié. **Animaux** liste les domestiques vivants ; **Faune** continue de lister les sauvages. L'animal domestique reste libre : aucune aire ne lui est assignable, et aucune clôture ne lui est attribuée par le jeu.

## Nourriture, entretien et soins

Le lièvre domestique continue à chercher et ingérer réellement des plantes ou aliments accessibles. Sa faim, ses blessures, ses infections, sa fuite et sa mort restent celles d'un animal physique. Il sort du poids utilisé pour renouveler la population **sauvage**. Son patrimoine n'a pas de prix chiffré : il figure parmi les êtres dont la valeur reste inconnue.

Tous les **45 000 ticks locaux**, la familiarité perd un niveau. Quand le cinquième est perdu, le lièvre redevient sauvage. Un dresseur disponible peut entretenir un lièvre sous 5/5 par le même trajet, les mêmes deux unités de nourriture et une interaction réelle ; une réussite restaure un niveau, sans dressage d'Obéissance ou autre ordre avancé. Un intervalle minimal de 1 500 ticks sépare les entretiens attribués. La compétence Animaux et les aliments conditionnent donc le maintien de la propriété.

Dans **Santé**, la politique de soins du lièvre possédé est réglable comme pour les autres patients ; la politique initiale est **herbes médicinales**. Avec **Médecin** actif, un soigneur peut traiter ses plaies et infections lorsqu'il est couché ou incapable. Il réserve les médicaments autorisés, les prélève et les porte au patient, puis soigne au contact avec la durée et les effets médicaux existants. Le soin interrompu restitue ce qui reste porté. Aucun soin automatique n'est donné à un sauvage simplement blessé.

Pour qu'un lièvre possédé blessé mais mobile puisse recevoir cette visite, Lisière lui permet un repos médical autonome tant qu'un soin autorisé est attendu. Il se relève pour chercher à manger sous **45 % de nutrition**, seuil alimentaire déjà employé localement ; feu, fuite, menace et riposte restent prioritaires. Ce repos est une **adaptation de Lisière**, et non un seuil de repos médical vérifié dans Core. La recherche Core requiert un patient animal non debout pour le soin, sans prescrire ce seuil de faim.

## Persistance et limites

Le schéma **106** valide strictement le schéma **105** avant migration. Il ajoute seulement la priorité **Animaux à 0** aux colons historiques : aucune compétence, bête, nourriture, désignation ou politique médicale n'est inventée. Une compétence Animaux absente reste de niveau 0. Les identités, désignations, cinq niveaux, dates d'entretien/dégradation, politique, nourriture portée et travail vétérinaire en cours sont enregistrés et contrôlés à la reprise. Le nouveau départ ne donne pas non plus d'animal gratuit ; un dresseur doit réellement apprivoiser un lièvre sauvage. La scène de démonstration V106, si chargée, est une situation **préparée**, distincte d'une progression autonome.

Restent absents : aires assignables aux animaux, enclos, corde et conduite des errants, apprivoisement des autres espèces, reproduction et jeunes, lait/laine/autres produits, animaux de bât, maîtres et dressage avancé, chirurgie et sauvetage vétérinaire des sauvages. La présence d'une espèce ou d'un médicament dans le catalogue ne promet pas ces boucles.
