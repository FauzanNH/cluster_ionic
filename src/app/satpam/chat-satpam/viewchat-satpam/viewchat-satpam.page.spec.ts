import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ViewchatSatpamPage } from './viewchat-satpam.page';

describe('ViewchatSatpamPage', () => {
  let component: ViewchatSatpamPage;
  let fixture: ComponentFixture<ViewchatSatpamPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewchatSatpamPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
