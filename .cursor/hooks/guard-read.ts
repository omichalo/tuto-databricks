/** beforeReadFile : les fichiers .env* (hors .env.example) et les clés de service ne sont jamais lus. */
import { readInput, respond, stringField } from './lib';
import { readDecision } from './policy';

respond(readDecision(stringField(readInput(), 'file_path', 'path')));
