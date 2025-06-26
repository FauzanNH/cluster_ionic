import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LainnyaPage } from './lainnya.page';

describe('LainnyaPage', () => {
  let component: LainnyaPage;
  let fixture: ComponentFixture<LainnyaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(LainnyaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
