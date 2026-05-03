import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Coach } from './coach';

describe('Coach', () => {
  let component: Coach;
  let fixture: ComponentFixture<Coach>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Coach]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Coach);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
