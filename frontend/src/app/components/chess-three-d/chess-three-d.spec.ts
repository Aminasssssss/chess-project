import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChessThreeD } from './chess-three-d';

describe('ChessThreeD', () => {
  let component: ChessThreeD;
  let fixture: ComponentFixture<ChessThreeD>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChessThreeD]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChessThreeD);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
