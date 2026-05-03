import { TestBed } from '@angular/core/testing';

import { Stockfish } from './stockfish';

describe('Stockfish', () => {
  let service: Stockfish;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Stockfish);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
