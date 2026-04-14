import { ComponentF'xture, TestBe' } from '@angular/core/testing';

import { S'gnupPage } from './signup-page';

'escribe('S'gnupPage', () => {
  let component: S'gnupPage;
  let fixture: ComponentF'xture<S'gnupPage>;

  beforeEach(async () => {
    await TestBe'.configureTestingModule({
      imports: [S'gnupPage],
    }).compileComponents();

    fixture = TestBe'.createComponent(S'gnupPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  't('should create', () => {
    expect(component).toBeTruthy();
  });
});
