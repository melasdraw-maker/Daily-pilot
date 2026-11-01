# Daily Pilot — Contexte & Mémoire Projet

## 1. Profil & Contexte Utilisateur
- **Intervenant & Formateur :** **HACHOUD WARD-SALEM** (Initiales / Trigramme : `HWS`)
- **Organisme de rattachement :** **Opéra Formation** (Formation • Sécurité • Ingénierie • Conseil)
- **Email utilisateur :** melasdraw@gmail.com
- **Objectif de l'application :** Assistant quotidien complet pour formateur mobile : gestion des plannings transmis par mail/texte, calcul d'itinéraires et réveils prédictifs (avec prise en compte du trafic), carnet de bord des formations, support pédagogique, et désormais **génération et envoi de la fiche de frais officielle Opéra Formation**.
- **Philosophie d'ergonomie :** Simplicité absolue, grand confort d'usage sur smartphone, saisie en direct, zéro superflu.

---

## 2. Planning Actif (Semaine du 02/11/2026 au 06/11/2026)
Le manager d'Opéra Formation transmet désormais le planning directement par e-mail texte sans intermédiaire.
- **Client :** Syndicat mixte Pays des Cévennes - PLIE Cévenol
- **Lieu :** 6 place des Martyrs de la Résistance, 30100 Alès (Chez le client)
- **Horaires :** 08h30 - 16h30 tous les jours
- **Détail des 5 journées :**
  1. **Lundi 02/11/2026 :** A260FDA : CCTH GO - Travail en Hauteur Gros Œuvre (Jour 1/4) - 10 stagiaires
  2. **Mardi 03/11/2026 :** A260FDA : CCTH GO - Travail en Hauteur Gros Œuvre (Jour 2/4) - 10 stagiaires
  3. **Mercredi 04/11/2026 :** A260FDA : CCTH GO - Travail en Hauteur Gros Œuvre (Jour 3/4) - 10 stagiaires
  4. **Jeudi 05/11/2026 :** A260FRB : CCTH GO - Travail en Hauteur Gros Œuvre (Jour 4/4) - 10 stagiaires
  5. **Vendredi 06/11/2026 :** A260FEA : AIPR - Autorisation d'intervention à proximité des réseaux - 11 stagiaires

---

## 3. Modèle Officiel Opéra Formation (Fiche de Frais)
Conforme à 100% au document PDF / Excel de référence fourni par l'intervenant :
- **En-tête officiel :** Logo quadricolore Opéra Formation, intitulé `FICHE DE FRAIS [mois] [NOM PRÉNOM]`, mention de la période (`Période du 01/MM/AAAA au DD/MM/AAAA`).
- **Colonnes du tableau (1 ligne par jour calendaire 1..31) :**
  1. `Date` (ex: `02/11/26`)
  2. `Objet` (ville / destination : `ales`, `nîmes`, `béziers`, `St Aunès`, etc.)
  3. `kms` (kilométrage journalier : ex: 130 km pour Alès)
  4. `Essence` (montant en €)
  5. `Autoroute` (péage en €)
  6. `Repas` (déjeuner en €)
  7. `Divers` (autre montant en €)
  8. `Divers / dénomination` (libellé explicatif de la dépense)
- **Barème kilométrique et totaux :**
  - Total de kms (somme automatique)
  - Indemnité Kilométrique : barème standard Opéra `0.40 €/km` (personnalisable)
  - Compteurs : `Km Début de Mois` et `Km Fin de Mois`
  - Totaux colonnes et Total Général Remboursable
- **Barème des distances standard :**
  - St Aunès : 10 km
  - Nîmes : 110 km
  - Alès : 130 km
  - Béziers : 150 km
  - Perpignan : 300 km
  - Toulouse : 480 km
- **Édition & Saisie directe :** Toutes les cases sont modifiables en direct d'un simple clic.
- **Export PDF Officiel :** Génération vectorielle haute définition via `jspdf` respectant la charte graphique.
- **Contrôle & Envoi par E-mail :**
  - Modal demandant l'adresse e-mail destinataire (ex: `comptabilite@opera-formation.fr`) avec mémorisation locale.
  - Checklist de contrôle avant validation pour que le formateur vérifie ses montants en un coup d'œil.
  - Génération immédiate du PDF et ouverture de l'e-mail pré-rempli avec récapitulatif complet et pièces jointes.

---

## 4. Import Simplifié Planning Opera Formation (`PlanningTab`)
- **Composant dédié :** `OperaPlanningImportModal` remplace l'ancienne interface complexe d'extraction Gmail.
- **Analyseur direct :** `operaEmailParser.ts` interprète instantanément la structure exacte envoyée par Opera Formation (`Le JJ/MM/AAAA de 08:30 à 16:30 -> CODE: INTRA: CLIENT - VILLE - FORMATION (Lieu: ... >> Coordonnées Client INTRA : ADRESSE)`).
- **Zéro friction :** L'utilisateur clique sur « Coller e-mail Opera », colle le texte ou utilise le bouton d'exemple en 1 clic, et valide directement avec « Remplacer mon planning » ou « Ajouter au planning ».

