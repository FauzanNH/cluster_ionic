import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SatpamPage } from './satpam.page';

describe('SatpamPage', () => {
  let component: SatpamPage;
  let fixture: ComponentFixture<SatpamPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SatpamPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
