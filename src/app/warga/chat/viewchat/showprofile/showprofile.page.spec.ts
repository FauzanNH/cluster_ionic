import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShowprofilePage } from './showprofile.page';

describe('ShowprofilePage', () => {
  let component: ShowprofilePage;
  let fixture: ComponentFixture<ShowprofilePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ShowprofilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
