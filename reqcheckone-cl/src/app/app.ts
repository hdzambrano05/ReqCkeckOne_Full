import { Component, signal } from '@angular/core';
import { AuthService } from './services/auth';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  isSidebarOpen = true;
  protected readonly title = signal('reqcheckone-cl');

  constructor(public authService: AuthService) {}
}
