# Databricks notebook source
# MAGIC %md
# MAGIC # Nettoyage du TP « Votre première table Delta »
# MAGIC
# MAGIC Ce notebook supprime **uniquement** les objets créés par le TP :
# MAGIC - les tables `orders` et `orders_by_country` (ou `orion_dft_orders` et `orion_dft_orders_by_country` dans le schéma `default` en cas de repli) ;
# MAGIC - le schéma `orion_lab_delta_first_table`, seulement s'il est vide.
# MAGIC
# MAGIC Utilisez les **mêmes valeurs de widgets** que dans le notebook du TP. Attachez-le au calcul serverless et exécutez toutes les cellules.

# COMMAND ----------

dbutils.widgets.text("catalog", "", "Catalogue (vide = catalogue courant)")
dbutils.widgets.text("schema", "orion_lab_delta_first_table", "Schéma du TP")

# COMMAND ----------

import re

LAB_SCHEMA_DEFAULT = "orion_lab_delta_first_table"
FALLBACK_PREFIX = "orion_dft_"
LAB_TABLES = ["orders_by_country", "orders"]
_IDENTIFIER = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_-]{0,127}$")


def checked_identifier(value, label):
    if not _IDENTIFIER.match(value):
        raise ValueError(f"{label} invalide : {value!r}. Caractères autorisés : lettres, chiffres, _ et -.")
    return value.lower()


catalog_name = checked_identifier(
    dbutils.widgets.get("catalog").strip() or spark.sql("SELECT current_catalog()").first()[0],
    "Catalogue",
)
schema_name = checked_identifier(dbutils.widgets.get("schema").strip() or LAB_SCHEMA_DEFAULT, "Schéma")

existing_schemas = {row[0].lower() for row in spark.sql(f"SHOW SCHEMAS IN `{catalog_name}`").collect()}
lab_schema_exists = schema_name in existing_schemas
print("Schéma du TP présent :", lab_schema_exists)

# COMMAND ----------

dropped = []
if lab_schema_exists:
    for table in LAB_TABLES:
        name = f"`{catalog_name}`.`{schema_name}`.`{table}`"
        spark.sql(f"DROP TABLE IF EXISTS {name}")
        dropped.append(name)
if "default" in existing_schemas:
    for table in LAB_TABLES:
        name = f"`{catalog_name}`.`default`.`{FALLBACK_PREFIX}{table}`"
        spark.sql(f"DROP TABLE IF EXISTS {name}")
        dropped.append(name)
print("Tables supprimées (si elles existaient) :")
for name in dropped:
    print(" -", name)

# COMMAND ----------

if lab_schema_exists and schema_name != "default":
    remaining = spark.sql(f"SHOW TABLES IN `{catalog_name}`.`{schema_name}`").count()
    if remaining == 0:
        spark.sql(f"DROP SCHEMA IF EXISTS `{catalog_name}`.`{schema_name}`")
        print("Schéma supprimé :", schema_name)
    else:
        print(f"Schéma conservé : il contient encore {remaining} objet(s) qui n'appartiennent pas au TP.")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Contrôle final
# MAGIC
# MAGIC La cellule suivante compte les objets du TP encore présents. Le résultat attendu est **0**.

# COMMAND ----------

remaining_objects = []
schemas_now = {row[0].lower() for row in spark.sql(f"SHOW SCHEMAS IN `{catalog_name}`").collect()}
if schema_name in schemas_now and schema_name != "default":
    tables_in_lab_schema = {row["tableName"].lower() for row in spark.sql(f"SHOW TABLES IN `{catalog_name}`.`{schema_name}`").collect()}
    remaining_objects += [t for t in LAB_TABLES if t in tables_in_lab_schema]
    if schema_name == LAB_SCHEMA_DEFAULT:
        remaining_objects.append(f"schema:{schema_name}")
if "default" in schemas_now:
    tables_in_default = {row["tableName"].lower() for row in spark.sql(f"SHOW TABLES IN `{catalog_name}`.`default`").collect()}
    remaining_objects += [FALLBACK_PREFIX + t for t in LAB_TABLES if FALLBACK_PREFIX + t in tables_in_default]

print("Objets du TP restants :", len(remaining_objects))
for name in remaining_objects:
    print(" -", name)
if remaining_objects:
    print("Le nettoyage est incomplet : relisez les messages ci-dessus.")
else:
    print("Nettoyage terminé.")
