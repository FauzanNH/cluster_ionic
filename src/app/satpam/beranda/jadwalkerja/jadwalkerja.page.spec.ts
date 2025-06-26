import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JadwalkerjaPage } from './jadwalkerja.page';

describe('JadwalkerjaPage', () => {
  let component: JadwalkerjaPage;
  let fixture: ComponentFixture<JadwalkerjaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(JadwalkerjaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
