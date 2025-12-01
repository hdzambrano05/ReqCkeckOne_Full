import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent {

  constructor(private router: Router) { }

  scrollToSection(id: string) {
    const element = document.querySelector(`#${id}`);
    element?.scrollIntoView({ behavior: 'smooth' });
  }

  /**
   * Simulación de envío de mensaje (ejemplo).
   * @param event El evento de formulario.
   */
  sendMessage(event: Event) {
    event.preventDefault();
    alert('Mensaje enviado. ¡Gracias por contactar a ReqCheckOne!');
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}