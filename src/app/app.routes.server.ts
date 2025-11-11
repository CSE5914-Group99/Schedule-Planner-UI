import { RenderMode, ServerRoute } from '@angular/ssr';

// Explicitly prerender only known static routes. Parameterized routes like
// 'schedule/edit/:id' are intentionally omitted because they require
// getPrerenderParams to be provided for each dynamic value.
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'login', renderMode: RenderMode.Prerender },
  { path: 'landing', renderMode: RenderMode.Prerender },
  { path: 'schedules', renderMode: RenderMode.Prerender },
  { path: 'schedule/new', renderMode: RenderMode.Prerender },
  // dynamic edit route rendered at request time (no prerender params needed)
  { path: 'schedule/edit/:id', renderMode: RenderMode.Server },
  // fallback wildcard - server render
  { path: '**', renderMode: RenderMode.Server },
];
