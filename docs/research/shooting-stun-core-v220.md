# V220 — préparation et récupération sous étourdissement

Référence installée vérifiée : RimWorld Core1.6.4871 rev590. Cette recherche reprend les extractions primaires certifiées V219 ; elle ne les présente pas comme de nouvelles lectures du binaire ni comme la dernière version distribuée. [Recherche V219](ranged-mechanoids-core-v219.md), [profils humains V88](weapons-v88.md), [contrat V220](../development/shooting-stun-v220.md).

`Verse.Stance_Busy.StanceTick` décrémente son temps restant seulement si le stunner du propriétaire est inactif. `Verse.Stance_Warmup` reporte aussi ses contrôles de cible/ligne sous stun, puis réutilise Busy. La récupération installée par `Verse.Verb` hérite de Busy. `Verse.Pawn_StanceTracker` distingue étourdissement, stagger et stance ; son callback de dommage lu ne constitue pas une annulation automatique de toute préparation.

Entrée primaire Assembly-CSharp SHA256 : `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Extractions privées ILSpy8.2.0.7535 réemployées : Busy `ffae041e382cd0a35a6c7e90c23bc0927780243e255f71198aa2a9facf2a3e2f`, Warmup `267cb4d91e15553cae0616f4b7ebb8cbecfa14bdd4a4710d52a6312b541e5d67`, StanceTracker `0e8fe1fdb4dd3089ac61bd143a6a8b041e871f1048c5ee88dcc978ac65d7eff3`. Les deux premières sorties ont été relues et leurs hashes recontrôlés par root au début de V220. Sources commerciales et manifests restent dans `tmp/ranged-mech-next/current-phases`, hors dépôt.

Lisière utilisait des échéances absolues humaines : un vrai stun supprimait l'aim et la récupération expirait avant le contrôle d'étourdissement. Aucun contrat historique ne justifie cette différence comme adaptation voulue. V219 avait conservé cette branche humaine en ajoutant les horloges mécaniques ; V220 ferme ce défaut séparément.

L'adaptation locale conserve les dates et compte les consultations propriétaire réellement suspendues. Le tri ID/Core reste celui du moteur : un impact après le passage d'un tireur suspend ses prochains passages, sans remboursement rétroactif. Les stuns chevauchants ne comptent chaque passage qu'une fois. Les commandes restent des autorités explicites ; les contrôles de cible différés ne donnent aucune immunité clinique ou permission nouvelle.

Les limites déjà déclarées restent distinctes : stun humain45 Core provisoire, sélection des outils de mêlée locale, tir humain à cible numérique non typée, cadence et ordre global adaptés. Aucune conclusion de DPS exhaustif, performance générale, munitions réelles ou parité de toutes les interruptions de combat.
