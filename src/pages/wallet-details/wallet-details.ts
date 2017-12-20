import { Component } from '@angular/core';
import { NavController, NavParams, Events } from 'ionic-angular';
import { Logger } from '@nsalaun/ng-logger';

//providers
import { WalletProvider } from '../../providers/wallet/wallet';
import { ProfileProvider } from '../../providers/profile/profile';
import { AddressBookProvider } from '../../providers/address-book/address-book';
import { BwcErrorProvider } from '../../providers/bwc-error/bwc-error';

//pages
import { TxDetailsPage } from '../../pages/tx-details/tx-details';

import * as _ from 'lodash';

const HISTORY_SHOW_LIMIT = 10;

@Component({
  selector: 'page-wallet-details',
  templateUrl: 'wallet-details.html'
})
export class WalletDetailsPage {
  private currentPage: number;

  public requiresMultipleSignatures: boolean;
  public wallet: any;
  public walletNotRegistered: boolean;
  public updateError: boolean;
  public updateStatusError: any;
  public updatingStatus: boolean;
  public updatingTxHistory: boolean;
  public updateTxHistoryError: boolean;
  public updatingTxHistoryProgress: number;
  public showNoTransactionsYetMsg: boolean;
  public addressbook: any;
  public txps: Array<any>;

  constructor(
    private navCtrl: NavController,
    private navParams: NavParams,
    private profileProvider: ProfileProvider,
    private walletProvider: WalletProvider,
    private addressbookProvider: AddressBookProvider,
    private bwcError: BwcErrorProvider,
    private events: Events,
    private logger: Logger
  ) {
    this.currentPage = 0;
    this.updatingTxHistoryProgress = 0;
    this.addressbook = {};
    this.txps = [];
    let clearCache = this.navParams.data.clearCache;
    this.wallet = this.profileProvider.getWallet(this.navParams.data.walletId);
    // Getting info from cache
    if (clearCache) {
      this.clearData();
    } else {
      this.wallet.status = this.wallet.cachedStatus;
      if (this.wallet.completeHistory) this.showHistory();
    }

    this.requiresMultipleSignatures = this.wallet.credentials.m > 1;

    this.addressbookProvider.list().then((ab) => {
      this.addressbook = ab;
    }).catch((err) => {
      this.logger.error(err);
    });
  }

  ionViewDidEnter() {
    this.updateAll();

    this.events.subscribe('bwsEvent', (walletId, type, n) => {
      if (walletId == this.wallet.id && type != 'NewAddress')
        this.updateAll();
    });
    this.events.subscribe('Local/TxAction', (walletId) => {
      if (walletId == this.wallet.id)
        this.updateAll();
    });
  }

  ionViewWillLeave() {
    this.events.unsubscribe('bwsEvent');
    this.events.unsubscribe('Local/TxAction');
  }

  private clearData() {
    this.wallet.history = [];
    this.currentPage = 0;
    this.wallet.status = null;
  }

  private showHistory() {
    this.wallet.history = this.wallet.completeHistory.slice(0, (this.currentPage + 1) * HISTORY_SHOW_LIMIT);
    this.currentPage++;
  }

  private setPendingTxps(txps: Array<any>) {

    /* Uncomment to test multiple outputs */

    // var txp = {
    //   message: 'test multi-output',
    //   fee: 1000,
    //   createdOn: new Date() / 1000,
    //   outputs: [],
    //   wallet: $scope.wallet
    // };
    //
    // function addOutput(n) {
    //   txp.outputs.push({
    //     amount: 600,
    //     toAddress: '2N8bhEwbKtMvR2jqMRcTCQqzHP6zXGToXcK',
    //     message: 'output #' + (Number(n) + 1)
    //   });
    // };
    // lodash.times(15, addOutput);
    // txps.push(txp);
    if (!txps) {
      this.txps = [];
    } else {
      this.txps = _.sortBy(txps, 'createdOn').reverse();
    }
  }

  private updateTxHistory() {
    this.updateTxHistoryError = false;
    this.wallet.updatingTxHistory = true;
    this.walletProvider.getTxHistory(this.wallet, {}).then((txHistory: any) => {
      this.wallet.updatingTxHistory = false;
      let hasTx = txHistory[0];
      if (hasTx) this.showNoTransactionsYetMsg = false;
      else this.showNoTransactionsYetMsg = true;
      this.wallet.completeHistory = txHistory;
      this.wallet.completeHistory.isValid = true;
      this.showHistory();
    }).catch((err) => {
      this.clearData();
      this.wallet.updatingTxHistory = false;
      this.updateTxHistoryError = true;
    });
  }

  private updateAll(force?) {
    this.updateStatus(force);
    this.updateTxHistory();
  }

  public toggleBalance() {
    this.profileProvider.toggleHideBalanceFlag(this.wallet.credentials.walletId);
  }

  public loadHistory(loading) {
    if (this.wallet.updatingTxHistory || this.wallet.history.length === this.wallet.completeHistory.length) {
      loading.complete();
      return;
    }
    setTimeout(() => {
      this.showHistory();
      loading.complete();
    }, 300);
  }

  private updateStatus(force?: boolean) {
    this.updatingStatus = true;
    this.updateStatusError = null;
    this.walletNotRegistered = false;

    this.walletProvider.getStatus(this.wallet, { force: !!force }).then((status: any) => {
      this.updatingStatus = false;
      this.setPendingTxps(status.pendingTxps);
      this.wallet.status = status;
    }).catch((err) => {
      this.updatingStatus = false;
      if (err === 'WALLET_NOT_REGISTERED') {
        this.walletNotRegistered = true;
      } else {
        this.updateStatusError = this.bwcError.msg(err, 'Could not update wallet'); // TODO: translate
      }
      this.wallet.status = null;
    });
  };

  public recreate() {
    this.walletProvider.recreate(this.wallet).then(() => {
      setTimeout(() => {
        this.walletProvider.startScan(this.wallet).then(() => {
          this.updateAll(true);
        });
      });
    });
  };

  public goToTxDetails(tx: any) {
    this.navCtrl.push(TxDetailsPage, { walletId: this.wallet.credentials.walletId, txid: tx.txid });
  }

}