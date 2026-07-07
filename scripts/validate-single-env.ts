import { existsSync, readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';

const projectRoot = process.cwd();
const envDir = resolve(projectRoot, 'src/environments');
const angularJsonPath = resolve(projectRoot, 'angular.json');

if (!existsSync(envDir)) {
  throw new Error('No existe src/environments. Debe existir con un solo environment.ts');
}

const envFiles = readdirSync(envDir).filter((name) => name.startsWith('environment') && name.endsWith('.ts'));
const extraEnvFiles = envFiles.filter((name) => name !== 'environment.ts');

if (!envFiles.includes('environment.ts')) {
  throw new Error('Falta src/environments/environment.ts');
}

if (extraEnvFiles.length > 0) {
  throw new Error(`Single-env policy violada. Elimina estos archivos: ${extraEnvFiles.join(', ')}`);
}

if (!existsSync(angularJsonPath)) {
  throw new Error('No existe angular.json');
}

const angularJson = readFileSync(angularJsonPath, 'utf8');
if (/"fileReplacements"\s*:\s*\[[\s\S]*?"src\/environments\/environment\.ts"/m.test(angularJson)) {
  throw new Error('Single-env policy violada. Quita fileReplacements de environment.ts en angular.json');
}

console.log('Single-env check OK: solo environment.ts y sin fileReplacements.');
