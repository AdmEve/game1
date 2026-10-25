package com.admeve.zendegi;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BazaarPlugin.class);
        registerPlugin(AdsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
