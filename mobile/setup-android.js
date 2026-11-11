'use strict';
// Ajusta o projeto Android gerado pelo Capacitor. Pode rodar mais de uma vez.
const fs = require('fs');
const path = require('path');

// A leitura dos avisos dos bancos fica desligada: o Play Protect bloqueia APKs de fora da loja com esse acesso.
// Para gerar com ela: PRUMO_BANCOS=1.
const READER = process.env.PRUMO_BANCOS === '1';
const app = path.join(__dirname, 'android', 'app');
const main = path.join(app, 'src', 'main');
const res = path.join(main, 'res');

function edit(file, fn) { fs.writeFileSync(file, fn(fs.readFileSync(file, 'utf8'))); }

edit(path.join(main, 'AndroidManifest.xml'), (x) => {
  // Os dados financeiros não vão para o backup na nuvem do Google.
  x = x.replace(/android:allowBackup="true"/, 'android:allowBackup="false"');
  // O app não usa internet: sem esta permissão, o Android impede qualquer conexão.
  x = x.replace(/\s*<uses-permission android:name="android\.permission\.INTERNET"\s*\/>/, '');
  x = x.replace(/android:configChanges="/, 'android:windowSoftInputMode="adjustResize"\n            android:configChanges="').replace(/(android:windowSoftInputMode="adjustResize"\s+)+/, 'android:windowSoftInputMode="adjustResize"\n            ');
  // Serviço que recebe do Android os avisos dos bancos escolhidos.
  if (!READER) x = x.replace(/\s*<service android:name="\.BankNotificationListener"[\s\S]*?<\/service>/, '');
  if (READER && !x.includes('BankNotificationListener')) {
    x = x.replace('</application>', `    <service android:name=".BankNotificationListener" android:exported="true" android:label="Prumo: lançamentos dos bancos" android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE">
            <intent-filter><action android:name="android.service.notification.NotificationListenerService" /></intent-filter>
        </service>
    </application>`);
  }
  // Coloca o Prumo na lista do "Compartilhar" para arquivos de extrato. PDF e imagem ficam de fora: o app não lê.
  if (!x.includes('android.intent.action.SEND"')) {
    const types = ['text/*', 'application/csv', 'application/vnd.ms-excel', 'application/x-ofx', 'application/ofx', 'application/vnd.intu.qfx', 'application/xml', 'application/octet-stream'];
    x = x.replace('</intent-filter>', `</intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.SEND" />
                <category android:name="android.intent.category.DEFAULT" />
${types.map((t) => `                <data android:mimeType="${t}" />`).join('\n')}
            </intent-filter>`);
  }
  for (const p of ['RECORD_AUDIO', 'MODIFY_AUDIO_SETTINGS', 'POST_NOTIFICATIONS']) {
    if (!x.includes(`android.permission.${p}"`)) x = x.replace('</manifest>', `    <uses-permission android:name="android.permission.${p}" />\n</manifest>`);
  }
  return x;
});

// Mantém a barra de status do sistema separada do conteúdo do app.
edit(path.join(__dirname, 'android', 'variables.gradle'), (x) => x.replace(/targetSdkVersion = \d+/, 'targetSdkVersion = 34'));

edit(path.join(app, 'build.gradle'), (x) => {
  if (x.includes('prumoRelease')) return x;
  return x.replace(/buildTypes \{/, `signingConfigs {
        prumoRelease {
            def props = new Properties()
            def file = rootProject.file('keystore.properties')
            if (file.exists()) {
                file.withInputStream { props.load(it) }
                storeFile rootProject.file(props['storeFile'])
                storePassword props['password']
                keyAlias props['alias']
                keyPassword props['password']
            }
        }
    }
    buildTypes {`).replace(/(release \{\s*\n)/, '$1            signingConfig signingConfigs.prumoRelease\n');
});

// Cada APK gerado tem número de versão maior: o Android instala por cima do antigo e mantém os dados.
edit(path.join(app, 'build.gradle'), (x) => x.replace(/versionCode \d+/, `versionCode ${Math.floor((Date.now() - Date.UTC(2026, 0, 1)) / 60000)}`));

// Ícone do Prumo no lugar do padrão.
for (const dir of fs.readdirSync(res)) {
  if (dir.startsWith('mipmap-')) fs.rmSync(path.join(res, dir), { recursive: true, force: true });
}
const nodpi = path.join(res, 'mipmap-nodpi');
fs.mkdirSync(nodpi, { recursive: true });
for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) fs.copyFileSync(path.join(__dirname, '..', 'build', 'icon.png'), path.join(nodpi, name));
const { iconPNG } = require('../secretary.js');
fs.writeFileSync(path.join(nodpi, 'ic_launcher_foreground.png'), iconPNG(432, true));
const adaptive = path.join(res, 'mipmap-anydpi-v26');
fs.mkdirSync(adaptive, { recursive: true });
const ICON_XML = '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n';
for (const name of ['ic_launcher.xml', 'ic_launcher_round.xml']) fs.writeFileSync(path.join(adaptive, name), ICON_XML);
fs.writeFileSync(path.join(res, 'values', 'ic_launcher_background.xml'), '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#2563EB</color>\n</resources>\n');

// Leitura dos avisos dos bancos: guarda só avisos com valor, dos apps escolhidos, até o Prumo buscá-los.
const javaDir = path.join(main, 'java', 'com', 'prumo', 'app');
fs.writeFileSync(path.join(javaDir, 'BankStore.java'), `package com.prumo.app;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

final class BankStore {
    private static final String PREFS = "prumo_bancos", QUEUE = "fila", PACKAGES = "pacotes";
    private static final int MAX = 100;
    private static final long REPEAT_MS = 10 * 60 * 1000;

    private BankStore() {}

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static boolean allowed(Context c, String pkg) {
        // Só a versão de teste aceita avisos publicados pelo terminal do emulador.
        if ((c.getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0 && "com.android.shell".equals(pkg)) return true;
        return prefs(c).getStringSet(PACKAGES, Collections.emptySet()).contains(pkg);
    }

    static void setPackages(Context c, Set<String> packages) {
        prefs(c).edit().putStringSet(PACKAGES, new HashSet<>(packages)).apply();
    }

    private static JSONArray read(Context c) throws JSONException {
        return new JSONArray(prefs(c).getString(QUEUE, "[]"));
    }

    private static void write(Context c, JSONArray queue) {
        prefs(c).edit().putString(QUEUE, queue.toString()).apply();
    }

    static synchronized void add(Context c, String pkg, String title, String text, long when) throws JSONException {
        JSONArray queue = read(c);
        for (int i = 0; i < queue.length(); i++) {
            JSONObject o = queue.getJSONObject(i);
            if (pkg.equals(o.getString("pkg")) && text.equals(o.getString("text")) && Math.abs(when - o.getLong("ts")) < REPEAT_MS) return;
        }
        JSONObject item = new JSONObject();
        item.put("id", when + "-" + Integer.toHexString((pkg + text).hashCode()));
        item.put("pkg", pkg);
        item.put("title", title);
        item.put("text", text);
        item.put("ts", when);
        queue.put(item);
        while (queue.length() > MAX) queue.remove(0);
        write(c, queue);
    }

    static synchronized String list(Context c) {
        return prefs(c).getString(QUEUE, "[]");
    }

    static synchronized void remove(Context c, Set<String> ids) throws JSONException {
        JSONArray queue = read(c), kept = new JSONArray();
        for (int i = 0; i < queue.length(); i++) {
            JSONObject o = queue.getJSONObject(i);
            if (!ids.contains(o.getString("id"))) kept.put(o);
        }
        write(c, kept);
    }
}
`);
fs.writeFileSync(path.join(javaDir, 'BankNotificationListener.java'), `package com.prumo.app;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

public class BankNotificationListener extends NotificationListenerService {
    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            if (sbn.isOngoing() || !BankStore.allowed(this, sbn.getPackageName())) return;
            Notification n = sbn.getNotification();
            if ((n.flags & Notification.FLAG_GROUP_SUMMARY) != 0) return;
            Bundle extras = n.extras;
            CharSequence big = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
            CharSequence plain = extras.getCharSequence(Notification.EXTRA_TEXT);
            CharSequence title = extras.getCharSequence(Notification.EXTRA_TITLE);
            String text = big != null ? big.toString() : plain != null ? plain.toString() : "";
            String head = title != null ? title.toString() : "";
            if (!(head + " " + text).contains("R$")) return;
            BankStore.add(this, sbn.getPackageName(), head, text, sbn.getPostTime());
        } catch (Exception ignored) {
            // Um aviso com formato inesperado não pode derrubar o serviço.
        }
    }
}
`);
fs.writeFileSync(path.join(javaDir, 'BankNotificationsPlugin.java'), `package com.prumo.app;

import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.HashSet;
import java.util.Set;
import org.json.JSONException;

@CapacitorPlugin(name = "BankNotifications")
public class BankNotificationsPlugin extends Plugin {
    @PluginMethod
    public void status(PluginCall call) {
        JSObject result = new JSObject();
        result.put("access", NotificationManagerCompat.getEnabledListenerPackages(getContext()).contains(getContext().getPackageName()));
        call.resolve(result);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        getActivity().startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS));
        call.resolve();
    }

    @PluginMethod
    public void openAppInfo(PluginCall call) {
        getActivity().startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getContext().getPackageName())));
        call.resolve();
    }

    private Set<String> strings(PluginCall call, String key) throws JSONException {
        JSArray values = call.getArray(key);
        Set<String> out = new HashSet<>();
        if (values != null) for (int i = 0; i < values.length(); i++) out.add(values.getString(i));
        return out;
    }

    @PluginMethod
    public void setPackages(PluginCall call) {
        try {
            BankStore.setPackages(getContext(), strings(call, "packages"));
            call.resolve();
        } catch (JSONException e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void list(PluginCall call) {
        try {
            JSObject result = new JSObject();
            result.put("items", new JSArray(BankStore.list(getContext())));
            call.resolve(result);
        } catch (JSONException e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void ack(PluginCall call) {
        try {
            BankStore.remove(getContext(), strings(call, "ids"));
            call.resolve();
        } catch (JSONException e) {
            call.reject(e.getMessage());
        }
    }
}
`);

if (!READER) for (const name of ['BankStore.java', 'BankNotificationListener.java', 'BankNotificationsPlugin.java']) fs.rmSync(path.join(javaDir, name), { force: true });

// Diz à tela se o app voltou do segundo plano e entrega os arquivos recebidos pelo "Compartilhar".
fs.writeFileSync(path.join(javaDir, 'PrumoAppPlugin.java'), `package com.prumo.app;

import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

@CapacitorPlugin(name = "PrumoApp")
public class PrumoAppPlugin extends Plugin {
    private static final int MAX_BYTES = 5 * 1024 * 1024;
    private JSObject shared;

    @Override
    public void load() {
        receive(getActivity().getIntent());
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        receive(intent);
    }

    @PluginMethod
    public void warmStart(PluginCall call) {
        JSObject result = new JSObject();
        result.put("warm", MainActivity.warmStart);
        call.resolve(result);
    }

    @PluginMethod
    public synchronized void takeShared(PluginCall call) {
        call.resolve(shared == null ? new JSObject() : shared);
        shared = null;
    }

    private void receive(Intent intent) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) return;
        if ((intent.getFlags() & Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY) != 0) return;
        Uri uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        // Evita abrir o mesmo arquivo de novo se o Android recriar a tela.
        getActivity().setIntent(new Intent(Intent.ACTION_MAIN));
        new Thread(() -> {
            JSObject file = read(uri);
            synchronized (this) { shared = file; }
            notifyListeners("arrived", new JSObject());
        }).start();
    }

    private JSObject read(Uri uri) {
        JSObject out = new JSObject();
        // Só aceita o que outro app entregou com permissão; nunca um caminho direto de arquivo.
        if (uri == null || !"content".equals(uri.getScheme())) return out.put("error", "arquivo");
        try (InputStream in = getContext().getContentResolver().openInputStream(uri)) {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            byte[] chunk = new byte[8192];
            for (int n = in.read(chunk); n != -1; n = in.read(chunk)) {
                bytes.write(chunk, 0, n);
                if (bytes.size() > MAX_BYTES) return out.put("error", "grande");
            }
            out.put("name", nameOf(uri));
            out.put("data", Base64.encodeToString(bytes.toByteArray(), Base64.NO_WRAP));
        } catch (Exception e) {
            out.put("error", "leitura");
        }
        return out;
    }

    private String nameOf(Uri uri) {
        try (Cursor c = getContext().getContentResolver().query(uri, new String[] { OpenableColumns.DISPLAY_NAME }, null, null, null)) {
            if (c != null && c.moveToFirst() && c.getString(0) != null) return c.getString(0);
        } catch (Exception ignored) {
            // Alguns apps não informam o nome.
        }
        return "extrato.csv";
    }
}
`);

// Reserva o espaço da barra de status, da barra de navegação e do teclado.
fs.writeFileSync(path.join(main, 'java', 'com', 'prumo', 'app', 'MainActivity.java'), `package com.prumo.app;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static boolean started = false;
    static boolean warmStart = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // O app já estava aberto, ou o Android o fechou em segundo plano para liberar memória.
        warmStart = started || savedInstanceState != null;
        started = true;
        registerPlugin(PrumoAppPlugin.class);
${READER ? '        registerPlugin(BankNotificationsPlugin.class);\n' : ''}        super.onCreate(savedInstanceState);
        // Azul até a abertura aparecer, para não piscar branco; depois volta ao normal.
        WebView web = getBridge().getWebView();
        web.setBackgroundColor(0xFF3B76F6);
        getWindow().setStatusBarColor(0xFF3B76F6);
        web.postDelayed(() -> web.setBackgroundColor(0xFFFFFFFF), 3000);
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(android.R.id.content), (view, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout() | WindowInsetsCompat.Type.ime());
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return WindowInsetsCompat.CONSUMED;
        });
    }
}
`);

// Tela de abertura lisa, sem a logo padrão do Capacitor.
edit(path.join(res, 'values', 'styles.xml'), (x) => {
  const blue = x.replace(/@drawable\/splash|#eef1f7/g, '#3b76f6');
  if (blue.includes('windowSplashScreenBackground')) return blue;
  // No Android 12 ou mais novo, o próprio sistema mostra uma tela antes do app: fica no mesmo azul, sem ícone.
  return blue.replace(/(<style name="AppTheme\.NoActionBarLaunch"[^>]*>)/, '$1\n        <item name="windowSplashScreenBackground">#3b76f6</item>\n        <item name="windowSplashScreenAnimatedIcon">@android:color/transparent</item>');
});
console.log('android ajustado');
