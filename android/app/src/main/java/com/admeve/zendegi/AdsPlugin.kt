package com.admeve.zendegi

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import ir.tapsell.plus.AdRequestCallback
import ir.tapsell.plus.AdShowListener
import ir.tapsell.plus.TapsellPlus
import ir.tapsell.plus.TapsellPlusInitListener
import ir.tapsell.plus.model.AdNetworkError
import ir.tapsell.plus.model.AdNetworks
import ir.tapsell.plus.model.TapsellPlusAdModel
import ir.tapsell.plus.model.TapsellPlusErrorModel

/** Tapsell Plus rewarded video and interstitial ads. */
@CapacitorPlugin(name = "Ads")
class AdsPlugin : Plugin() {

    @PluginMethod
    fun init(call: PluginCall) {
        val appId = call.getString("appId") ?: return call.reject("appId missing")
        bridge.activity.runOnUiThread {
            TapsellPlus.initialize(activity, appId, object : TapsellPlusInitListener {
                override fun onInitializeSuccess(adNetworks: AdNetworks?) { call.resolve() }
                override fun onInitializeFailed(adNetworks: AdNetworks?, error: AdNetworkError?) { call.reject("init failed") }
            })
            TapsellPlus.setGDPRConsent(activity, true)
        }
    }

    @PluginMethod
    fun rewarded(call: PluginCall) {
        val zone = call.getString("zoneId") ?: return call.reject("zone missing")
        bridge.activity.runOnUiThread {
            TapsellPlus.requestRewardedVideoAd(activity, zone, object : AdRequestCallback() {
                override fun response(model: TapsellPlusAdModel) {
                    var rewarded = false
                    var done = false
                    val finish = { if (!done) { done = true; call.resolve(JSObject().put("rewarded", rewarded)) } }
                    activity.runOnUiThread {
                        TapsellPlus.showRewardedVideoAd(activity, model.responseId, object : AdShowListener() {
                            override fun onRewarded(m: TapsellPlusAdModel?) { rewarded = true }
                            override fun onClosed(m: TapsellPlusAdModel?) { finish() }
                            override fun onError(e: TapsellPlusErrorModel?) { finish() }
                        })
                    }
                }
                override fun error(message: String?) { call.resolve(JSObject().put("rewarded", false)) }
            })
        }
    }

    @PluginMethod
    fun interstitial(call: PluginCall) {
        val zone = call.getString("zoneId") ?: return call.reject("zone missing")
        bridge.activity.runOnUiThread {
            TapsellPlus.requestInterstitialAd(activity, zone, object : AdRequestCallback() {
                override fun response(model: TapsellPlusAdModel) {
                    var done = false
                    val finish = { shown: Boolean -> if (!done) { done = true; call.resolve(JSObject().put("shown", shown)) } }
                    activity.runOnUiThread {
                        TapsellPlus.showInterstitialAd(activity, model.responseId, object : AdShowListener() {
                            override fun onClosed(m: TapsellPlusAdModel?) { finish(true) }
                            override fun onError(e: TapsellPlusErrorModel?) { finish(false) }
                        })
                    }
                }
                override fun error(message: String?) { call.resolve(JSObject().put("shown", false)) }
            })
        }
    }
}
