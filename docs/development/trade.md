# Visites et commerce physique — V88

**V105 :** sculptures minifiées physiques acceptées par le petit marchand, rachat puis archive au départ ; [contrat complet](colony-economy.md). Autres meubles minifiés non négociables.

Contrat de l'ensemble V88 livré, dans les limites des [preuves](../history/validation-trade-v88.md). [Recherche Core](../research/trade-reference-v88.md), [visiteurs](visitors.md), [armes](../research/weapons-v88.md). Corpus : chapitre 27, SYS/TEST-145 et UI-032 ; monnaie et possession distinctes de la cargaison de travail. Monde, caravanes de porteurs, commerce orbital et diplomatie complète restent absents.

L'argent se range par piles de 500. La capacité réglable des nouvelles réserves peut atteindre 500 sans dépasser la limite propre aux autres objets ; les anciennes réserves conservent leur capacité. Voir le [contrat de stockage](spatial-motion-storage.md).

## Déroulement

Les visiteurs neutres entrent et repartent par les bords accessibles. Un petit marchand porte des piles finies dans son inventaire ; ses provisions personnelles et ses vêtements portés ne constituent pas son stock. Le calendrier des visites et celui des passants ont leurs tirages privés persistés. Les anciennes parties doivent autoriser ces calendriers explicitement, sans rejouer la visite d'introduction.

Le bouton Visiteurs / Commerce ouvre le choix du marchand et d'un colon. Le négociateur doit être libre, capable de parler et d'entendre, et rejoindre physiquement le marchand. Un seul négociateur réserve ce contact. Un besoin urgent, une incapacité, un autre ordre ou le départ du marchand interrompt le dialogue. L'interface met la simulation en pause une fois le contact établi ; le moteur exige encore le contact à la confirmation. Une agression volontaire interrompt la visite entière. Les relations globales entre factions ne sont pas simulées.

Les objets coloniaux vendables sont au sol dans le foyer ou une réserve et accessibles depuis le marchand. Les quantités réservées sont exclues. Inventaire personnel, équipement, vêtements portés, matériaux incorporés et cargaisons restent distincts. La liste affiche les catégories refusées par ce profil précis : il n'achète pas arbitrairement les stocks agricoles, le bois ou toutes les protections.

## Panier et conservation

Les quantités du panier sont des intentions. La confirmation recalcule disponibilité, permissions, santé du négociateur et prix ; elle compare le devis présenté. Les biens et l'argent sont transférés immédiatement, conformément au commerce Core. Les achats sont déposés près du négociateur puis transportés par les travaux ordinaires. Aucun coût fictif de livraison ni crédit bancaire ne sont créés.

Toute l'opération est préparée sur des piles temporaires : vente, achat, monnaie et tous les dépôts. Sol saturé, identifiants épuisés, solde insuffisant ou dernier objet impossible refusent le panier entier. Les objets entiers gardent leur identité ; les divisions gardent âge, qualité et état ; les fusions pondèrent les états existants. Aucun tirage aléatoire n'est consommé par la transaction. Si le marchand manque d'argent, une case distincte exige d'accepter explicitement le manque avant de conclure.

Les valeurs, facteurs de qualité/PV, réduction de revente des armes, catégories et arrondis sont définis dans la recherche. Le bonus social dépend du niveau, de la parole et de l'audition ; l'impact social des conversations n'est pas utilisé. Récit d'aventure n'ajoute pas de perte de prix. Les stocks tirent dans les catégories Core complètes : un contenu absent est omis et n'augmente pas les chances du contenu livré.

## Persistance et limites

V87 est validée strictement avant V88. La migration ne crée ni visiteur, ni argent, ni arme, et conserve les anciens calendriers et cartes. Le contact, le stock, les agendas, les reçus et les archives de départ participent à la continuation. Les reçus récents sont bornés à 80 ; les comptes d'achat, vente et monnaie sont cumulés. L'archive d'un visiteur conserve ses possessions et sa physiologie à sa sortie, sans constituer une population mondiale active.

Le nouveau départ Atterrissage forcé révision 3 ajoute les 800 argent, le fusil à verrou et le couteau en plastacier vérifiés dans le scénario Core. Les anciens départs et Trois survivants restent inchangés. Ce complément ne termine pas la dotation complète, les biographies, le familier ni les débris dispersés.

Une seule famille de petits marchands est livrée. Les repas raffinés personnels des visiteurs sont remplacés explicitement par des repas simples de même nutrition. Les profils de personnes et leur équipement de défense restent partiels. Les soins volontaires aux visiteurs, cadeaux diplomatiques, esclaves, animaux vendus, marchandises sous étagères et expéditions commerciales ne sont pas couverts. Le transport des unités conserve le modèle de charge existant de Lisière ; aucune nouvelle simulation de masse générale n'est revendiquée.
