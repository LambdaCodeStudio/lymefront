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
- **Framer Motion**: Animaciones fluidas

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
   PUBLIC_API_URL=http://179.43.118.101:3000/api
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
│   │   ├── shop/          # Componentes de la tienda
│   │   ├── common/        # Componentes comunes
│   │   └── ui/            # Componentes de UI reutilizables
│   ├── context/           # Contextos de React
│   ├── hooks/             # Hooks personalizados
│   ├── layouts/           # Layouts de Astro
│   ├── pages/             # Páginas de Astro
│   ├── providers/         # Providers de React
│   ├── services/          # Servicios (API, etc.)
│   ├── styles/            # Estilos globales
│   ├── types/             # Definiciones de tipos TypeScript
│   └── utils/             # Utilidades
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
- **Tienda online**: Interfaz para compra de productos
- **Carrito de compras**: Gestión de productos seleccionados
- **Notificaciones en tiempo real**: Alertas y mensajes del sistema
- **UI responsiva**: Diseño adaptable a móviles y escritorio
- **Paginación**: Presenta los datos en páginas para mejor navegación

## Mejoras recientes

### Navegación y UX
- **Redirección inteligente**: Redireccionamiento automático a /login cuando no hay sesión
- **Botón "Volver arriba"**: Aparece cuando el usuario desplaza la página
- **Paginación de contenido**: Todos los listados están paginados (10-20 elementos)
- **Validación de inputs**: Límites configurados para inputs numéricos

### Interfaz de usuario
- **Favicon personalizado**: Favicon con la marca Lyme
- **Alertas personalizadas**: Reemplazo de alertas del navegador por diálogos personalizados
- **Temporizador de notificaciones**: Las notificaciones tienen un temporizador para evitar duplicidades

### Tienda y carrito
- **Selección de cantidad**: Permite seleccionar cantidad directamente al agregar al carrito
- **Sin límite de unidades**: Eliminación del límite de 99 unidades en el carrito

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
- Agrupación por categorías y subcategorías
- Seguimiento de stock con alertas automáticas
- Gestión de productos con imágenes
- Paginación del listado de productos

### Tienda online

Interfaz para usuarios finales:
- Catálogo de productos con categorías
- Filtros de búsqueda
- Favoritos
- Carrito de compras
- Proceso de checkout simplificado

### Órdenes

Sistema de creación y seguimiento de órdenes:
- Asignación a usuarios
- Estados de progreso
- Registro de acciones
- Filtrado y búsqueda

## Flujos de trabajo

### Gestión de inventario bajo stock

Cuando un producto está por debajo del umbral mínimo (10 unidades):
1. Se muestra una alerta visual en la lista de productos
2. Se envía una notificación al administrador
3. El producto sigue disponible pero marcado como stock bajo

### Agregado de productos al carrito

El sistema permite al usuario:
1. Seleccionar la cantidad deseada directamente desde la tarjeta del producto
2. Ver un resumen del carrito actualizado
3. Continuar comprando o proceder al checkout
4. Recibir notificaciones de confirmación

## Integración con el backend

La comunicación con el backend se realiza a través de la API RESTful de LymeBack. Los principales endpoints utilizados son:

- `/auth`: Autenticación y gestión de usuarios
- `/cliente`: Gestión de clientes
- `/producto`: Control de inventario
- `/pedido`: Sistema de órdenes

## Solución de problemas comunes

### Error al agregar productos al carrito

Si tienes problemas al agregar productos:
- Verifica que el producto tenga stock disponible
- Asegúrate de que la cantidad seleccionada es válida
- Comprueba la conexión con el backend

### Notificaciones que no desaparecen

Si las notificaciones permanecen visibles:
- Recarga la página
- Verifica que no haya errores en la consola
- Confirma que el tiempo de visualización es adecuado

## Contribución

1. Fork del repositorio
2. Crear rama para nueva funcionalidad: `git checkout -b feature/nueva-funcionalidad`
3. Commit de cambios: `git commit -m 'Añadir nueva funcionalidad'`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

## Licencia

Este proyecto es propiedad intelectual de su creador. Todos los derechos reservados.