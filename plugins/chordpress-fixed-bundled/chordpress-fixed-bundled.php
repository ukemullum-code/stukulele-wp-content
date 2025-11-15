<?php
/**
 * Plugin Name: ChordPress (Fixed + KeyChange + Bundled Diagrams)
 * Description: Self-contained chord rendering with [C] tokens, bundled SVG diagram library, and a client-side Key Change toolbar.
 * Version: 1.2.0
 * Author: Stu + ChatGPT
 * License: GPL-2.0-or-later
 */
if (!defined('ABSPATH')) { exit; }

define('CPFF_PLUGIN_FILE', __FILE__);
define('CPFF_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('CPFF_PLUGIN_URL', plugin_dir_url(__FILE__));

add_action('wp_enqueue_scripts', function () {
    wp_register_script('cpress-keychange', CPFF_PLUGIN_URL . 'assets/keychange.js', array(), '1.2.0', true);
    wp_register_style('cpress-style', CPFF_PLUGIN_URL . 'assets/style.css', array(), '1.2.0');
});

register_activation_hook(__FILE__, function () {
    $target = CPFF_PLUGIN_DIR . 'uke-chords/';
    if (!file_exists($target)) { wp_mkdir_p($target); }
    $existing = glob($target . '*.svg');
    if ($existing && count($existing) > 5) {
        set_transient('cpff_import_notice', 'found_existing', 60);
        return;
    }
    $sources = array(
        WP_CONTENT_DIR . '/plugins/chordpress/uke-chords/',
        WP_CONTENT_DIR . '/plugins/chordpress-fixed-full/uke-chords/',
        WP_CONTENT_DIR . '/plugins/chordpress-fixed-bundled/uke-chords/',
    );
    $copied = 0;
    foreach ($sources as $src) {
        if (!is_dir($src)) { continue; }
        $files = glob($src . '*.svg');
        if (!$files) { continue; }
        foreach ($files as $f) {
            $dest = $target . basename($f);
            if (!file_exists($dest)) {
                @copy($f, $dest);
                if (file_exists($dest)) { $copied++; }
            }
        }
        if ($copied > 0) { break; }
    }
    set_transient('cpff_import_notice', $copied > 0 ? 'imported' : 'none_found', 60);
});

require_once __DIR__ . '/includes/render.php';
add_shortcode('chordpress', 'cpress_fixed_full_shortcode');
