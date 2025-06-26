import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SidikjariPage } from './sidikjari.page';

describe('SidikjariPage', () => {
  let component: SidikjariPage;
  let fixture: ComponentFixture<SidikjariPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SidikjariPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
