# Plan d'implémentation — Nettoyage Planning & Module Notes de Frais

Adaptation de l'application aux nouvelles méthodes du manager : suppression définitive de toute la gestion des plannings par fichiers Excel, refonte ultra-simple axée sur les e-mails/texte brut, et ajout d'un module complet de notes de frais mobiles avec scan photo de reçus par IA.

---

## 1. Revue Utilisateur Requise

> [!IMPORTANT]
> - **Planning Excel vs Notes de Frais Excel :** Les fonctionnalités d'import de planning par fichier Excel sont entièrement supprimées et nettoyées comme demandé. En revanche, le module de notes de frais permettra d'exporter et de remplir le futur modèle Excel que vous fournirez.
> - **Numérisation de reçus :** La capture photo s'active directement avec l'appareil photo du smartphone via l'attribut HTML5 natif (`capture="environment"`), sans nécessiter d'installation externe. L'IA extrait automatiquement la date, le montant TTC, la TVA, le commerçant et la catégorie.
> - **Ajout d'un onglet « Frais » :** Pour préserver une ergonomie claire et directe, un onglet dédié « Frais » est intégré dans la barre de navigation.

---

## 2. Modifications Proposées

### A. Nettoyage du Code Mort & Suppression du Planning Excel
- **Suppression du service d'analyse Excel de planning :** Retrait de `src/services/excelParser.ts` et des dépendances inutiles de parsing de plannings.
- **Nettoyage des composants :**
  - Dans `PlanningTab.tsx` : suppression de la zone de dépôt de fichier Excel.
  - Dans `SettingsTab.tsx` : retrait de la section d'import Excel hebdomadaire.
  - Dans `GmailPlanningExtractModal.tsx` : concentration exclusive sur l'e-mail texte et la zone de copier-coller rapide du message de votre manager.

### B. Module « Notes de Frais » Intelligentes (`ExpensesTab.tsx`)
- **Prise de photo & Scan de tickets :**
  - Bouton mobile « 📷 Photographier un reçu » ouvrant directement l'appareil photo arrière.
  - Possibilité d'importer un ticket ou une facture reçue par e-mail (PDF ou image).
  - Zone de saisie rapide pour copier-coller le texte d'un e-mail de confirmation (ex: facture Uber, SNCF, hôtel).
- **Backend d'analyse de reçus (Gemini 3.8 Flash) :**
  - Nouvel endpoint `/api/gemini/extract-receipt` dans `server.ts`.
  - Détection automatique : date, enseigne/fournisseur, montant total TTC, montant HT, TVA, moyen de paiement, type de dépense (Carburant, Péage, Restaurant, Transport, Hébergement, Divers).
- **Calcul des Indemnités Kilométriques (IK) :**
  - Association automatique aux missions effectuées dans l'application avec calcul des kilomètres aller-retour réels.
- **Tableau récapitulatif & Filtres :**
  - Affichage par semaine ou par mois avec totaux instantanés (Total TTC, TVA déductible, Total IK remboursable).
  - Statut de validation de chaque dépense avec visualisation de la photo du ticket.
  - Export instantané au format tableur / CSV, prêt à être branché sur le modèle Excel officiel dès que vous l'aurez fourni.

### C. Fichiers touchés & créés
- `src/types/index.ts` : ajout des structures `ExpenseItem`, `ExpenseCategory`, `ExpenseReport`.
- `src/components/ExpensesTab.tsx` : nouveau composant ergonomique et mobile-first de gestion des notes de frais.
- `src/components/Navigation.tsx` : ajout de l'onglet `frais` avec icône `Receipt`.
- `src/components/SettingsTab.tsx` & `PlanningTab.tsx` : nettoyage du code mort Excel.
- `server.ts` : ajout de l'endpoint OCR de tickets et suppression des routes résiduelles.
- `src/App.tsx` : persistance des notes de frais dans `localStorage` (`daily_pilot_expenses_v1`).

---

## 3. Plan de Vérification

### Tests automatisés
- `lint_applet` (`tsc --noEmit`) : validation du typage TypeScript sans régression.
- `compile_applet` (`npm run build`) : vérification de la compilation propre de l'application.

### Tests fonctionnels
1. **Suppression Excel :** Vérifier que l'interface ne présente plus aucune mention ou champ de glisser-déposer de planning Excel.
2. **Extraction texte/e-mail :** Tester le copier-coller direct d'un texte d'e-mail de planning et vérifier l'import instantané des missions.
3. **Capture photo de reçu :** Tester l'envoi d'une photo de ticket de caisse ou facture et vérifier l'extraction des montants et de la TVA.
4. **Export :** Tester le calcul des totaux et le téléchargement des notes de frais.
