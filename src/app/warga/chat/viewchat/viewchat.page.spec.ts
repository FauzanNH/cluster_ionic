import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ViewchatPage } from './viewchat.page';

describe('ViewchatPage', () => {
  let component: ViewchatPage;
  let fixture: ComponentFixture<ViewchatPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewchatPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
