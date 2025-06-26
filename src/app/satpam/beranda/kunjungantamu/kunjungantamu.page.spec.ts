import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KunjungantamuPage } from './kunjungantamu.page';

describe('KunjungantamuPage', () => {
  let component: KunjungantamuPage;
  let fixture: ComponentFixture<KunjungantamuPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(KunjungantamuPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
