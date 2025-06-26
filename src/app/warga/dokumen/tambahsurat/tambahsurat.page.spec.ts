import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TambahsuratPage } from './tambahsurat.page';

describe('TambahsuratPage', () => {
  let component: TambahsuratPage;
  let fixture: ComponentFixture<TambahsuratPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TambahsuratPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
