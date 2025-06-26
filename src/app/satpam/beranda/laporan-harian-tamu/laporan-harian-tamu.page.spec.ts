import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LaporanHarianTamuPage } from './laporan-harian-tamu.page';

describe('LaporanHarianTamuPage', () => {
  let component: LaporanHarianTamuPage;
  let fixture: ComponentFixture<LaporanHarianTamuPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(LaporanHarianTamuPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
