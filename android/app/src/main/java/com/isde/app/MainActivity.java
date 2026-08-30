package com.isde.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.isde.app.plugins.filetree.FileTreePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FileTreePlugin.class);
        super.onCreate(savedInstanceState);
    }
}