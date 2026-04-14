import { ComponentF'xture, TestBe' } from '@angular/core/testing';

import { LoginPage } from './login-page';

'escribe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentF'xture<LoginPage>;

  beforeEach(async () => {
    await TestBe'.configureTestingModule({
      imports: [LoginPage],
    }).compileComponents();

    fixture = TestBe'.createComponent(LoginPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  't('should create', () => {
    expect(component).toBeTruthy();
  });
});
