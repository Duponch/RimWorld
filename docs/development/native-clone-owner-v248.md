# V248 — fermeture lexicale des clones natifs

Prototype privé qualifié puis écarté : sa fermeture reste exacte dans le domaine natif, mais le circuit est nettement plus lent que le lecteur actuel. Produit V242, schéma 198 et 62 références publiques conservés ; aucun FPS supplémentaire, GAME, build de promotion ou second banc inchangé. [Recherche](../research/native-clone-owner-v248.md), [preuves](../history/validation-native-clone-owner-v248.md).

## Cause et modification privée

[V247](validated-sparse-worker-v247.md) déplaçait le lecteur strict RAW entier dans un Worker isolé et renvoyait le paquet sparse original à MAIN. Sa reconstruction et sa fermeture MAIN coûtaient davantage que le lecteur actuel. V248 conserve ce transport, ses deux handles fixes, le RAW strict, les réponses FIFO, ACK, journaux privés et replis. Il remplace seulement le propriétaire générique par un propriétaire lexical des données réellement clonées : suppression des descripteurs par champ et du second census de realm effectué par le propriétaire. La gate réelle du codec avant reconstruction reste obligatoire.

Le fragment, ses classes et sa factory ne sont pas exportés. Aucun World fourni, bool readonly, Proxy ou fonction d'attachement ne crée un mandat natif. La factory MAIN fermée reçoit seulement les paquets de ses Workers fixes, avant exposition aux callbacks. Les objets frais ordinaires sont issus du clone natif ou des mêmes reconstructions locales de données ; les anciens descendants ont été fermés par ce même propriétaire. Le bootstrap des intrinsics est supposé fiable et aucune exécution externe n'intervient dans copy/write/prepare/finish.

## Découverte et propriété

Le propriétaire parcourt les nouvelles branches par prototype, ownKeys et valeurs propres, sans filtrer les champs du schéma. Une WeakSet privée reconnaît les anciens descendants fermés et une autre termine les cycles. Les aliases, own `__proto__`, valeurs undefined et sideprops de tableaux restent présents. Cette lecture directe n'est pas un détecteur de getter/Proxy raw : leur absence vient du canal constructif.

Les tableaux frais doivent être denses ; un trou impose le repli avant toute fermeture. Les prototypes exotiques accessibles depuis World imposent aussi RAW : Map/Set/Date, buffers et vues ne deviennent pas readonly par un simple freeze. Le graphe est entièrement découvert avant son premier freeze. Le buffer Float64Array de growth reste transitoire ; sa contrepartie Shared conserve le repli MAIN V247.

Le vrai slice d'un tableau dense antérieurement fermé produit un reçu privé. Les seules écritures suivantes sont les K remplacements du codec aux ordinals admis ; prepare relit la longueur et les valeurs finales K, puis découvre leurs descendants. Aucune copie K supplémentaire, vue empruntée ou scope consommateur n'est ajouté. Les vrais coûts N de slice et freeze restent payés et comptés. Le propriétaire ne promet aucune détection d'une mutation raw entre les phases : cette mutation est exclue par la transaction synchrone privée.

Une forme non supportée décline sans freeze partiel. Le codec reprend le lecteur RAW avec son état exact et désactive sa voie native jusqu'au vrai restart ; restaurer le realm ou publier un checkpoint ne réhabilite pas le canal. Le standalone public RAW, ses droits mutables et ses gardes restent littéraux.

## Qualification et décision

Les oracles natifs passent : quatre cohortes de 65 publications Aulnes/mixed, leurs counterpart Shared et constructeur Map, anciennes vues, journaux composés, standalone, metadata et vrai lifecycle avec sauvegarde/reprise. Cinq endpoints distincts exercent deux checkpoints chacun : own-data et alias/cycle ferment tous les descendants ; trou, Map et ArrayBuffer ne figent aucun descendant et restent en repli au checkpoint suivant. Les slots Map et bytes du buffer sont contrôlés explicitement.

Un coût séparé sans témoin utilise un cycle A/B/B/A par corpus, checkpoint froid, huit publications de chauffe puis 56 mesurées. Le callback commun inclut SceneResourceIndex et Nature.readScene sous vrai frame, avec les mêmes publications sautées. Ce pipeline de consommateurs est partiel : aucun rendu GPU, applyWorld entier ou GAME/UI/audio n'est dans ce chrono. Le circuit requête→fin callback comprend toutefois réellement les hops, le lecteur strict, reconstruction, fermeture, journaux et ce callback.

| Moyennes A→B, ms | Aulnes | mixed |
|---|---:|---:|
| Adoption MAIN inclusive | 3,696→9,396 | 1,553→15,170 |
| Requête→fin callback | 8,927→22,490 (+151,95 %) | 8,265→29,567 (+257,71 %) |
| Requête→réponse | 8,985→22,576 | 8,293→29,651 |
| Checkpoint froid | 199,168→510,388 | 78,605→300,052 |

Les phases owner sont des spans inclusifs dans MAIN : prepare vaut 5,73/6,17 ms sur les deux passes Aulnes et 8,46/8,19 ms sur mixed ; finish vaut 1,61/1,20 et 2,96/2,76 ms. Ce ne sont pas des budgets exclusifs et leur somme avec MAIN/livraison serait invalide. Quatre clocks grossières, copie frozen de compteurs et lookup sont réellement payés ; aucune taxe ou GC n'est soustrait.

Ces mesures restent défavorables malgré la suppression du census et des descripteurs redondants. Les valeurs B sont plus basses que celles du banc V247 précédent, mais ces invocations distinctes ne constituent pas une comparaison causale V247→V248 ni un gain général. Le RAW actuel est nettement meilleur dans le nouvel ABBA : candidat rejeté sans GAME, build ou répétition du banc. Les règles, cadence, qualité, RNG, sauvegardes et sessions sont conservés.

La suite utile est une attribution de la vraie source sur le produit actuel : préparation/publication, clone, adoption et charge continue. Aucun nouveau microcache propriétaire ou déplacement de thread n'est retenu sans cause et coût complet nouveaux.
