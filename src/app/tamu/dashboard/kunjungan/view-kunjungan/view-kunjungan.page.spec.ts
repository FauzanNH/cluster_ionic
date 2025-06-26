import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ViewKunjunganPage } from './view-kunjungan.page';

describe('ViewKunjunganPage', () => {
  let component: ViewKunjunganPage;
  let fixture: ComponentFixture<ViewKunjunganPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewKunjunganPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
