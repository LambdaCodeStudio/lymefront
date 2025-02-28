# LymeFront

## Descripción

LymeFront es la interfaz de usuario para el sistema de gestión Lyme, una aplicación para administrar servicios de limpieza y mantenimiento. Esta aplicación frontend está construida con tecnologías modernas como React, TypeScript, Astro y Tailwind CSS, proporcionando una experiencia de usuario fluida y responsiva.

## Tecnologías principales

- **Astro**: Framework para construir sitios web optimizados
- **React**: Biblioteca para construir interfaces de usuario
- **TypeScript**: Superset tipado de JavaScript
- **Tailwind CSS**: Framework CSS utilitario
- **Shadcn/UI**: Componentes de UI reutilizables
- **Lucide React**: Iconos modernos

## Requisitos previos

- Node.js 14 o superior
- npm 8 o superior
- LymeBack (API backend) en funcionamiento

## Instalación

1. Clonar el repositorio:
   ```bash
   git clone <url-del-repositorio>
   cd lymefront
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Crear archivo `.env` en la raíz del proyecto con las siguientes variables:
   ```
   PUBLIC_API_URL=http://localhost:4000/api
   PUBLIC_SITE_URL=http://localhost:3000
   ```

## Ejecución

### Modo desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

### Modo producción

```bash
npm run build
npm run preview
```

## Estructura del proyecto

```
lymefront/
├── public/                # Archivos estáticos
├── src/
│   ├── components/        # Componentes React
│   │   ├── admin/         # Componentes del panel administrativo
│   │   ├── auth/          # Componentes de autenticación
│   │   ├── dashboard/     # Componentes del dashboard
│   │   └── ui/            # Componentes de UI generales
│   ├── context/           # Contextos de React
│   ├── hooks/             # Hooks personalizados
│   ├── layouts/           # Layouts de Astro
│   ├── pages/             # Páginas de Astro
│   ├── services/          # Servicios (API, etc.)
│   ├── styles/            # Estilos globales
│   └── types/             # Definiciones de tipos TypeScript
├── astro.config.mjs       # Configuración de Astro
├── tailwind.config.mjs    # Configuración de Tailwind
└── tsconfig.json          # Configuración de TypeScript
```

## Características principales

- **Sistema de autenticación**: Inicio de sesión, registro y gestión de sesiones
- **Roles de usuario**: Admin, supervisor, básico y temporal
- **Panel administrativo**: Gestión de usuarios, clientes, inventario y órdenes
- **Gestión de clientes**: Crear, editar y eliminar clientes y servicios
- **Control de inventario**: Gestión de productos y categorías
- **Sistema de órdenes**: Creación y seguimiento de órdenes
- **Notificaciones en tiempo real**: Alertas y mensajes del sistema
- **UI responsiva**: Diseño adaptable a móviles y escritorio

## Módulos principales

### Autenticación

El sistema maneja diferentes roles de usuario:
- **Admin**: Acceso completo a todas las funcionalidades
- **Supervisor**: Administración de usuarios básicos y temporales
- **Básico**: Usuario estándar con acceso a clientes asignados
- **Temporal**: Usuario con acceso limitado por tiempo

### Clientes

Gestión de clientes y servicios:
- Creación de servicios (entidades padre)
- Creación de secciones dentro de cada servicio
- Asignación de usuarios a clientes específicos

### Inventario

Control de productos:
- Agrupación por categorías
- Seguimiento de stock
- Historial de movimientos

### Órdenes

Sistema de creación y seguimiento de órdenes:
- Asignación a usuarios
- Estados de progreso
- Registro de acciones

## Flujos de trabajo

### Gestión de clientes sin usuario asignado

Cuando un usuario es eliminado, los clientes que tenía asignados quedan en estado de "pendiente de reasignación". El administrador debe:

1. Acceder a la sección de clientes
2. Ver los clientes sin asignar (marcados con una bandera especial)
3. Editar cada cliente para asignarle un nuevo usuario responsable

## Integración con el backend

La comunicación con el backend se realiza a través de la API RESTful de LymeBack. Los principales endpoints utilizados son:

- `/auth`: Autenticación y gestión de usuarios
- `/cliente`: Gestión de clientes
- `/inventario`: Control de inventario
- `/orden`: Sistema de órdenes

## Solución de problemas comunes

### Error de inicio de sesión

Si tienes problemas para iniciar sesión:
- Verifica que el backend esté en funcionamiento
- Comprueba que las credenciales sean correctas
- Revisa la conexión a internet

### Clientes no se actualizan

Si los clientes no reflejan cambios recientes:
- Recarga la página
- Verifica que tengas permisos para ver esos clientes
- Comprueba en la consola si hay errores de API

## Contribución

1. Fork del repositorio
2. Crear rama para nueva funcionalidad: `git checkout -b feature/nueva-funcionalidad`
3. Commit de cambios: `git commit -m 'Añadir nueva funcionalidad'`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

## Licencia

Este proyecto es propiedad intelectual de su creador. Todos los derechos reservados.