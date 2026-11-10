package com.admeve.zendegi;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // The store's billing: Cafe Bazaar's or Myket's, by build flavor (android/app/src/<store>/StorePlugin.kt).
        registerPlugin(StorePlugin.class);
        registerPlugin(AdsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
