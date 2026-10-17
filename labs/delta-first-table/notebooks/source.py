# Databricks notebook source
# MAGIC %md
# MAGIC # TP : votre première table Delta, de la création au time travel
# MAGIC
# MAGIC **Durée** : environ 40 minutes. **Calcul** : serverless. **Données** : 10 000 commandes synthétiques générées par ce notebook (aucun téléchargement, aucune donnée personnelle).
# MAGIC
# MAGIC À la fin de ce TP, vous saurez :
# MAGIC 1. créer une table Delta gérée par Unity Catalog avec `CREATE OR REPLACE TABLE ... AS SELECT` ;
# MAGIC 2. agréger des données avec `GROUP BY` et dériver une nouvelle table par CTAS ;
# MAGIC 3. modifier des lignes avec `UPDATE` et constater qu'une nouvelle version de la table est créée ;
# MAGIC 4. lire l'historique avec `DESCRIBE HISTORY` et interroger une version antérieure avec `VERSION AS OF`.
# MAGIC
# MAGIC **Avant de commencer**
# MAGIC - Utilisez votre propre workspace Databricks Free Edition, à titre personnel et non commercial, ou un workspace professionnel dans lequel vous êtes autorisé à créer un schéma de test.
# MAGIC - Attachez ce notebook au calcul **serverless** et exécutez les cellules **dans l'ordre**.
# MAGIC - À la fin, exécutez le notebook `cleanup` pour supprimer tout ce que le TP a créé.

# COMMAND ----------

# MAGIC %md
# MAGIC ## 0. Configuration
# MAGIC
# MAGIC Deux widgets apparaissent en haut du notebook :
# MAGIC - `catalog` : laissez-le vide pour utiliser le catalogue courant de votre workspace (sur Free Edition, le catalogue du workspace) ;
# MAGIC - `schema` : le schéma dédié au TP. Il est créé s'il n'existe pas.
# MAGIC
# MAGIC Si vous n'avez pas le droit de créer un schéma, le notebook se replie sur le schéma `default` et préfixe les tables par `orion_dft_` pour ne rien écraser.

# COMMAND ----------

dbutils.widgets.text("catalog", "", "Catalogue (vide = catalogue courant)")
dbutils.widgets.text("schema", "orion_lab_delta_first_table", "Schéma du TP")

# COMMAND ----------

import re

LAB_SCHEMA_DEFAULT = "orion_lab_delta_first_table"
FALLBACK_PREFIX = "orion_dft_"
_IDENTIFIER = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_-]{0,127}$")


def checked_identifier(value, label):
    if not _IDENTIFIER.match(value):
        raise ValueError(f"{label} invalide : {value!r}. Caractères autorisés : lettres, chiffres, _ et -.")
    return value


catalog_name = checked_identifier(
    dbutils.widgets.get("catalog").strip() or spark.sql("SELECT current_catalog()").first()[0],
    "Catalogue",
)
schema_name = checked_identifier(dbutils.widgets.get("schema").strip() or LAB_SCHEMA_DEFAULT, "Schéma")

try:
    spark.sql(f"CREATE SCHEMA IF NOT EXISTS `{catalog_name}`.`{schema_name}`")
    table_prefix = ""
except Exception as error:
    print(f"Création du schéma impossible ({type(error).__name__}) : repli sur `default` avec le préfixe {FALLBACK_PREFIX}.")
    schema_name, table_prefix = "default", FALLBACK_PREFIX

T_ORDERS = f"`{catalog_name}`.`{schema_name}`.`{table_prefix}orders`"
T_BY_COUNTRY = f"`{catalog_name}`.`{schema_name}`.`{table_prefix}orders_by_country`"
print("Table des commandes :", T_ORDERS)
print("Table par pays      :", T_BY_COUNTRY)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 1. Générer la table `orders`
# MAGIC
# MAGIC La cellule suivante crée une **table gérée** : vous ne précisez ni emplacement ni format. Sur Databricks, une table créée sans `USING` est une table Delta, et sans `LOCATION` elle est gérée par Unity Catalog.
# MAGIC
# MAGIC Les valeurs sont calculées à partir de `id` par de l'arithmétique entière : chaque exécution produit exactement les mêmes 10 000 lignes, ce qui permet de vérifier vos résultats.

# COMMAND ----------

# BEGIN GENERATOR
GENERATOR_SQL = f"""
__GENERATOR__
"""
# END GENERATOR

