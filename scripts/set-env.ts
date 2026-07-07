import { writeFile, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { env } from 'process';
import * as dotenv from 'dotenv';

// Single-env policy: only load local front .env files.
const cwd = process.cwd();
const envCandidates = [
  resolve(cwd, '.env'),
  resolve(cwd, '.env.local'),
];

const loadedEnvFiles: string[] = [];
for (const file of envCandidates) {
  const result = dotenv.config({ path: file, override: false });
  if (!result.error) loadedEnvFiles.push(file);
}

const targetPath = './src/environments/environment.ts';

const defaultApiUrl = 'https://localhost:7248';
const production = (env['NODE_ENV'] || '').toLowerCase() === 'production';

let apiUrl = (env['API_URL'] || defaultApiUrl).trim();
let termsUrl = (env['TERMS_URL'] || `${apiUrl}/Terms.html`).trim();
const apiPrefix = (env['API_PREFIX'] || 'api').trim();
const apiDefaultVersion = (env['API_DEFAULT_VERSION'] || 'v1').trim();
const apiVersion = (env['API_VERSION'] || apiDefaultVersion).trim();

if (!env['API_URL']) {
  console.warn(`⚠️  API_URL no está definida. Usando valor por defecto para este modo: ${defaultApiUrl}`);
}


if (apiUrl && !apiUrl.startsWith('http')) {
  apiUrl = `https://${apiUrl}`;
}
// Asegura que no tenga slash al final para evitar dobles slashes en la concatenación
if (apiUrl.endsWith('/')) {
  apiUrl = apiUrl.slice(0, -1);
}

if (loadedEnvFiles.length > 0) {
  console.log(`📦 Env files cargados:\n- ${loadedEnvFiles.join('\n- ')}`);
} else {
  console.log('📦 No se encontró ningún archivo .env. Se usarán process.env y defaults.');
}

console.log(`🚀 Configurando API_URL: ${apiUrl}`);
console.log(`📜 Configurando TERMS_URL: ${termsUrl}`);
console.log(`🧭 Configurando API_PREFIX: ${apiPrefix}`);
console.log(`🏷️  Configurando API_VERSION: ${apiVersion}`);

const envConfigFile = `export const environment = {
  production: ${production},
  apiBaseUrl: '${apiUrl}',
  apiPrefix: '${apiPrefix}',
  apiDefaultVersion: '${apiDefaultVersion}',
  apiVersion: '${apiVersion}',
  apiUrl: '${apiUrl}/${apiPrefix}/${apiVersion}',
  termsUrl: '${termsUrl}'
};
`;

// Create directory if it doesn't exist
if (!existsSync('./src/environments')) {
  mkdirSync('./src/environments', { recursive: true });
}

writeFile(targetPath, envConfigFile, (err) => {
  if (err) {
    console.error(err);
    throw err;
  }
  console.log(`Angular environment file generated correctly at ${targetPath}`);
});
