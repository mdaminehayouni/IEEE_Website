import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-welcome-animation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="welcome-animation"
      [class.reversing]="isReversing"
      [class.ieee]="currentText === 'ieee'"
    >
      <span
        *ngFor="
          let letter of currentText === 'welcome' ? welcomeLetters : ieeeLetters;
          let i = index
        "
        [style.animationDelay.ms]="i * 80"
      >
        {{ letter }}
      </span>
    </div>
  `,
  styles: [
    `
      .welcome-animation {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 0.1em;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .welcome-animation span {
        display: inline-block;
        opacity: 0;
        transform: translateY(64px);
        animation: fadeIn 0.5s ease forwards;
      }

      .welcome-animation.reversing span {
        opacity: 1;
        transform: translateY(0);
        animation-delay: 0ms;
        animation: fadeOut 0.5s ease forwards;
      }

      .welcome-animation.ieee span {
        transform: translateY(0);
        animation-name: ieeeFadeIn;
      }

      @keyframes fadeIn {
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes ieeeFadeIn {
        to {
          opacity: 1;
        }
      }

      @keyframes fadeOut {
        from {
          opacity: 1;
          transform: translateY(0);
        }

        to {
          opacity: 0;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class WelcomeAnimationComponent implements OnInit {
  currentText: 'welcome' | 'ieee' = 'welcome';
  isReversing = false;

  welcomeLetters = 'WELCOME'.split('');
  ieeeLetters = 'IEEE     ISETR'.split('');

  ngOnInit(): void {
    // Wait for WELCOME to finish appearing
    setTimeout(() => {
      this.isReversing = true;

      // Wait for reverse animation to finish
      setTimeout(() => {
        this.currentText = 'ieee';
        this.isReversing = false;
      }, 1000);
    }, 1800);
  }
}
