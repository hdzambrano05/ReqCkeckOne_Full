import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent {
  // No hay lógica de partículas en este diseño
  // id = 'tsparticles'; 
  // particlesOptions: any; // Puedes eliminar estas propiedades si no las usas.

  /**
   * Scroll suave a secciones utilizando querySelector para mayor compatibilidad.
   * @param id El ID del elemento al que desplazarse.
   */
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
}