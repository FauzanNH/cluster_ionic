import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TambahKunjunganPage } from './tambah-kunjungan.page';

describe('TambahKunjunganPage', () => {
  let component: TambahKunjunganPage;
  let fixture: ComponentFixture<TambahKunjunganPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TambahKunjunganPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