spark.sql(GENERATOR_SQL)
print("Lignes :", spark.sql(f"SELECT COUNT(*) FROM {T_ORDERS}").first()[0])
display(spark.sql(f"SELECT * FROM {T_ORDERS} ORDER BY order_id LIMIT 10"))

# COMMAND ----------

# MAGIC %md
# MAGIC ## 2. Agréger : chiffre d'affaires par statut
# MAGIC
# MAGIC Écrivez une requête qui renvoie, pour chaque `status` :
# MAGIC - le nombre de commandes, nommé `orders` ;
# MAGIC - la somme de `amount_cents`, nommée `revenue_cents`.
# MAGIC
# MAGIC Triez par `revenue_cents` décroissant. Résultat attendu : 4 lignes, avec `delivered` en tête (6 000 commandes).

# COMMAND ----------

# >>> SOLUTION
query_by_status = f"""
SELECT status, COUNT(*) AS orders, SUM(amount_cents) AS revenue_cents
FROM {T_ORDERS}
GROUP BY status
ORDER BY revenue_cents DESC
"""
# === EXERCISE
# | # À compléter : regroupez par statut, comptez les commandes et sommez amount_cents.
# | query_by_status = f"""
# | SELECT ...
# | FROM {T_ORDERS}
# | """
# <<< SOLUTION
display(spark.sql(query_by_status))

# COMMAND ----------

# MAGIC %md
# MAGIC ## 3. Dériver une table par CTAS
# MAGIC
# MAGIC Créez (ou remplacez) la table `T_BY_COUNTRY` qui contient, **pour les seules commandes `delivered`** et pour chaque `country` :
# MAGIC - `delivered_orders` : le nombre de commandes ;
# MAGIC - `delivered_revenue_cents` : la somme de `amount_cents`.
# MAGIC
# MAGIC Résultat attendu : 4 pays, 1 500 commandes livrées chacun.

# COMMAND ----------

# >>> SOLUTION
spark.sql(f"""
CREATE OR REPLACE TABLE {T_BY_COUNTRY} AS
SELECT country, COUNT(*) AS delivered_orders, SUM(amount_cents) AS delivered_revenue_cents
FROM {T_ORDERS}
WHERE status = 'delivered'
GROUP BY country
""")
# === EXERCISE
# | # À compléter : CREATE OR REPLACE TABLE {T_BY_COUNTRY} AS SELECT ... WHERE status = 'delivered' ...
# | spark.sql(f"""
# | CREATE OR REPLACE TABLE {T_BY_COUNTRY} AS
# | SELECT ...
# | """)
# <<< SOLUTION
display(spark.sql(f"SELECT * FROM {T_BY_COUNTRY} ORDER BY delivered_revenue_cents DESC"))

# COMMAND ----------

# MAGIC %md
# MAGIC ## 4. Observer l'historique avant modification
# MAGIC
# MAGIC Chaque écriture dans une table Delta est une transaction enregistrée dans son journal (`_delta_log`) et crée une nouvelle **version**. `DESCRIBE HISTORY` affiche ces versions, de la plus récente à la plus ancienne.

# COMMAND ----------

display(spark.sql(f"DESCRIBE HISTORY {T_ORDERS}").select("version", "timestamp", "operation", "operationMetrics"))

# COMMAND ----------

# MAGIC %md
# MAGIC ## 5. Modifier avec `UPDATE`
# MAGIC
# MAGIC Les commandes encore `pending` passées **avant le 1er mars 2026** sont considérées comme abandonnées. Passez leur `status` à `cancelled` avec une instruction `UPDATE`.
# MAGIC
# MAGIC Résultat attendu : 668 lignes modifiées ; il reste 1 332 commandes `pending`.

# COMMAND ----------

# >>> SOLUTION
display(spark.sql(f"""
UPDATE {T_ORDERS}
SET status = 'cancelled'
WHERE status = 'pending' AND order_date < DATE '2026-03-01'
"""))
# === EXERCISE
# | # À compléter : UPDATE ... SET status = 'cancelled' WHERE ...
# | display(spark.sql(f"""
# | UPDATE {T_ORDERS}
# | SET ...
# | WHERE ...
# | """))
# <<< SOLUTION
print("Commandes pending restantes :", spark.sql(f"SELECT COUNT(*) FROM {T_ORDERS} WHERE status = 'pending'").first()[0])

# COMMAND ----------

