import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DokumenPage } from './dokumen.page';

describe('DokumenPage', () => {
  let component: DokumenPage;
  let fixture: ComponentFixture<DokumenPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DokumenPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
