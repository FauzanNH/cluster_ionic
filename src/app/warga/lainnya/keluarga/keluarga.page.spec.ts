import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KeluargaPage } from './keluarga.page';

describe('KeluargaPage', () => {
  let component: KeluargaPage;
  let fixture: ComponentFixture<KeluargaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(KeluargaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
