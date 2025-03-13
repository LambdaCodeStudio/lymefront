// scripts/check-deps.js
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

console.log('Verificando dependencias antes de construir...');

// Intentar importar las dependencias críticas
const checkDependency = async (packageName) => {
  try {
    await import(packageName);
    return true;
  } catch (error) {
    return false;
  }
};

const installMissingDependencies = async () => {
  const zwitchAvailable = await checkDependency('zwitch');
  const hastUtilRawAvailable = await checkDependency('hast-util-raw');
  
  if (!zwitchAvailable || !hastUtilRawAvailable) {
    console.log('Instalando dependencias faltantes...');
    try {
      execSync('npm install zwitch hast-util-raw --no-save', { stdio: 'inherit' });
      console.log('✅ Dependencias instaladas correctamente');
    } catch (error) {
      console.error('❌ Error al instalar dependencias:', error.message);
      process.exit(1);
    }
  } else {
    console.log('✅ Todas las dependencias críticas están disponibles');
  }
};

installMissingDependencies().catch(error => {
  console.error('❌ Error inesperado:', error);
  process.exit(1);
});