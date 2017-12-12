import { Injectable } from '@angular/core';

import { ConfigProvider } from '../config/config';
import { ProfileProvider } from '../profile/profile';
import { WalletProvider } from '../wallet/wallet';

import * as _ from "lodash";

@Injectable()
export class EmailNotificationsProvider {

  constructor(
    private configProvider: ConfigProvider,
    private profileProvider: ProfileProvider,
    private walletProvider: WalletProvider
  ) {
    console.log('Hello EmailNotificationsProvider Provider');
  }

  public updateEmail(opts: any) {
    opts = opts || {};
    if (!opts.email) return;

    let wallets = this.profileProvider.getWallets();

    this.configProvider.set({
      emailFor: null, // Backward compatibility
      emailNotifications: {
        enabled: opts.enabled,
        email: opts.enabled ? opts.email : null
      }
    });

    this.walletProvider.updateRemotePreferences(wallets);
  };

  public getEmailIfEnabled(config) {
    config = config || this.configProvider.get();

    if (config.emailNotifications) {
      if (!config.emailNotifications.enabled) return;

      if (config.emailNotifications.email)
        return config.emailNotifications.email;
    }

    if (_.isEmpty(config.emailFor)) return;

    // Backward compatibility
    let emails = _.values(config.emailFor);
    for(var i = 0; i < emails.length; i++) {
      if (emails[i] !== null && typeof emails[i] !== 'undefined') {
        return emails[i];
      }
    }
  };

  public init() {
    let config = this.configProvider.get();

    if (config.emailNotifications && config.emailNotifications.enabled) {

      // If email already set
      if (config.emailNotifications.email) return;

      var currentEmail = this.getEmailIfEnabled(config);

      this.updateEmail({
        enabled: currentEmail ? true : false,
        email: currentEmail
      });
    }
  };

}