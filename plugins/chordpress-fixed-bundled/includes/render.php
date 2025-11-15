<?php
if (!defined('ABSPATH')) { exit; }

/**
 * [chordpress] – Stu build (minor keys + toolbar assets + power-chord "5" + '+' filenames)
 * - Accepts major or minor base key via shortcode: key="Am" (or Key="Am").
 * - Renders wrapper .cpress with data-base-key preserved (e.g., "Am").
 * - Enqueues style/script so the toolbar & logic load when shortcode is present.
 * - Keeps diagrams + inline chord spans; JS will handle transpose & diagrams.
 * - Supports simple {Section} headings like {Intro}, {Verse}, etc.
 * - Recognises power chords like [C5] and '+' chords like [G+].
 * - IMPORTANT: keeps '+' in SVG filenames and URL-encodes them for output.
 */
function cpress_fixed_full_shortcode($atts, $content = '', $tag = 'chordpress') {
    $atts = shortcode_atts(array(
        'interactive' => 'yes',
        'diagrams'    => 'yes',
        'key'         => '',
        'Key'         => '', // tolerate capital K
    ), $atts, $tag);

    // Make sure assets load for pages using the shortcode
    if (function_exists('wp_enqueue_style'))  wp_enqueue_style('cpress-style');
    if (function_exists('wp_enqueue_script')) wp_enqueue_script('cpress-keychange');

    // --- Normalise content --------------------------------------------------
    $content = (string) $content;
    $content = html_entity_decode($content, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $content = str_replace("\xC2\xA0", ' ', $content); // NBSP
    $content = preg_replace('/<\/p>\s*<p>/i', "\n", $content);
    $content = preg_replace('/(<br\s*\/?>\s*)+/i', "\n", $content);
    $content = preg_replace('/<\/?p>/i', '', $content);

    // --- Section headings {Intro}, {Verse}, etc. ---------------------------
    $content = preg_replace_callback('/^\s*\{\s*([^\}\r\n]+?)\s*\}\s*$/mu', function($m){
        $title = preg_replace('/\s+/', ' ', trim($m[1]));
        return "\n__CP_SECTION:" . $title . "__\n";
    }, $content);

    // --- Base key (allow minors) -------------------------------------------
    $base_key_raw = '';
    if (!empty($atts['key']))      $base_key_raw = trim((string)$atts['key']);
    elseif (!empty($atts['Key']))  $base_key_raw = trim((string)$atts['Key']);

    // Keep A–G, #, b, and trailing 'm'
    $base_key = preg_replace('/[^A-G#bm]/i','', (string)$base_key_raw);

    // --- Start output -------------------------------------------------------
    $cpress_id = 'cpress-' . substr(md5(uniqid('', true)), 0, 8);

    $html  = '<!-- ChordPress Song ' . esc_html($cpress_id) . ' -->' . "\n";
    $html .= '<div id="' . esc_attr($cpress_id) . '" class="cpress" data-base-key="' . esc_attr($base_key) . '">' . "\n";

    // Collect unique chords for initial diagrams (JS will rebuild on change)
    // Allow '+' and '5' in suffix; allow slash bass.
    $unique = array();
    $chord_re = '/\[\s*([A-G][#b]?(?:[^\/\]\s]+)?(?:\/[A-G][#b]?)?)\s*\]/';
    if (preg_match_all($chord_re, $content, $m)) {
        foreach ($m[1] as $raw) $unique[trim($raw)] = true;
    }

    // Helper to convert chord label to filename (drop /B, '#'→'s'; KEEP '+')
    $to_filename = function($ch){
        $ch = trim($ch);
        // strip slash bass
        $ch = preg_replace('~/(?:[A-G](?:#|b)?)$~', '', $ch);
        // symbols for filesystem
        $ch = str_replace('°', 'dim', $ch); // ° → dim
        $ch = str_replace('#', 's', $ch);   // # → s
        // KEEP '+' literally (e.g., G+ -> "G+.svg")
        return $ch . '.svg';
    };

    if ($atts['diagrams'] === 'yes') {
        $html .= '<div class="cpress-diagrams">' . "\n";
        if (!empty($unique)) {
            foreach (array_keys($unique) as $ch) {
                $file = $to_filename($ch); // e.g., "G+.svg"
                $local_path = CPFF_PLUGIN_DIR . 'uke-chords/' . $file;

                // URL-encode the filename so '+' becomes %2B in the URL
                $enc = rawurlencode($file);

                $src = file_exists($local_path)
                    ? CPFF_PLUGIN_URL . 'uke-chords/' . $enc
                    : content_url('plugins/chordpress/uke-chords/' . $enc);

                $html .= '<img class="cpress-diagram" alt="' . esc_attr($ch) . '" src="' . esc_url($src) . '" loading="lazy" />';
            }
        }
        $html .= '</div>' . "\n";
    }

    // Render lyrics with inline chords (store original for transpose)
    $lines = preg_split('/\r\n|\r|\n/', $content);
    foreach ($lines as $line) {
        $trim = trim($line);
        if ($trim === '') { continue; }

        if (preg_match('/^__CP_SECTION:(.*)__$/u', $trim, $mm)) {
            $title = trim($mm[1]);
            $html .= '<div class="cpress-section"><strong>' . esc_html($title) . ':</strong></div>' . "\n";
            continue;
        }

        // Wrap chord tokens; keep original text for data-original-chord.
        $safe = esc_html($line);
        $safe = preg_replace_callback($chord_re, function($m) {
            $ch = trim($m[1]);
            return '<span class="cpress-chord" data-original-chord="' . esc_attr($ch) . '" data-chord="' . esc_attr($ch) . '">' . esc_html($ch) . '</span>';
        }, $safe);

        $html .= '<div class="cpress-line">' . $safe . '</div>' . "\n";
    }

    $html .= "</div>\n";
    $html .= "<!-- /ChordPress Song " . esc_html($cpress_id) . " -->\n";
    return $html;
}

add_shortcode('chordpress', 'cpress_fixed_full_shortcode');
