import { Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'acs-footer',
  standalone: true,
  templateUrl: './Footer.component.html',
  styleUrl: './Footer.component.scss',
  encapsulation: ViewEncapsulation.Emulated
})
export class FooterComponent {
  readonly poweredByLogoUrl = 'assets/images/companylog.png';

  /** App shell footer only — login keeps the shorter `application.copyright` from app config. */
  readonly copyrightText =
    'Copyright © 2026 TechTiera. All rights reserved.';
}
