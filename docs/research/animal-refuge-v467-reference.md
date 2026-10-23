# V467 — Référence du refuge thermique animal autonome

Recherche du23octobre2026 après la publication de V466. **V467 qualifiée — schéma 288 ; cette note documente la référence et les adaptations.** La qualification ciblée, les parcours natifs et leurs reprises sont consignés dans la [note de gameplay](../gameplay/animal-refuge-v467.md) pilotée par ROOT ; publication encore à faire, public V466. Le [contrat primaire privé](../../tmp/animal-refuge-v467/primary-contract.md) et la [décision bornée](../../tmp/animal-refuge-v467/decision.md) conservent les preuves détaillées.

## Provenance et portée

Core **1.6.4871 rev590**, même installation que V466 et les preuves d’aires/repos V465. DLL SHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a` ; ILSpy8.2 SHA256 `c1635be8deba8b374b43863fe843950460f9860989decff3e522afab35d30904`. Empreintes avant/après inchangées. **16types complémentaires réussis,199437octets**, cinqXML relus et huit preuves réutilisées de cette même DLL ; aucune extraction entière ni copie propriétaire dans le produit. Les [manifestes des types](../../tmp/animal-refuge-v467/primary-manifest.json), [preuves réutilisées](../../tmp/animal-refuge-v467/primary-reused-manifest.json) et [XML](../../tmp/animal-refuge-v467/xml-provenance-before.json) donnent chemins, tailles et SHA256. Les deux essais de namespace erroné restent conservés avec leurs corrections ; un essai vide n’est pas une source réussie.

| XML relu | SHA256 |
|---|---|
| Animal.xml | `d857fb17533f17f90da48fae355d5014f7a4f78ab3dcc6ee755a881bda732121` |
| Insect.xml | `c08226f87c3febe3ba80fe6d32b51ef74a4a51431ebf794ab84501efa9c14545` |
| Jobs_Misc.xml | `537728d9066def61890253439953631e86afb7f2d5f08501a2a70172bcf5d714` |
| Races_Animal_Base.xml | `922276d8275c6087014de702401e97c2724d40c38a2f09de131075ba3e7afcf4` |
| Races_Animal_Insect.xml | `f715e91539d88732735adb16f59ec0be8a578829bfcfbeb442c8b08dcb153f27` |

Le giver réutilisé `JobGiver_SeekSafeTemperature` vaut `48c3e90ded7e310b7a3dd5f1475bb9fe215874329e7fddd74baeb51822e93c9c` ; le XML thermique réutilisé vaut `21210a4f8526e6547a9de6dba69a1588da2b0f3a88c682bab175372698c28e36`. Le corpus original HTML, notamment animaux, clinique, navigation/environnement et conservation, reste rapproché sans clôture globale de ses identifiants.

La recherche Internet ciblée déjà consignée a relu l’[annonce officielle gratuite1.3 du4juillet2021](https://ludeon.com/blog/2021/07/announcing-update-1-3-and-the-ideology-expansion/) : elle confirme enclos/clôtures et conduite physique, pas l’algorithme actuel du refuge. Le [signalement de forum1.3.3117](https://ludeon.com/forums/index.php?topic=55757.0) est un témoignage contradictoire dont l’ouverture directe a renvoyé403, sans résolution actuelle acquise. Ni ce témoignage, ni Wiki/mods, ni l’annonce1.7 ne remplacent la primaire installée identifiée. Aucune nouvelle requête Internet n’est réalisée pour cette synthèse.

## Règles adoptées

Le giver exige **Hypothermia ou Heatstroke au stade Serious, sévérité0,35 incluse** : `HediffSet`, `TemperatureInjuryStage`, `HediffDef` et le XML thermique ferment le seuil, soit350000000dans le kernel entier existant. Le seul air dangereux ne déclenche pas le refuge. **HypothermicSlowdown seul n’est pas reconnu**, même chez les trois insectes ; Heatstroke sérieux peut les admettre. Aucun profil n’est offert aux sept anciens animaux non marqués.

Les arbres Animal/Insect placent propriétaires prioritaires, feu/mental/combat, conduite/groupe et autres activités antérieures avant le bloc joueur. Dans ce bloc, vrai repos médical puis retour d’aire précèdent refuge ; besoins ordinaires et Haul suivent. Un repos médical sans vrai lit admissible ne produit pas à lui seul un job de lit bloquant. Le périmètre local retient le même animal domestique joueur disponible, mobile et éveillable ; sauvages, hostiles, patients portés et détenteurs suspendus n’acquièrent pas une marche autonome.

La recherche vise la **plage confortable inclusive**, pas les bornes dangereuses élargies de10°C. Le natif parcourt des régions passables, plafond9999, puis tire des cellules autorisées ; `maxRadius` n’est pas effectivement consulté dans ce flux. Une aire effective nonvide limite la destination des espèces concernées ; une aire vide est sans restriction. Les roamers/enclos n’ont pas de polygone d’aire implicite : portes et clôtures restent physiques. Un toit, un lit, un enclos ou une température confortable ne garantissent ni récupération ni sécurité tactique absolue.

`GotoSafeTemperature` utilise le driver Goto jusqu’à la vraie cible, sans fin thermique continue ni échéance : baisse sous0,35 ou changement d’air ne terminent pas seuls le trajet. `Wait_SafeTemperature` utilise Wait sans `forceSleep`, chemin arrêté et position réelle ; il n’accorde aucun sommeil, repos ou soin. **500Core désignent âge minimal puis occasion hash500 de CheckForJobOverride**, pas une sortie forcée à500. Même Wait/même source peut conserver son début ; autre job valide peut le remplacer ; sans aucune proposition native, Wait peut continuer. Les réservations de destination ne deviennent pas des réservations inventées de lit/ressource. L’allure par défaut est **Jog**, sans Sprint thermique spécifique.

Les JobDefs gardent `dropThingBeforeJob=true` et `carryThingAfterJob=false` : démarrer/remplacer dépose le même porté Near quand nécessaire, sans duplication ni reprise automatique de l’ancien Haul. Les champs de cible, début et échéance sont sérialisés ; un vrai état durable est justifié, une intention bénéfique créée par migration ne l’est pas.

## Adaptations décidées et limites

La [décision ROOT](../../tmp/animal-refuge-v467/decision.md) retient un frontier pondéré partagé, coût puis index stable, une vraie cellule libre/confortable/autorisée et **un seul quota commun de recherche par tick**. Cela adapte les régions et tirages natifs, sans égalité de cellule ou RNG revendiquée ; aucun rayon inventé, collecte/tri de carte par animal ou aire fictive d’enclos. La décision initiale suit l’occasion personnelle **hash60** déjà représentée : adaptation de cadence. Quota indisponible diffère ce choix ; absence de refuge laisse les besoins ordinaires accessibles. Géométrie, politique d’aire, accès propre à l’animal et air vivant de passe partagent leurs lecteurs/index utiles.

Le Goto conserve sa cible sous le seuil ou après changement d’air ; accès réellement impossible, aire modifiée ou propriétaire prioritaire peuvent révoquer son futur trajet sans réécrire l’arête engagée. À l’arrivée, nouvelle décision. Wait reste éveillé et conserve son début lors d’une continuation ; après âge500Core et hash500, **absence de proposition thermique libère vers le scheduler ordinaire local**. C’est une adaptation explicite du cas natif où absolument aucun autre job proposé peut laisser Wait en place. La guérison dépend exclusivement de l’air clinique V466 ; aux bornes confortables exactes, attendre ne prouve pas une récupération.

Le transport remplacé passe par son interruption existante : dépôt Near réel du même objet, ou maintien du vrai détenteur `holding` si le dépôt échoue ; anciennes réservations invalidées, aucun Haul repris gratuitement. Le task prospectif `animalThermalRefuge288` reste local ; portage, suspension, formation, retrait et décès le révoquent sans effacer dossier, cargo, âge, apprentissage ou arête. **287 strict avant numéro seul288**, capacités antérieures maintenues dans leurs familles fermées, absence du nouveau task avant288 et chez les détenteurs non locaux, futur fermé.

**Différés distincts :** slowdown clinique des insectes, gelures, brûlures d’air, terrain spécial chauffant, sauvetage autonome d’un immobile, construction automatique d’un abri, refonte globale des jobs/dangers et extensions. La divergence d’ordre thermique hors carte259 reste nommée par V466. Prévention du feu, seuils de reprise des factures et toutes les autres bases restent comparés ; aucun domaine, six ensembles, campagne durable, victoire ou cible FPS n’est clos par cette référence.
