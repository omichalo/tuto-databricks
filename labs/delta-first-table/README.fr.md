# TP : votre première table Delta, de la création au time travel

**Statut sur Databricks Free Edition : expérimental.** Ce TP est complet et vérifié par la CI (génération des données, résultats attendus, nettoyage), mais il **n'a pas encore été exécuté sur un vrai workspace Free Edition**. Il ne sera déclaré « validé » qu'après une exécution réelle réussie, consignée dans `validation/`.

## Ce que vous allez faire

1. Générer une table Delta gérée `orders` de 10 000 commandes synthétiques.
2. Agréger le chiffre d'affaires par statut.
3. Dériver la table `orders_by_country` par `CREATE OR REPLACE TABLE ... AS SELECT`.
4. Annuler des commandes anciennes avec `UPDATE`.
5. Lire l'historique (`DESCRIBE HISTORY`) et interroger la version précédant l'`UPDATE` (`VERSION AS OF`).
6. Obtenir un code de contrôle, puis tout nettoyer.

Durée : environ 40 minutes. Calcul : serverless uniquement. Volume : moins de 1 Mo.

## Conditions d'utilisation

- Utilisez **votre propre** compte Databricks Free Edition, à titre **personnel et non commercial**. Ne partagez pas de compte entre apprenants.
- Free Edition applique des **quotas quotidiens** de calcul. Si le calcul est interrompu, reprenez le lendemain : le TP est rejouable depuis le début.
- Pour un usage professionnel ou commercial, utilisez le workspace de votre organisation (avec son accord) ou un essai Databricks, pas Free Edition.
- Ce TP n'est ni produit ni approuvé par Databricks, Inc.

## Procédure de bout en bout

### 1. Initialisation

1. Connectez-vous à votre workspace Free Edition.
2. Menu **Workspace** > votre dossier personnel > **Import** > **File**, puis choisissez `delta-first-table-exercise.ipynb` (ou la version `.py`) téléchargé depuis la page du TP. Importez aussi `delta-first-table-cleanup.ipynb`.
3. Ouvrez le notebook importé et attachez-le au calcul **Serverless**.
4. Exécutez la cellule des widgets, puis la cellule de configuration :
   - laissez `catalog` vide pour utiliser le catalogue courant du workspace ;
   - gardez `schema` = `orion_lab_delta_first_table`.
   - Si la création du schéma est refusée, le notebook l'indique et se replie sur le schéma `default` avec des tables préfixées `orion_dft_`.

### 2. Exécution

Exécutez les cellules **dans l'ordre** et complétez les cellules marquées « À compléter ».

| Étape                    | Résultat attendu                                               |
| ------------------------ | -------------------------------------------------------------- |
| 1. Génération            | 10 000 lignes                                                  |
| 2. Agrégation par statut | 4 lignes ; `delivered` : 6 000 commandes, 30 110 137 centimes  |
| 3. CTAS par pays         | 4 pays, 1 500 commandes livrées chacun                         |
| 4. Historique initial    | Au moins une version, la plus récente créant la table `orders` |
| 5. UPDATE                | 668 lignes modifiées ; 1 332 commandes `pending` restantes     |
| 6. Time travel           | 2 000 commandes `pending` dans la version précédant l'UPDATE   |

### 3. Vérification

Exécutez la cellule **« Vérification automatique du TP »** sans la modifier. Chaque contrôle doit afficher `OK`. La cellule affiche alors un code de la forme `DFT-xxxxx`.

Sur la plateforme, page du TP, saisissez ce code et confirmez le nettoyage. **Votre déclaration est enregistrée comme « déclarée par vous »** : la plateforme n'a aucun accès à votre workspace et ne peut pas vérifier techniquement votre travail. Le code de contrôle est seulement un indice de cohérence.

### 4. Nettoyage

1. Ouvrez `cleanup`, attachez-le au calcul serverless et utilisez les **mêmes valeurs de widgets**.
2. Exécutez toutes les cellules.
3. La dernière cellule doit afficher **« Objets du TP restants : 0 »**.

Le nettoyage supprime uniquement `orders` et `orders_by_country` (ou leurs versions préfixées dans `default`), puis le schéma du TP **seulement s'il est vide**. Il n'utilise jamais `CASCADE`.

## Dépannage

- **`PARSE_SYNTAX_ERROR` sur une cellule « À compléter »** : la requête contient encore `...`. Complétez-la.
- **« Aucune opération UPDATE dans l'historique »** : exécutez l'étape 5 avant l'étape 6.
- **Contrôle « pending après l'UPDATE » en échec** : vous avez probablement relancé la génération (étape 1) après l'UPDATE. Relancez les étapes 3 à 6 dans l'ordre.
- **Calcul arrêté ou quota atteint** : attendez la réinitialisation quotidienne ; vos tables restent en place.

## Fichiers

- `notebooks/exercise.ipynb` / `exercise.py` : énoncé à importer.
- `notebooks/cleanup.ipynb` / `cleanup.py` : nettoyage.
- `notebooks/solution.*` : corrigé, servi par la plateforme uniquement sur demande de l'apprenant.
- `data/generator.sql` : générateur déterministe (rendu Spark SQL et DuckDB).
- `data/reference.sql` et `data/expected-stats.json` : déroulé de référence et résultats attendus, calculés par la CI.
- `validation/` : preuves d'exécution réelle (vide tant que le TP est expérimental).
