import { defineMiddleware } from 'astro/middleware';

export const authMiddleware = defineMiddleware(async ({ request, redirect }) => {
  const token = localStorage.getItem('token');
  const protectedPaths = ['/dashboard', '/profile', '/settings'];
  const publicPaths = ['/login', '/register'];
  
  const url = new URL(request.url);
  const isProtectedPath = protectedPaths.some(path => url.pathname.startsWith(path));
  const isPublicPath = publicPaths.some(path => url.pathname.startsWith(path));

  if (isProtectedPath && !token) {
    return redirect('/login');
  }

  if (isPublicPath && token) {
    return redirect('/dashboard');
  }
});