import { TestBed } from '@angular/core/testing';

import { AiCoach } from './ai-coach';

describe('AiCoach', () => {
  let service: AiCoach;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AiCoach);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
