import { Routes } from '@angular/router';
import { PageName, PAGE_PATHS, SiteLocale } from './core/locale-routing';

function localizedRoutes(locale: SiteLocale): Routes {
  const paths = PAGE_PATHS[locale];
  return [
    { path: paths.home, pathMatch: 'full', loadComponent: () => import('./pages/home.page').then(m => m.HomePage) },
    { path: paths.journey, loadComponent: () => import('./pages/journey.page').then(m => m.JourneyPage) },
    { path: paths.projects, loadComponent: () => import('./pages/projects.page').then(m => m.ProjectsPage) },
    { path: paths.skills, loadComponent: () => import('./pages/skills.page').then(m => m.SkillsPage) },
    { path: paths.contact, loadComponent: () => import('./pages/contact.page').then(m => m.ContactPage) },
    { path: paths.about, loadComponent: () => import('./pages/about.page').then(m => m.AboutPage) },
    { path: '**', loadComponent: () => import('./pages/not-found.page').then(m => m.NotFoundPage) },
  ];
}

export const routes: Routes = [
  { path: 'fr', children: localizedRoutes('fr') },
  { path: 'en', children: localizedRoutes('en') },
  { path: '', pathMatch: 'full', redirectTo: '/fr' },
  ...(Object.keys(PAGE_PATHS.fr) as PageName[]).filter(page => page !== 'home').map(page => ({
    path: PAGE_PATHS.fr[page], pathMatch: 'full' as const, redirectTo: `/fr/${PAGE_PATHS.fr[page]}`,
  })),
  { path: '**', loadComponent: () => import('./pages/not-found.page').then(m => m.NotFoundPage) },
];
