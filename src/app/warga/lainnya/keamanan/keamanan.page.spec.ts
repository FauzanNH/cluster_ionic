import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KeamananPage } from './keamanan.page';

describe('KeamananPage', () => {
  let component: KeamananPage;
  let fixture: ComponentFixture<KeamananPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(KeamananPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
