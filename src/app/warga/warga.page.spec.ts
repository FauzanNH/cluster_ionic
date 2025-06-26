import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WargaPage } from './warga.page';

describe('WargaPage', () => {
  let component: WargaPage;
  let fixture: ComponentFixture<WargaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(WargaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
