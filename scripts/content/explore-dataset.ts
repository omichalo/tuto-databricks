/** Outil d'auteur : exécute une requête sur le jeu de données d'un exercice (DuckDB) et l'affiche. */
import { runOnDataset } from './exercise-runner';

const [rowsArg, ...sqlParts] = process.argv.slice(2);
const rows = Number(rowsArg);
if (!Number.isInteger(rows) || sqlParts.length === 0) {
  console.error('usage : tsx scripts/content/explore-dataset.ts <lignes> "<requête>"');
  process.exit(1);
}
const result = await runOnDataset(
  { dataset: { generator: 'labs/delta-first-table/data/generator.sql', rows, table: 'orders' } },
  sqlParts.join(' '),
);
console.log(result.columns.join(' | '));
for (const row of result.rows) console.log(row.map(String).join(' | '));
