import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PengaduanPage } from './pengaduan.page';

describe('PengaduanPage', () => {
  let component: PengaduanPage;
  let fixture: ComponentFixture<PengaduanPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PengaduanPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
