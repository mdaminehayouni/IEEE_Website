import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Chapters } from './chapters';

describe('Chapters', () => {
  let component: Chapters;
  let fixture: ComponentFixture<Chapters>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Chapters]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Chapters);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
