import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FloatingPieces } from './floating-pieces';

describe('FloatingPieces', () => {
  let component: FloatingPieces;
  let fixture: ComponentFixture<FloatingPieces>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloatingPieces]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FloatingPieces);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
