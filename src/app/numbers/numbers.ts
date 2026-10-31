import { Component, AfterViewInit, ElementRef } from '@angular/core';

@Component({
  selector: 'app-numbers',
  imports: [],
  templateUrl: './numbers.html',
  styleUrl: './numbers.css',
})
export class Numbers implements AfterViewInit {
  constructor(private elementRef: ElementRef) {}

  ngAfterViewInit(): void {
    const section = this.elementRef.nativeElement.querySelector('.about-section');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            section.classList.add('show');
            observer.unobserve(section);
          }
        });
      },
      {
        threshold: 0.2,
      },
    );

    observer.observe(section);
  }
}
