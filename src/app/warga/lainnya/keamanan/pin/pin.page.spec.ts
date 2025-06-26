import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PinPage } from './pin.page';

describe('PinPage', () => {
  let component: PinPage;
  let fixture: ComponentFixture<PinPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PinPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
