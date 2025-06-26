import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UbahPinPage } from './ubah-pin.page';

describe('UbahPinPage', () => {
  let component: UbahPinPage;
  let fixture: ComponentFixture<UbahPinPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(UbahPinPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
