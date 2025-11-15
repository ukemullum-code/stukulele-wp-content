<?php
/**
 * Plugin Name: ChordPress (Fixed + KeyChange + Bundled Diagrams)
 * Description: Self-contained chord rendering with [C] tokens, bundled SVG diagram library, and a client-side Key Change toolbar.
 * Version: 1.2.1
 * Author: Stu + ChatGPT
 * License: GPL-2.0-or-later
 */
if (!defined('ABSPATH')) { exit; }

define('CPFF_PLUGIN_FILE', __FILE__);
define('CPFF_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('CPFF_PLUGIN_URL', plugin_dir_url(__FILE__));

// Assets
add_action('wp_enqueue_scripts', function () {
    wp_register_style('cpress-style', CPFF_PLUGIN_URL . 'assets/style.css', array(), '1.2.1');
    wp_register_script('cpress-keychange', CPFF_PLUGIN_URL . 'assets/keychange.js', array(), '1.2.1', true);
}, 5);

// (Optional) copy bundled uke-chords on activation or first load could go here…

// Inject custom meta on Song pages and hide theme meta with CSS class
add_filter('the_content', function($content){
    if (is_singular('song') && in_the_loop() && is_main_query()) {
        $artist_terms = get_the_terms(get_the_ID(), 'artist');
        $decade_terms = get_the_terms(get_the_ID(), 'decade');
        $artist = (!is_wp_error($artist_terms) && !empty($artist_terms)) ? $artist_terms[0]->name : '';
        $decade = (!is_wp_error($decade_terms) && !empty($decade_terms)) ? $decade_terms[0]->name : '';
        $parts  = array_filter(array(
            $artist ? 'By ' . $artist : '',
            $decade
        ));
        if ($parts) {
            $meta = '<p class="song-meta">'. esc_html(implode(' • ', $parts)) .'</p>';
            return $meta . $content;
        }
    }
    return $content;
}, 9);

require_once __DIR__ . '/includes/render.php';
add_shortcode('chordpress', 'cpress_fixed_full_shortcode');
