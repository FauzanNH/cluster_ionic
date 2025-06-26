import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GuidePage } from './guide.page';

describe('GuidePage', () => {
  let component: GuidePage;
  let fixture: ComponentFixture<GuidePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(GuidePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
