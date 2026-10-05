# V220 — conserver le tir humain sous étourdissement

Lot de consolidation engagé après V219, schéma 198. [Règles de tir](shooting.md), [mêlée](melee.md), [référence primaire](../research/shooting-stun-core-v220.md), [contrôles et limites](../history/validation-shooting-stun-v220.md).

Un vrai coup Blunt peut étourdir un humain pendant une préparation ou une récupération de tir. Ces phases doivent conserver leur travail restant : ni préparation intégralement recommencée, ni récupération consommée pendant l'étourdissement. Les profils revolver18/96 et fusil102/90 Core, les projectiles, l'apprentissage et l'ordre ID/Core restent ceux du moteur existant.

Chaque nouvelle stance porte une `clock` facultative : `lastAdvancedAtCore` et `pausedCore`. L'origine réelle `startedAtCore` reste fixe ; chaque passage propriétaire réellement étourdi allonge `endsAtCore` d'un Core et ajoute une pause. La durée vérifie exactement `endsAtCore - startedAtCore - pausedCore = durée du profil`. Un passage répété au même Core ne facture rien. Une nouvelle récupération remet son propre compteur à zéro.

Le scheduler commun fournit explicitement le contexte Core ; les commandes/revalidations ne font pas avancer cette horloge. Une ancienne stance sans clock est adoptée au premier passage propriétaire à la frontière précédente, sans compensation du passé. La migration valide strictement197 puis change seulement le numéro : aucun compteur, délai, ordre ou tirage ajouté au chargement. Une propre clé `clock`, même undefined, est future sous197.

Les interruptions cliniques et les autorités restent immédiates : mort/chute, manipulation nulle, refus de violence, arrêt, déplacement, démobilisation, perte de mandat ou hold-fire automatique. Annuler une préparation la supprime ; annuler l'ordre conserve une récupération et son horloge. Sous un vrai étourdissement, la préparation diffère seulement les contrôles dynamiques de cible/ligne jusqu'à reprise. Aucun stagger ni adversaire adjacent ne fabrique cette exception.

Les sauvegardes et snapshots partagent les gardes de forme, de durée et de contexte après registration de tous les propriétaires Thing, y compris hors carte. Les cibles restent des IDs humains historiques non typés ; le format ne prouve pas le type ancien d'une identité retirée sans propriétaire. Les aliases connus vers un objet non vivant sont refusés. Aucun voyage ou groupe n'acquiert un état de tir hors carte. Les refus transport précèdent l'adoption du World, de la révision et des indices.

La présentation observe les changements discrets d'ordre, de phase, d'origine, de profil et d'étourdissement, sans publier immédiatement à chaque mise à jour du watermark. L'origine audio/pose demeure réelle. Aucun nouveau modèle, shader, scène publique ou inventaire de munitions. La durée locale de stun45 et les interruptions historiques d'un coup sans stun restent des adaptations distinctes ; ce lot ne promet pas la parité intégrale du combat humain.

Consigne utilisateur finale : terminer et committer ce lot localement, puis arrêter jusqu'à ses tests et son signal de reprise. La relance automatique est en pause ; aucun push.
