import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TamuPage } from './tamu.page';

describe('TamuPage', () => {
  let component: TamuPage;
  let fixture: ComponentFixture<TamuPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TamuPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
