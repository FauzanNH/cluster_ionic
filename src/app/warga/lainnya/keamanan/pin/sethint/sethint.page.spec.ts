import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SethintPage } from './sethint.page';

describe('SethintPage', () => {
  let component: SethintPage;
  let fixture: ComponentFixture<SethintPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SethintPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
