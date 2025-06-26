import { TestBed } from '@angular/core/testing';

import { DokumenService } from './dokumen.service';

describe('DokumenService', () => {
  let service: DokumenService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DokumenService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
