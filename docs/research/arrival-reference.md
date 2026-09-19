# Arrivée volontaire — vérification du 19 septembre 2026

Périmètre Core : demande d’accueil, décision, entrée physique et intégration à la colonie. Corpus relu : chapitres 23/24, SYS/TEST-132..135 (admissibilité, état d’incident, notification et calendrier), 13/14 pour personnes et besoins. SYS-148 (capture/recrutement) demeure distinct : accepter un voyageur n’implémente pas les prisonniers.

## Sources et résolution de la divergence

- [Présentation officielle](https://rimworldgame.com/) : la croissance de population et les événements contribuent à la colonie. Description générale, sans coefficients de cet incident.
- [Guide communautaire de démarrage](https://rimworldwiki.com/wiki/Quickstart_Guides) : un arrivant demande de nouveaux couchages et affectations. Indication d’intégration, pas une spécification de fréquences.
- [QuestNode_Root_WandererJoin_WalkIn](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld.QuestGen/QuestNode_Root_WandererJoin_WalkIn.cs) et [ChoiceLetter_AcceptJoiner](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/ChoiceLetter_AcceptJoiner.cs) : demande avec délai d’un jour ; arrivée après acceptation, refus explicite et pensée associée, report possible. Le miroir s’annonce **1.6.9438.38202**, commit du **20 mai 2026**, relu ce jour. Ce n’est pas une publication officielle et il ne certifie pas les correctifs ultérieurs.
- [IncidentWorker_WandererJoin](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/IncidentWorker_WandererJoin.cs) ajoute directement une personne et cherche une bordure accessible. Sa présence ne suffit pas à attribuer l’adhésion automatique au parcours de quête précédent. **Correction de la préparation : conserver les deux chemins distincts.**
- [Table des pensées du wiki](https://rimworldwiki.com/wiki/Thought#Denied_joining) : refus d’accueil, −3 pendant six jours, cinq occurrences au maximum, multiplicateur de cumul 0,75. Les traits/états qui annulent cette pensée ne sont pas encore des contenus du projet ; ne pas les déclarer livrés.

L’accès direct à Events a échoué lors de la revue précédente ; son index décrivait déjà la demande temporisée. La classe de quête explique cette divergence avec les témoignages anciens d’adhésion automatique. Le contenu existant ne suffit toujours pas à certifier la distribution exacte des incidents, la biographie ou les possessions générées.

## Décisions

**Adopter** le choix différable, l’expiration d’une journée, la personne absente de la carte avant acceptation, l’entrée accessible au bord, l’intégration réelle aux besoins/travaux et le souvenir de refus. L’expiration seule ne suit pas le signal explicite de refus dans la classe consultée : elle ne produit pas ce souvenir. Refus et délai ne consomment aucun objet du camp.

**Adapter** l’unité temporelle (6 000 ticks locaux par jour), la recherche d’accès et la présentation 3D. Une bordure devenue inaccessible fait refuser atomiquement l’acceptation et laisse la demande ouverte ; il n’y a ni arrivée au centre ni percement du terrain. Le calcul de connectivité ne fournit pas un coût de route ; la marche reste celle du moteur commun.

**Calibration déclarée, sans parité annoncée :** profil `camp-arrivals-v1`, première vérification après 1,5–2 jours, suivantes après 4–8 jours, au plus une demande ouverte et pas de nouvelle offre à partir de douze colons vivants. Génération limitée à douze prénoms et trois profils des quatre compétences déjà actives, besoins de départ fixes et une chemise normale. Le premier régime disponible et les réglages usuels du camp servent de défaut ; pas de copie des réglages d’un colon arbitraire. Ces choix doivent être repris avec population, biographies, paramètres de difficulté et narrateur.

**Différer** narrateurs Cassandra/Phoebe/Randy, richesse/adaptation, pondération relative aux autres incidents, biographie/traits/parenté, enfants/extensions, inventaire personnel, contrôle complet des politiques des arrivants, bannissement et récupération après disparition de toute la population. Aucun taux ou inventaire généré n’est présenté comme celui de RimWorld.
