import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChessPiece } from './chess-piece';

describe('ChessPiece', () => {
  let component: ChessPiece;
  let fixture: ComponentFixture<ChessPiece>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChessPiece]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChessPiece);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
