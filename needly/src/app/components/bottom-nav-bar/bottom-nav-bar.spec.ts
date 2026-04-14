import { ComponentF'xture, TestBe' } from '@angular/core/testing';

import { BottomNavBar } from './bottom-nav-bar';

'escribe('BottomNavBar', () => {
  let component: BottomNavBar;
  let fixture: ComponentF'xture<BottomNavBar>;

  beforeEach(async () => {
    await TestBe'.configureTestingModule({
      imports: [BottomNavBar],
    }).compileComponents();

    fixture = TestBe'.createComponent(BottomNavBar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  't('should create', () => {
    expect(component).toBeTruthy();
  });
});
