import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { Navbar } from './components/navbar/navbar';
import { WelcomeAnimationComponent } from './welcome-animation/welcome-animation';
import { Events } from './events/events';
import { Numbers } from './numbers/numbers';
import { Chapters } from './chapters/chapters';
import { ScrollFadeInDirective } from './directives/scroll-fade-in.directive';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
  imports: [Navbar, WelcomeAnimationComponent, Events, Numbers, Chapters, ScrollFadeInDirective],
})
export class App implements AfterViewInit {
  @ViewChild('networkCanvas')
  canvas!: ElementRef<HTMLCanvasElement>;

  ngAfterViewInit(): void {
    const canvas = this.canvas.nativeElement;
    const ctx = canvas.getContext('2d')!;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const particles: Particle[] = [];

    const particleCount = 150;
    const mouse = {
      x: width / 2,
      y: height / 2,
      active: false,
    };

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,

        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,

        size: Math.random() * 1.5 + 0.4,
      });
    }

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    window.addEventListener('pointermove', (event) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      mouse.active = true;
    });

    window.addEventListener('pointerleave', () => {
      mouse.active = false;
    });

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Move particles
      for (const particle of particles) {
        if (mouse.active) {
          const dx = particle.x - mouse.x;
          const dy = particle.y - mouse.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const radius = 140;

          if (distance < radius) {
            const force = (1 - distance / radius) * 0.8;
            particle.x += (dx / distance || 0) * force * 8;
            particle.y += (dy / distance || 0) * force * 8;
          }
        }

        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around screen
        if (particle.x < 0) particle.x = width;
        if (particle.x > width) particle.x = 0;

        if (particle.y < 0) particle.y = height;
        if (particle.y > height) particle.y = 0;
      }

      // Connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];

          const dx = a.x - b.x;
          const dy = a.y - b.y;

          const distance = Math.sqrt(dx * dx + dy * dy);

          const maxDistance = 140;

          if (distance < maxDistance) {
            const opacity = 1 - distance / maxDistance;

            ctx.beginPath();

            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);

            ctx.strokeStyle = `rgba(96, 165, 250, ${opacity * 0.25})`;

            ctx.lineWidth = 0.7;

            ctx.stroke();
          }
        }
      }

      // Particles
      for (const particle of particles) {
        ctx.beginPath();

        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);

        ctx.fillStyle = 'rgba(147, 197, 253, 0.8)';

        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';

        ctx.fill();
      }

      ctx.shadowBlur = 0;

      requestAnimationFrame(animate);
    };

    animate();
  }
}

interface Particle {
  x: number;
  y: number;

  vx: number;
  vy: number;

  size: number;
}
