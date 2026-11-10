package com.admeve.zendegi

import android.app.Activity
import android.app.PendingIntent
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.net.Uri
import android.os.Bundle
import android.os.IBinder
import android.util.Base64
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import com.android.vending.billing.IInAppBillingService
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONObject
import java.security.KeyFactory
import java.security.Signature
import java.security.spec.X509EncodedKeySpec
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Myket in-app billing exposed to the web layer as "Store" (src/monetize.ts), with the same methods as the Bazaar
 * build's plugin. Myket's billing service speaks in-app billing version 3 (the AIDL in android/app/src/myket/aidl/):
 * its calls block, so they run on a worker thread; a purchase opens Myket's own payment screen and comes back with
 * the purchase and its signature, checked against the app's RSA key from Myket's panel.
 */
@CapacitorPlugin(name = "Store")
class StorePlugin : Plugin() {
    private companion object {
        const val API = 3
        const val INAPP = "inapp"
        const val MYKET = "ir.mservices.market"
        const val BIND = "ir.mservices.market.InAppBillingService.BIND"
        // Response codes of the billing service.
        const val OK = 0
        const val USER_CANCELED = 1
        const val ALREADY_OWNED = 7
    }

    @Volatile private var service: IInAppBillingService? = null
    private var connection: ServiceConnection? = null
    private var rsaKey = ""
    private val worker = Executors.newSingleThreadExecutor()
    private var buyLauncher: ActivityResultLauncher<IntentSenderRequest>? = null
    private var buying: PluginCall? = null

    override fun load() {
        // Registered while the activity is being created, as activity results require.
        buyLauncher = activity.registerForActivityResult(ActivityResultContracts.StartIntentSenderForResult()) { result ->
            purchaseResult(result.resultCode, result.data)
        }
    }

