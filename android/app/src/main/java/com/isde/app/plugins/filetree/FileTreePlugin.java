package com.isde.app.plugins.filetree;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.provider.DocumentsContract;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import androidx.activity.result.ActivityResult;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "FileTree")
public class FileTreePlugin extends Plugin {

    @PluginMethod
    public void list(PluginCall call) {
        String treeUriString = call.getString("treeUri");
        if (treeUriString == null || treeUriString.isEmpty()) {
            call.reject("treeUri es requerido");
            return;
        }

        try {
            Uri treeUri = Uri.parse(treeUriString);
            String treeDocId = DocumentsContract.getTreeDocumentId(treeUri);
            Uri rootDocUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, treeDocId);
            Uri childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(rootDocUri, treeDocId);

            JSArray result = new JSArray();
            ContentResolver resolver = getContext().getContentResolver();
            Cursor cursor = resolver.query(
                childrenUri,
                new String[] {
                    DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                    DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                    DocumentsContract.Document.COLUMN_MIME_TYPE,
                    DocumentsContract.Document.COLUMN_SIZE,
                },
                null,
                null,
                null);

            if (cursor != null) {
                try {
                    int idIndex = cursor.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_DOCUMENT_ID);
                    int nameIndex = cursor.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_DISPLAY_NAME);
                    int mimeIndex = cursor.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_MIME_TYPE);
                    int sizeIndex = cursor.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_SIZE);
                    while (cursor.moveToNext()) {
                        String docId = cursor.getString(idIndex);
                        String displayName = cursor.getString(nameIndex);
                        String mimeType = cursor.getString(mimeIndex);
                        long size = cursor.getLong(sizeIndex);
                        Uri childUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, docId);

                        JSObject entry = new JSObject();
                        entry.put("name", displayName);
                        entry.put("uri", childUri.toString());
                        entry.put("isDirectory", DocumentsContract.Document.MIME_TYPE_DIR.equals(mimeType));
                        entry.put("mimeType", mimeType);
                        entry.put("size", size);
                        result.put(entry);
                    }
                } finally {
                    cursor.close();
                }
            }
            call.resolve(new JSObject().put("files", result));
        } catch (Exception error) {
            call.reject("No se pudo listar el directorio: " + error.getMessage(), error);
        }
    }

    @PluginMethod
    public void check(PluginCall call) {
        String treeUriString = call.getString("treeUri");
        if (treeUriString == null || treeUriString.isEmpty()) {
            call.resolve(new JSObject().put("ok", false));
            return;
        }
        try {
            Uri treeUri = Uri.parse(treeUriString);
            String treeDocId = DocumentsContract.getTreeDocumentId(treeUri);
            Uri childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, treeDocId);
            ContentResolver resolver = getContext().getContentResolver();
            try (Cursor cursor = resolver.query(
                childrenUri,
                new String[] { DocumentsContract.Document.COLUMN_DOCUMENT_ID },
                null,
                null,
                null)) {
                if (cursor != null) {
                    cursor.moveToNext();
                }
            }
            call.resolve(new JSObject().put("ok", true));
        } catch (Exception error) {
            call.resolve(new JSObject().put("ok", false));
        }
    }

    @PluginMethod
    public void pickTree(PluginCall call) {
        String startDocumentUri = call.getString("startDocumentUri");
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(
            Intent.FLAG_GRANT_READ_URI_PERMISSION
                | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
                | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            && startDocumentUri != null
            && !startDocumentUri.isEmpty()) {
            intent.putExtra("android.intent.extra.INITIAL_URI", Uri.parse(startDocumentUri));
        }
        startActivityForResult(call, intent, "pickTreeResult");
    }

    @ActivityCallback
    private void pickTreeResult(PluginCall call, ActivityResult result) {
        try {
            if (call == null || result == null) {
                call.reject("pickDirectory canceled.");
                return;
            }
            if (result.getResultCode() != Activity.RESULT_OK) {
                call.reject("pickDirectory canceled.");
                return;
            }
            Intent data = result.getData();
            if (data == null || data.getData() == null) {
                call.reject("Ninguna carpeta seleccionada.");
                return;
            }
            Uri treeUri = data.getData();
            try {
                getContext().getContentResolver().takePersistableUriPermission(
                    treeUri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            } catch (RuntimeException error) {
                call.reject("No se pudo otorgar el permiso persistente: " + error.getMessage(), error);
                return;
            }
            call.resolve(new JSObject().put("treeUri", treeUri.toString()));
        } catch (Exception error) {
            call.reject("No se pudo pedir el permiso: " + error.getMessage(), error);
        }
    }

    @PluginMethod
    public void thumbnail(PluginCall call) {
        String uriString = call.getString("uri");
        if (uriString == null || uriString.isEmpty()) {
            call.reject("uri es requerido");
            return;
        }
        try {
            Uri uri = Uri.parse(uriString);
            String dataUrl = loadThumbnail(uri);
            if (dataUrl == null) {
                call.reject("No se pudo generar la miniatura");
                return;
            }
            call.resolve(new JSObject().put("data", dataUrl));
        } catch (Exception error) {
            call.reject("No se pudo generar la miniatura: " + error.getMessage(), error);
        }
    }

    private String loadThumbnail(Uri uri) {
        ContentResolver resolver = getContext().getContentResolver();
        BitmapFactory.Options bounds = new BitmapFactory.Options();
        bounds.inJustDecodeBounds = true;
        try (InputStream in = resolver.openInputStream(uri)) {
            BitmapFactory.decodeStream(in, null, bounds);
        } catch (Exception ignored) {
            return null;
        }
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
            return null;
        }
        int sample = 1;
        while (bounds.outWidth / sample > 192 || bounds.outHeight / sample > 192) {
            sample *= 2;
        }
        BitmapFactory.Options decode = new BitmapFactory.Options();
        decode.inSampleSize = sample;
        Bitmap bitmap;
        try (InputStream in = resolver.openInputStream(uri)) {
            bitmap = BitmapFactory.decodeStream(in, null, decode);
        } catch (Exception ignored) {
            return null;
        }
        if (bitmap == null) {
            return null;
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        boolean ok = bitmap.compress(Bitmap.CompressFormat.JPEG, 60, out);
        bitmap.recycle();
        if (!ok) {
            return null;
        }
        return "data:image/jpeg;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
    }

    @PluginMethod
    public void move(PluginCall call) {
        String sourceUriString = call.getString("sourceUri");
        String destTreeUriString = call.getString("destTreeUri");
        String destRelativePath = call.getString("destRelativePath");
        if (sourceUriString == null || sourceUriString.isEmpty()
            || destTreeUriString == null || destTreeUriString.isEmpty()
            || destRelativePath == null || destRelativePath.isEmpty()) {
            call.reject("sourceUri, destTreeUri y destRelativePath son requeridos");
            return;
        }

        try {
            Uri sourceUri = Uri.parse(sourceUriString);
            Uri destTreeUri = Uri.parse(destTreeUriString);
            ContentResolver resolver = getContext().getContentResolver();

            String mime = resolver.getType(sourceUri);
            if (mime == null) {
                mime = "application/octet-stream";
            }
            if (DocumentsContract.Document.MIME_TYPE_DIR.equals(mime)) {
                call.reject("No se soporta mover carpetas, solo archivos.");
                return;
            }

            String[] segments = destRelativePath.split("/");
            String fileName = segments[segments.length - 1];
            String treeDocId = DocumentsContract.getTreeDocumentId(destTreeUri);
            Uri parentDocUri = DocumentsContract.buildDocumentUriUsingTree(destTreeUri, treeDocId);
            String parentDocId = treeDocId;

            for (int i = 0; i < segments.length - 1; i++) {
                Uri existing = findChild(getContext().getContentResolver(), destTreeUri, parentDocId, segments[i]);
                if (existing != null) {
                    parentDocUri = existing;
                    parentDocId = DocumentsContract.getDocumentId(existing);
                    continue;
                }
                Uri created = DocumentsContract.createDocument(
                    getContext().getContentResolver(), parentDocUri,
                    DocumentsContract.Document.MIME_TYPE_DIR, segments[i]);
                if (created == null) {
                    call.reject("No se pudo crear el directorio '" + segments[i] + "' en el destino.");
                    return;
                }
                parentDocUri = created;
                parentDocId = DocumentsContract.getDocumentId(created);
            }

            Uri destDoc = null;
            String candidateName = fileName;
            int counter = 1;
            while (destDoc == null && counter <= 100) {
                destDoc = DocumentsContract.createDocument(resolver, parentDocUri, mime, candidateName);
                if (destDoc == null) {
                    String base = fileName;
                    String ext = "";
                    int dot = fileName.lastIndexOf('.');
                    if (dot > 0) {
                        base = fileName.substring(0, dot);
                        ext = fileName.substring(dot);
                    }
                    candidateName = base + " (" + counter + ")" + ext;
                    counter++;
                }
            }
            if (destDoc == null) {
                call.reject("No se pudo crear el archivo de destino para '" + fileName + "'.");
                return;
            }

            copyTo(sourceUri, destDoc);
        } catch (Exception error) {
            call.reject("No se pudo mover el archivo: " + error.getMessage(), error);
        }
    }

    private void copyTo(Uri source, Uri dest) throws Exception {
        ContentResolver resolver = getContext().getContentResolver();
        try (InputStream in = resolver.openInputStream(source);
             OutputStream out = resolver.openOutputStream(dest, "w")) {
            if (in == null || out == null) {
                throw new IllegalStateException("No se pudo abrir el origen o el destino.");
            }
            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }
        } catch (Throwable error) {
            resolver.delete(dest, null, null);
            throw error;
        }
        deleteSource(resolver, source);
    }

    private static void deleteSource(ContentResolver resolver, Uri source) throws Exception {
        boolean deleted = false;
        Throwable firstError = null;
        try {
            deleted = resolver.delete(source, null, null) > 0;
        } catch (Throwable error) {
            firstError = error;
        }
        if (!deleted) {
            try {
                DocumentsContract.deleteDocument(resolver, source);
                deleted = true;
            } catch (Throwable error) {
                if (firstError == null) {
                    firstError = error;
                }
            }
        }
        if (!deleted) {
            throw new Exception(
                "El archivo se copió pero no se pudo borrar el origen. Bórralo manualmente.",
                firstError);
        }
    }

    private static Uri findChild(ContentResolver resolver, Uri treeUri, String parentDocId, String displayName) {
        Uri childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, parentDocId);
        Cursor cursor = resolver.query(
            childrenUri,
            new String[] {
                DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                DocumentsContract.Document.COLUMN_DISPLAY_NAME,
            },
            null,
            null,
            null);
        if (cursor != null) {
            try {
                int idIndex = cursor.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_DOCUMENT_ID);
                int nameIndex = cursor.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_DISPLAY_NAME);
                while (cursor.moveToNext()) {
                    if (displayName.equals(cursor.getString(nameIndex))) {
                        return DocumentsContract.buildDocumentUriUsingTree(treeUri, cursor.getString(idIndex));
                    }
                }
            } finally {
                cursor.close();
            }
        }
        return null;
    }
}