# MAGIC %md
# MAGIC ## 6. Lire l'historique et voyager dans le temps
# MAGIC
# MAGIC La cellule suivante retrouve la version produite par votre `UPDATE` et en déduit la version précédente. Interrogez ensuite la table **telle qu'elle était avant l'UPDATE** avec `VERSION AS OF` et comptez les commandes `pending`.
# MAGIC
# MAGIC Résultat attendu : 2 000 commandes `pending` dans la version précédente.

# COMMAND ----------

history = spark.sql(f"DESCRIBE HISTORY {T_ORDERS}")
display(history.select("version", "timestamp", "operation", "operationMetrics"))
update_version = history.filter("operation = 'UPDATE'").agg({"version": "max"}).first()[0]
if update_version is None:
    raise RuntimeError("Aucune opération UPDATE dans l'historique : exécutez d'abord l'étape 5.")
version_before_update = update_version - 1
print("Version de l'UPDATE :", update_version, "/ version précédente :", version_before_update)

# COMMAND ----------

# >>> SOLUTION
pending_before = spark.sql(
    f"SELECT COUNT(*) FROM {T_ORDERS} VERSION AS OF {version_before_update} WHERE status = 'pending'"
).first()[0]
# === EXERCISE
# | # À compléter : comptez les commandes pending dans la version version_before_update.
# | pending_before = spark.sql(
# |     f"SELECT ... FROM {T_ORDERS} VERSION AS OF ... WHERE ..."
# | ).first()[0]
# <<< SOLUTION
print("Commandes pending avant l'UPDATE :", pending_before)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 7. Vérification automatique du TP
# MAGIC
# MAGIC Ne modifiez pas cette cellule. Elle relit vos tables et compare les résultats aux valeurs attendues. Si tous les contrôles sont `OK`, elle affiche un **code de contrôle** à recopier sur la plateforme.
# MAGIC
# MAGIC Ce code est un indice que vous déclarez vous-même : il ne constitue pas une validation technique automatique de votre travail.

# COMMAND ----------

# BEGIN EXPECTED
EXPECTED = {
    "rows": 0,
}
# END EXPECTED
CHECK_PREFIX = "DFT"
CHECK_MODULUS = 99991

results = []


def check(label, compute, expected):
    try:
        actual = compute()
    except Exception as error:
        actual = f"erreur : {type(error).__name__}"
    ok = actual == expected
    results.append(ok)
    print(f"{'OK   ' if ok else 'ÉCHEC'} {label} : obtenu {actual}, attendu {expected}")
    return actual


def scalar(sql):
    return spark.sql(sql).first()[0]


check("Lignes de orders", lambda: scalar(f"SELECT COUNT(*) FROM {T_ORDERS}"), EXPECTED["rows"])
check("Pays dans orders_by_country", lambda: scalar(f"SELECT COUNT(*) FROM {T_BY_COUNTRY}"), EXPECTED["countries"])
delivered = check(
    "CA livré total (centimes)",
    lambda: scalar(f"SELECT SUM(delivered_revenue_cents) FROM {T_BY_COUNTRY}"),
    EXPECTED["deliveredRevenueCents"],
)
check(
    "UPDATE présent dans l'historique",
    lambda: spark.sql(f"DESCRIBE HISTORY {T_ORDERS}").filter("operation = 'UPDATE'").count() > 0,
    True,
)
check(
    "pending dans la version précédant l'UPDATE",
    lambda: scalar(f"SELECT COUNT(*) FROM {T_ORDERS} VERSION AS OF {version_before_update} WHERE status = 'pending'"),
    EXPECTED["pendingBeforeUpdate"],
)
pending_after = check(
    "pending après l'UPDATE",
    lambda: scalar(f"SELECT COUNT(*) FROM {T_ORDERS} WHERE status = 'pending'"),
    EXPECTED["pendingAfterUpdate"],
)
cancelled_after = check(
    "cancelled après l'UPDATE",
    lambda: scalar(f"SELECT COUNT(*) FROM {T_ORDERS} WHERE status = 'cancelled'"),
    EXPECTED["cancelledAfterUpdate"],
)

if all(results):
    code_value = (delivered + 7 * pending_after + 13 * cancelled_after) % CHECK_MODULUS
    print(f"\nTous les contrôles sont OK. Code de contrôle : {CHECK_PREFIX}-{code_value:05d}")
    print("Pensez à exécuter le notebook cleanup.")
else:
    print("\nAu moins un contrôle a échoué : relisez l'étape concernée, corrigez-la puis relancez cette cellule.")