    @PluginMethod
    fun connect(call: PluginCall) {
        rsaKey = call.getString("rsaKey") ?: ""
        if (service != null) { call.resolve(JSObject().put("connected", true)); return }
        val answered = AtomicBoolean(false)
        val answer = { ok: Boolean -> if (answered.compareAndSet(false, true)) call.resolve(JSObject().put("connected", ok)) }
        val c = object : ServiceConnection {
            override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
                val s = IInAppBillingService.Stub.asInterface(binder)
                worker.execute {
                    val ok = try { s.isBillingSupported(API, context.packageName, INAPP) == OK } catch (e: Exception) { false }
                    if (ok) service = s
                    answer(ok)
                }
            }
            override fun onServiceDisconnected(name: ComponentName?) { service = null; answer(false) }
        }
        val bound = try {
            context.bindService(Intent(BIND).setPackage(MYKET), c, Context.BIND_AUTO_CREATE)
        } catch (e: Exception) { false }
        if (bound) connection = c else answer(false)
    }

    @PluginMethod
    fun getPrices(call: PluginCall) {
        val s = service ?: return call.reject("not connected")
        val skus = call.getArray("skus").toList<String>()
        worker.execute {
            try {
                val prices = JSObject()
                // At most 20 products a request.
                for (chunk in skus.chunked(20)) {
                    val query = Bundle().apply { putStringArrayList("ITEM_ID_LIST", ArrayList(chunk)) }
                    val r = s.getSkuDetails(API, context.packageName, INAPP, query)
                    val code = r.getInt("RESPONSE_CODE")
                    if (code != OK) throw IllegalStateException("sku details $code")
                    for (d in r.getStringArrayList("DETAILS_LIST") ?: arrayListOf()) {
                        val o = JSONObject(d)
                        prices.put(o.getString("productId"), o.getString("price"))
                    }
                }
                call.resolve(JSObject().put("prices", prices))
            } catch (e: Exception) { call.reject(e.message ?: "sku details failed") }
        }
    }

    @PluginMethod
    fun purchase(call: PluginCall) {
        val s = service ?: return call.reject("not connected")
        val sku = call.getString("sku") ?: return call.reject("sku missing")
        worker.execute {
            val r = try { s.getBuyIntent(API, context.packageName, sku, INAPP, "") } catch (e: Exception) { null }
            val code = r?.getInt("RESPONSE_CODE") ?: -1
            @Suppress("DEPRECATION")
            val pending = r?.getParcelable<PendingIntent>("BUY_INTENT")
            if (code == ALREADY_OWNED) return@execute notBought(call, "owned")
            if (code == USER_CANCELED) return@execute notBought(call, "canceled")
            if (code != OK || pending == null) return@execute notBought(call, "begin")
            activity.runOnUiThread {
                buying = call
                try {
                    buyLauncher!!.launch(IntentSenderRequest.Builder(pending.intentSender).build())
                } catch (e: Exception) {
                    buying = null
                    notBought(call, "begin")
                }
            }
        }
    }

    private fun notBought(call: PluginCall, reason: String) =
        call.resolve(JSObject().put("purchased", false).put("reason", reason))

    /** Back from Myket's payment screen. */
    private fun purchaseResult(resultCode: Int, data: Intent?) {
        val call = buying ?: return
        buying = null
        // The response code comes as an Int, or from some versions as a Long.
        @Suppress("DEPRECATION")
        val code = when (val v = data?.extras?.get("RESPONSE_CODE")) { null -> OK; is Int -> v; is Long -> v.toInt(); else -> -1 }
        val json = data?.getStringExtra("INAPP_PURCHASE_DATA")
        val sig = data?.getStringExtra("INAPP_DATA_SIGNATURE") ?: ""
        if (resultCode == Activity.RESULT_CANCELED || code == USER_CANCELED) return notBought(call, "canceled")
        if (code == ALREADY_OWNED) return notBought(call, "owned")
        if (resultCode != Activity.RESULT_OK || code != OK || json == null || !verified(json, sig)) return notBought(call, "failed")
        val token = JSONObject(json).optString("purchaseToken")
        call.resolve(JSObject().put("purchased", true).put("token", token))
    }

    @PluginMethod
    fun consume(call: PluginCall) {
        val s = service ?: return call.reject("not connected")
        val token = call.getString("token") ?: return call.reject("token missing")
        worker.execute {
            val code = try { s.consumePurchase(API, context.packageName, token) } catch (e: Exception) { -1 }
            if (code == OK) call.resolve() else call.reject("consume failed $code")
        }
    }

    @PluginMethod
    fun owned(call: PluginCall) {
        val s = service ?: return call.reject("not connected")
        worker.execute {
            try {
                val skus = JSArray()
                val tokens = JSObject()
                var more: String? = null
                do {
                    val r = s.getPurchases(API, context.packageName, INAPP, more)
                    val code = r.getInt("RESPONSE_CODE")
                    if (code != OK) throw IllegalStateException("purchases $code")
                    val data = r.getStringArrayList("INAPP_PURCHASE_DATA_LIST") ?: arrayListOf()
                    val sigs = r.getStringArrayList("INAPP_DATA_SIGNATURE_LIST") ?: arrayListOf()
                    for (i in data.indices) {
                        if (!verified(data[i], sigs.getOrNull(i) ?: "")) continue
                        val o = JSONObject(data[i])
                        val sku = o.optString("productId")
                        skus.put(sku)
                        tokens.put(sku, o.optString("purchaseToken"))
                    }
                    more = r.getString("INAPP_CONTINUATION_TOKEN")
                } while (!more.isNullOrEmpty())
                call.resolve(JSObject().put("skus", skus).put("tokens", tokens))
            } catch (e: Exception) { call.reject(e.message ?: "query failed") }
        }
    }

    /** A purchase signed by Myket with the key of this app (SHA1withRSA over the purchase's JSON). */
    private fun verified(data: String, signature: String): Boolean {
        if (rsaKey.isEmpty()) return false
        return try {
            val key = KeyFactory.getInstance("RSA").generatePublic(X509EncodedKeySpec(Base64.decode(rsaKey, Base64.DEFAULT)))
            val v = Signature.getInstance("SHA1withRSA")
            v.initVerify(key)
            v.update(data.toByteArray(Charsets.UTF_8))
            v.verify(Base64.decode(signature, Base64.DEFAULT))
        } catch (e: Exception) { false }
    }

    @PluginMethod
    fun rate(call: PluginCall) {
        val pkg = call.getString("packageName") ?: context.packageName
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("myket://comment?id=$pkg"))
            intent.setPackage(MYKET)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        } catch (e: Exception) {
            val web = Intent(Intent.ACTION_VIEW, Uri.parse("https://myket.ir/app/$pkg"))
            web.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(web)
        }
        call.resolve()
    }

    override fun handleOnDestroy() {
        connection?.let { try { context.unbindService(it) } catch (e: Exception) { /* already gone */ } }
        connection = null
        service = null
        worker.shutdown()
        super.handleOnDestroy()
    }
}
