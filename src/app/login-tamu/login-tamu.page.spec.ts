import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginTamuPage } from './login-tamu.page';

describe('LoginTamuPage', () => {
  let component: LoginTamuPage;
  let fixture: ComponentFixture<LoginTamuPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginTamuPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
