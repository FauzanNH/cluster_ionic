import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SetpinPage } from './setpin.page';

describe('SetpinPage', () => {
  let component: SetpinPage;
  let fixture: ComponentFixture<SetpinPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SetpinPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
