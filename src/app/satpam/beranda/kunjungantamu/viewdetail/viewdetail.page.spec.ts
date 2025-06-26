import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ViewdetailPage } from './viewdetail.page';

describe('ViewdetailPage', () => {
  let component: ViewdetailPage;
  let fixture: ComponentFixture<ViewdetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewdetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
