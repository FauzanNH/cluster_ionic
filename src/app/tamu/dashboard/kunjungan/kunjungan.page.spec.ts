import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KunjunganPage } from './kunjungan.page';

describe('KunjunganPage', () => {
  let component: KunjunganPage;
  let fixture: ComponentFixture<KunjunganPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(KunjunganPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
