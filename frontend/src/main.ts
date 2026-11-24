import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  standalone: true,
  template: '<h1>Full Stack Portfolio</h1><p>Angular is running.</p>',
})
class AppComponent {}

bootstrapApplication(AppComponent).catch(console.error);
