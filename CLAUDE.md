# Lyme Frontend Code Reference

## Build Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Code Style Guidelines
- Use React functional components with TypeScript
- Import paths: Use absolute imports with '@/' prefix
- Component organization: Group related components in dedicated folders
- TypeScript: Define interfaces for props and data models in /types
- Error handling: Use try/catch with specific error messages
- State management: Use React hooks (useState, useEffect)
- API calls: Use axios through the centralized api service
- CSS: Use Tailwind classes with component composition

## Naming Conventions
- Components: PascalCase (LoginForm.tsx)
- Hooks: camelCase with 'use' prefix (useAuth.ts)
- Interfaces: PascalCase, prefixed with 'I' or descriptive (CreateUserDTO)
- Files: Component files match component name
- Services: camelCase with 'Service' suffix