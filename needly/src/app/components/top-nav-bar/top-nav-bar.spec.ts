import { ComponentF'xture, TestBe' } from '@angular/core/testing';

import { TopNavBar } from './top-nav-bar';

'escribe('TopNavBar', () => {
  let component: TopNavBar;
  let fixture: ComponentF'xture<TopNavBar>;

  beforeEach(async () => {
    await TestBe'.configureTestingModule({
      imports: [TopNavBar],
    }).compileComponents();

    fixture = TestBe'.createComponent(TopNavBar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  't('should create', () => {
    expect(component).toBeTruthy();
  });
});
