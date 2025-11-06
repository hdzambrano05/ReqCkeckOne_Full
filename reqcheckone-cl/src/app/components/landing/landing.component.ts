import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxParticlesModule } from '@tsparticles/angular';
import type { ISourceOptions } from '@tsparticles/engine';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, NgxParticlesModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent {
  id = 'tsparticles';

  // Opciones de partículas actualizadas
  particlesOptions: ISourceOptions = {
    background: { color: { value: '#0d47a1' } },
    fpsLimit: 120,
    interactivity: {
      events: {
        onClick: { enable: true, mode: 'push' },
        onHover: { enable: true, mode: 'repulse' },
      },
      modes: {
        push: { quantity: 4 },
        repulse: { distance: 100, duration: 0.4 }
      }
    },
    particles: {
      color: { value: '#ffffff' },
      links: {
        color: '#ffffff',
        distance: 150,
        enable: true,
        opacity: 0.5,
        width: 1
      },
      collisions: { enable: true },
      move: {
        direction: 'none',
        enable: true,
        outModes: { default: 'bounce' },
        random: false,
        speed: 2,
        straight: false
      },
      number: {
        value: 80,             // Cantidad de partículas
        density: { enable: true } // Solo enable, area no se usa más
      },
      opacity: { value: 0.5 },
      shape: { type: 'circle' },
      size: { value: { min: 1, max: 5 } }
    },
    detectRetina: true
  };

  // Scroll suave a secciones
  scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  // Simulación de envío de mensaje
  sendMessage(event: Event) {
    event.preventDefault();
    alert('Mensaje enviado. ¡Gracias por contactar a ReqCheckOne!');
  }
}
