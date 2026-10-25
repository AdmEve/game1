package com.admeve.zendegi

import android.content.Intent
import android.net.Uri
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import ir.cafebazaar.poolakey.Connection
import ir.cafebazaar.poolakey.Payment
import ir.cafebazaar.poolakey.config.PaymentConfiguration
import ir.cafebazaar.poolakey.config.SecurityCheck
import ir.cafebazaar.poolakey.request.PurchaseRequest

/** Cafe Bazaar in-app billing (Poolakey) exposed to the web layer. */
@CapacitorPlugin(name = "Bazaar")
class BazaarPlugin : Plugin() {
    private var payment: Payment? = null
    private var connection: Connection? = null

    @PluginMethod
    fun connect(call: PluginCall) {
        val key = call.getString("rsaKey") ?: ""
        val config = PaymentConfiguration(
            localSecurityCheck = if (key.isEmpty()) SecurityCheck.Disable else SecurityCheck.Enable(rsaPublicKey = key)
        )
        val p = Payment(context = context, config = config)
        payment = p
        var answered = false
        connection = p.connect {
            connectionSucceed {
                if (!answered) { answered = true; call.resolve(JSObject().put("connected", true)) }
            }
            connectionFailed {
                if (!answered) { answered = true; call.resolve(JSObject().put("connected", false)) }
            }
            disconnected {
                if (!answered) { answered = true; call.resolve(JSObject().put("connected", false)) }
            }
        }
    }

    @PluginMethod
    fun getPrices(call: PluginCall) {
        val p = payment ?: return call.reject("not connected")
        val skus = call.getArray("skus").toList<String>()
        p.getInAppSkuDetails(skuIds = skus) {
            getSkuDetailsSucceed { list ->
                val prices = JSObject()
                for (d in list) prices.put(d.sku, d.price)
                call.resolve(JSObject().put("prices", prices))
            }
            getSkuDetailsFailed { call.reject(it.message ?: "sku details failed") }
        }
    }

    @PluginMethod
    fun purchase(call: PluginCall) {
        val p = payment ?: return call.reject("not connected")
        val sku = call.getString("sku") ?: return call.reject("sku missing")
        bridge.activity.runOnUiThread {
            p.purchaseProduct(
                registry = bridge.activity.activityResultRegistry,
                request = PurchaseRequest(productId = sku, payload = "")
            ) {
                failedToBeginFlow { call.resolve(JSObject().put("purchased", false)) }
                purchaseSucceed { info ->
                    call.resolve(JSObject().put("purchased", true).put("token", info.purchaseToken))
                }
                purchaseCanceled { call.resolve(JSObject().put("purchased", false)) }
                purchaseFailed { call.resolve(JSObject().put("purchased", false)) }
            }
        }
    }

    @PluginMethod
    fun consume(call: PluginCall) {
        val p = payment ?: return call.reject("not connected")
        val token = call.getString("token") ?: return call.reject("token missing")
        p.consumeProduct(token) {
            consumeSucceed { call.resolve() }
            consumeFailed { call.reject(it.message ?: "consume failed") }
        }
    }

    @PluginMethod
    fun owned(call: PluginCall) {
        val p = payment ?: return call.reject("not connected")
        p.getPurchasedProducts {
            querySucceed { items ->
                val skus = com.getcapacitor.JSArray()
                val tokens = JSObject()
                for (i in items) {
                    skus.put(i.productId)
                    tokens.put(i.productId, i.purchaseToken)
                }
                call.resolve(JSObject().put("skus", skus).put("tokens", tokens))
            }
            queryFailed { call.reject(it.message ?: "query failed") }
        }
    }

    @PluginMethod
    fun rate(call: PluginCall) {
        val pkg = call.getString("packageName") ?: context.packageName
        try {
            val intent = Intent(Intent.ACTION_EDIT, Uri.parse("bazaar://details?id=$pkg"))
            intent.setPackage("com.farsitel.bazaar")
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        } catch (e: Exception) {
            val web = Intent(Intent.ACTION_VIEW, Uri.parse("https://cafebazaar.ir/app/$pkg"))
            web.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(web)
        }
        call.resolve()
    }

    override fun handleOnDestroy() {
        connection?.disconnect()
        super.handleOnDestroy()
    }
}
