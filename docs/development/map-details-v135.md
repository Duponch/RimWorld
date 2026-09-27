# Repères de carte V135

Le bas de la fiche colon possède un seul portrait SVG mis en cache par identité, vêtement et expression. Bio conserve les faits du colon sans bloc « Apparence » supplémentaire en haut. Le résumé garde le nom, l'activité et la commande de fermeture à côté du portrait.

À zoom rapproché, `MapLabelsOverlay` peint les quantités des objets empilables, **y compris un seul exemplaire**, et les qualités des objets non empilables sur un seul canvas 2D transparent. Ce canvas n'intercepte pas les clics ; le canvas WebGPU reste l'unique `#viewport canvas`. Les étiquettes sont indexées par chunks de 16 cases au changement de snapshot et les chunks hors frustum sont exclus avant la projection des objets. **Sous 34 pixels par case**, la couche est masquée avant l'indexation ou le dessin. Il n'y a donc aucune étiquette générée en vue éloignée, et aucun objet DOM ou appel GPU supplémentaire par pile. Le coût CPU/canvas existe à zoom proche ; ce n'est pas un gain FPS prouvé.

Alt affiche près du pointeur, uniquement pendant l'appui et tant qu'une case est survolée, les objets de la case et les faits présents : rôle et mesures de pièce, beauté perçue, terrain, vitesse, fertilité, température, luminosité et toit. L'inspecteur ne sélectionne ni ne colore le terrain. Les lectures lourdes de beauté/topologie s'effectuent au plus toutes les 160 ms pendant l'appui ; hors Alt la sortie est immédiate. Le survol ordinaire en bas à gauche continue de fonctionner sans Alt. [Référence Core et différences](../research/map-details-core-v135.md).

L'avatar HUD marque plus distinctement le sommeil et le décès à partir de l'état confirmé du colon. La carte et les panneaux ne modifient aucune sauvegarde, décision ou séquence du PRNG métier.
