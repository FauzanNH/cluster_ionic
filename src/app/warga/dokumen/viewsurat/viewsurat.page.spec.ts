import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ViewsuratPage } from './viewsurat.page';

describe('ViewsuratPage', () => {
  let component: ViewsuratPage;
  let fixture: ComponentFixture<ViewsuratPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewsuratPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
