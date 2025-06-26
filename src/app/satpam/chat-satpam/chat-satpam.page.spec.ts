import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatSatpamPage } from './chat-satpam.page';

describe('ChatSatpamPage', () => {
  let component: ChatSatpamPage;
  let fixture: ComponentFixture<ChatSatpamPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ChatSatpamPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
