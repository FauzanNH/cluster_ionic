import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KunjungantamuWargaPage } from './kunjungantamu-warga.page';

describe('KunjungantamuWargaPage', () => {
  let component: KunjungantamuWargaPage;
  let fixture: ComponentFixture<KunjungantamuWargaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(KunjungantamuWargaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
