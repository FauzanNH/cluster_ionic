import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TambahAkunTamuPage } from './tambah-akun-tamu.page';

describe('TambahAkunTamuPage', () => {
  let component: TambahAkunTamuPage;
  let fixture: ComponentFixture<TambahAkunTamuPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TambahAkunTamuPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
