/*
 * In-app billing service, version 3: the interface Myket's billing service implements (bound with the intent
 * ir.mservices.market.InAppBillingService.BIND in package ir.mservices.market). The order of the methods is the
 * protocol (each one's transaction number), so it must stay as it is.
 */
package com.android.vending.billing;

import android.os.Bundle;

interface IInAppBillingService {
    int isBillingSupported(int apiVersion, String packageName, String type);
    Bundle getSkuDetails(int apiVersion, String packageName, String type, in Bundle skusBundle);
    Bundle getBuyIntent(int apiVersion, String packageName, String sku, String type, String developerPayload);
    Bundle getPurchases(int apiVersion, String packageName, String type, String continuationToken);
    int consumePurchase(int apiVersion, String packageName, String purchaseToken);
}
