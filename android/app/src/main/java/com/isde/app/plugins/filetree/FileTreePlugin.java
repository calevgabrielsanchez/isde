package com.isde.app.plugins.filetree;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Matrix;
import android.graphics.Rect;
import android.graphics.pdf.PdfRenderer;
import android.net.Uri;
import android.os.Build;
import android.os.ParcelFileDescriptor;
import android.provider.DocumentsContract;
import android.util.Base64;
import android.webkit.MimeTypeMap;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import androidx.activity.result.ActivityResult;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

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
        int maxSize = call.getInt("max", 512);
        try {
            Uri uri = Uri.parse(uriString);
            String dataUrl = loadThumbnail(uri, maxSize);
            if (dataUrl == null) {
                call.reject("No se pudo generar la miniatura");
                return;
            }
            call.resolve(new JSObject().put("data", dataUrl));
        } catch (Exception error) {
            call.reject("No se pudo generar la miniatura: " + error.getMessage(), error);
        }
    }

    private String loadThumbnail(Uri uri, int maxSize) {
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
        while (bounds.outWidth / sample > maxSize || bounds.outHeight / sample > maxSize) {
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
        boolean ok = bitmap.compress(Bitmap.CompressFormat.JPEG, 75, out);
        bitmap.recycle();
        if (!ok) {
            return null;
        }
        return "data:image/jpeg;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
    }

    @PluginMethod
    public void readText(PluginCall call) {
        String uriString = call.getString("uri");
        if (uriString == null || uriString.isEmpty()) {
            call.reject("uri es requerido");
            return;
        }
        try {
            Uri uri = Uri.parse(uriString);
            ContentResolver resolver = getContext().getContentResolver();
            StringBuilder builder = new StringBuilder();
            try (InputStream in = resolver.openInputStream(uri);
                 BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
                if (in == null) {
                    call.reject("No se pudo abrir el archivo de texto");
                    return;
                }
                String line;
                boolean first = true;
                while ((line = reader.readLine()) != null) {
                    if (!first) {
                        builder.append('\n');
                    }
                    builder.append(line);
                    first = false;
                }
            }
            call.resolve(new JSObject().put("text", builder.toString()));
        } catch (Exception error) {
            call.reject("No se pudo leer el archivo de texto: " + error.getMessage(), error);
        }
    }

    @PluginMethod
    public void pdfInfo(PluginCall call) {
        String uriString = call.getString("uri");
        if (uriString == null || uriString.isEmpty()) {
            call.reject("uri es requerido");
            return;
        }
        File cached = null;
        ParcelFileDescriptor pfd = null;
        PdfRenderer renderer = null;
        try {
            Uri uri = Uri.parse(uriString);
            cached = cachePdfFile(uri);
            pfd = ParcelFileDescriptor.open(cached, ParcelFileDescriptor.MODE_READ_ONLY);
            renderer = new PdfRenderer(pfd);
            call.resolve(new JSObject().put("count", renderer.getPageCount()));
        } catch (Exception error) {
            call.reject("No se pudo abrir el PDF: " + error.getMessage(), error);
        } finally {
            if (renderer != null) {
                renderer.close();
            }
            if (pfd != null) {
                try {
                    pfd.close();
                } catch (Exception ignored) {
                }
            }
            if (cached != null) {
                cached.delete();
            }
        }
    }

    @PluginMethod
    public void pdfPage(PluginCall call) {
        String uriString = call.getString("uri");
        int pageIndex = call.getInt("page", 0);
        int maxSize = call.getInt("max", 1440);
        if (uriString == null || uriString.isEmpty()) {
            call.reject("uri es requerido");
            return;
        }
        File cached = null;
        ParcelFileDescriptor pfd = null;
        PdfRenderer renderer = null;
        PdfRenderer.Page page = null;
        try {
            Uri uri = Uri.parse(uriString);
            cached = cachePdfFile(uri);
            pfd = ParcelFileDescriptor.open(cached, ParcelFileDescriptor.MODE_READ_ONLY);
            renderer = new PdfRenderer(pfd);
            if (pageIndex < 0 || pageIndex >= renderer.getPageCount()) {
                call.reject("Página fuera de rango");
                return;
            }
            page = renderer.openPage(pageIndex);
            int pageWidth = page.getWidth();
            int pageHeight = page.getHeight();
            float scale = Math.min(1f, maxSize / (float) pageWidth);
            if (scale < 0.01f) {
                scale = 0.01f;
            }
            int bitmapWidth = Math.max(1, Math.round(pageWidth * scale));
            int bitmapHeight = Math.max(1, Math.round(pageHeight * scale));
            Bitmap bitmap = Bitmap.createBitmap(bitmapWidth, bitmapHeight, Bitmap.Config.ARGB_8888);
            bitmap.eraseColor(Color.WHITE);
            Matrix matrix = new Matrix();
            matrix.postScale(scale, scale);
            page.render(bitmap, new Rect(0, 0, bitmapWidth, bitmapHeight), matrix, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            boolean ok = bitmap.compress(Bitmap.CompressFormat.JPEG, 75, out);
            bitmap.recycle();
            if (!ok) {
                call.reject("No se pudo renderizar la página del PDF");
                return;
            }
            call.resolve(new JSObject().put("data", "data:image/jpeg;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)));
        } catch (Exception error) {
            call.reject("No se pudo renderizar la página: " + error.getMessage(), error);
        } finally {
            if (page != null) {
                page.close();
            }
            if (renderer != null) {
                renderer.close();
            }
            if (pfd != null) {
                try {
                    pfd.close();
                } catch (Exception ignored) {
                }
            }
            if (cached != null) {
                cached.delete();
            }
        }
    }

    private File cachePdfFile(Uri uri) throws java.io.IOException {
        File cacheDir = getContext().getCacheDir();
        cleanupReproductorCache(cacheDir);
        File outFile = new File(cacheDir, "reproductor_" + System.currentTimeMillis() + ".pdf");
        ContentResolver resolver = getContext().getContentResolver();
        try (InputStream in = resolver.openInputStream(uri);
             OutputStream out = new FileOutputStream(outFile)) {
            if (in == null) {
                throw new java.io.IOException("No se pudo abrir el PDF");
            }
            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) > 0) {
                out.write(buffer, 0, read);
            }
        }
        return outFile;
    }

    @PluginMethod
    public void prepareMedia(PluginCall call) {
        String uriString = call.getString("uri");
        if (uriString == null || uriString.isEmpty()) {
            call.reject("uri es requerido");
            return;
        }
        try {
            Uri uri = Uri.parse(uriString);
            ContentResolver resolver = getContext().getContentResolver();
            String mime = resolver.getType(uri);
            String extension = null;
            if (mime != null) {
                extension = MimeTypeMap.getSingleton().getExtensionFromMimeType(mime);
            }
            if (extension == null) {
                String lastSegment = uri.getLastPathSegment();
                int dot = lastSegment != null ? lastSegment.lastIndexOf('.') : -1;
                if (dot >= 0) {
                    extension = lastSegment.substring(dot + 1);
                }
            }

            File cacheDir = getContext().getCacheDir();
            cleanupReproductorCache(cacheDir);

            String fileName = "reproductor_" + System.currentTimeMillis()
                + (extension != null && !extension.isEmpty() ? "." + extension : ".bin");
            File outFile = new File(cacheDir, fileName);

            try (InputStream in = resolver.openInputStream(uri);
                 OutputStream out = new FileOutputStream(outFile)) {
                if (in == null) {
                    outFile.delete();
                    call.reject("No se pudo abrir el archivo");
                    return;
                }
                byte[] buffer = new byte[8192];
                int read;
                while ((read = in.read(buffer)) > 0) {
                    out.write(buffer, 0, read);
                }
            }

            String localUrl = getBridge().getLocalUrl() + "/_capacitor_file_" + outFile.getAbsolutePath();
            call.resolve(new JSObject().put("url", localUrl));
        } catch (Exception error) {
            call.reject("No se pudo preparar el medio: " + error.getMessage(), error);
        }
    }

    private void cleanupReproductorCache(File cacheDir) {
        try {
            File[] files = cacheDir.listFiles();
            if (files == null) {
                return;
            }
            long cutoff = System.currentTimeMillis() - 24L * 60 * 60 * 1000;
            for (File file : files) {
                if (file.getName().startsWith("reproductor_") && file.lastModified() < cutoff) {
                    file.delete();
                }
            }
        } catch (Exception ignored) {
        }
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
            call.resolve();
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