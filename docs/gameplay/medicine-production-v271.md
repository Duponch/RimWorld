# V271 — production de médicaments industriels

La boucle relie recherche, construction du laboratoire, achat de neutroamine, livraison des ingrédients, synthèse et soins avec le médicament existant. Schéma 206 ; les anciennes sauvegardes n’acquièrent aucune recherche au chargement.

## Règles primaires Core

Référence locale : Core **1.6.4871 rev590**, `Assembly-CSharp.dll` SHA-256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. XML : `Buildings_Production.xml`, `ResearchProjects_1.xml`, `ResearchProjects_3_Microelectronics.xml`, `Items_Resource_Manufactured.xml`, `Stats_Pawns_WorkRecipes.xml`, `WorkGivers.xml` et `TraderKinds_Orbital_Misc.xml`. Extraits et empreintes privés : `tmp/medicine-production-v271-reference` ; aucune source propriétaire intégrée au produit.

- Laboratoire `DrugLab` : **3×1**, 50 unités de bois/métal plus **75 acier et 6 composants**, construction 4, 120 PV, 3 500 unités de travail Core. Il fonctionne **sans électricité** ; sa place de travail doit être accessible.
- Production de drogues : **500 points**, niveau industriel, ouvre le laboratoire. Production de médicaments : **1 500 points**, exige cette recherche et Microélectronique, puis un bureau de recherche avancé alimenté.
- Une synthèse : **1 plante médicinale + 1 neutroamine + 3 tissus → 1 médicament**, **700 unités Core**. Artisanat 4 **et** Intelligence 4 ; travail de catégorie Artisanat, vitesse et apprentissage en Intelligence.
- Vitesse personnelle : `max(.1, WorkSpeedGlobal × (.3 + .0875 × Intelligence) × (.4 + .6 × min(Vue,1)) × Manipulation)`, puis facteur de l’établi (pièce laboratoire, température et extérieur). Artisanat interdit bloque le travail. Le Core ne crée aucun objet inachevé pour cette recette ; XP de base à l’achèvement seulement : `ticks travaillés Core × .1`.
- Neutroamine : prix de base **6**, masse **0,02**, pile **150**, **50 PV**, inflammabilité **0,7**, détérioration **1/jour** ; précurseur manufacturé, inutilisable comme médicament. Marchand exotique orbital : **100–500**. Autres fournisseurs Core : base outlander 50–200, caravanier chaman 25–100, caravanier industriel de vrac 70–160, orbital de vrac 100–200, pirate orbital 100–400.
- Le médicament produit garde ses propriétés existantes : puissance/plafond de soin **1**, prix de base **18**, masse **0,5**, pile **25**, **60 PV**, inflammabilité **0,7**, détérioration **2/jour**.

## Adaptations et parcours

Lisière conserve son horloge à dix ticks Core par tick local : travail neutre **70 ticks**, XP de base **1 par tick local travaillé**, versée à la réussite puis soumise à l’apprentissage commun. La recette unitaire utilise factures, réservations, collecte, transport, travail et dépôt existants ; le lot Core par quatre reste hors de V271. Les conditions réelles du travail et les interruptions restent actives.

La neutroamine arrive par le commerce exotique existant, avec stock et argent finis, puis entre dans les piles et transports ordinaires. Son ajout prospectif conserve les tirages des anciens schémas. Le laboratoire n’ajoute pas de charge au réseau ; seule la recherche avancée dépend de l’électricité. Après dépôt, les soins consomment le médicament selon leur plafond et leur logistique habituels.

Le fournisseur est le **marchand exotique local** déjà présent ; aucun commerce orbital n’est ajouté. Le laboratoire accepte actuellement bois ou acier. Les modificateurs `WorkSpeedGlobal` non livrés restent neutres. La détérioration environnementale générale des piles est absente : la valeur Core de neutroamine 1 PV/jour est documentée mais non simulée, comme pour les autres produits concernés. Neutroamine possède sa propre catégorie de stockage et ne compte jamais comme médicament utilisable.

## Validation

**107 cas uniques passent dans 20 fichiers, dont 35 nouveaux**, par reprises ciblées. Le groupe comprend les 62 sauvegardes publiques, recherches, construction, meubles, réservations, production, commerce et soins. Il vérifie les quotas distincts, les trois transports réels, le produit consommé par un soin, les reprises pendant collecte/travail/sortie, les annulations conservatrices et la saturation du sol. Une pile de 150 neutroamines est réellement transportée et rechargée sans perte.

Le premier typage échoue sur deux raccords et des versions de fixtures figées (6,553 s) ; reprise 5,151 s, puis build/typage final 7,303 s passent. Le groupe initial (79,317 s) conserve 97 réussites et neuf échecs : traits vides invalides dans les fixtures et blessure préparée trop faible, corrigés seulement dans les tests. Les 14 cas de production passent ensuite en 5,722 s ; les cinq cas d’approvisionnement incluant le transport ajouté passent en 4,583 s. Journaux privés `tmp/validation-runs/v271-*` ; aucun rouge effacé.

**Chromium WebGPU passe en 17,935 s** : facture réellement ajoutée et réglée par l’interface, collecte des ingrédients, sauvegarde/rechargement exact au tick 3063 pendant la synthèse, puis médicament déposé au tick 3151. Ingrédients consommés une fois, XP Intellectuel seulement, erreurs natives vides. Captures inspectées dans `tmp/medicine-production-v271-native-J7VYab`. Deux essais précédents (43,560 et 42,838 s) restent rouges : laboratoire préparé hors du cadre ; la capture du second établit ce problème de scénario. Les navigateurs et serveurs possédés sont fermés.

Documentation et liens contrôlés en fin de lot. Aucun fichier public de sauvegarde modifié, aucune campagne longue, fréquence naturelle commerciale ou amélioration de performances générale revendiquée.
