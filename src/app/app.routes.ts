import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home';
import { SurveyDetailComponent } from './features/survey-detail/survey-detail';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'survey/:id', component: SurveyDetailComponent },
  { path: '**', redirectTo: '' },
];
