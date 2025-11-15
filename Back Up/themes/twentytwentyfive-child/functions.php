<?php
// Exit if accessed directly
if ( ! defined('ABSPATH') ) exit;

/**
 * Stukulele Child: keep things simple.
 * - Enqueue child stylesheet only.
 * - Do NOT enqueue chord gallery JS.
 * - Do NOT hide or modify ChordPress output.
 */

add_action('wp_enqueue_scripts', function () {
  wp_enqueue_style(
    'stukulele-child-style',
    trailingslashit( get_stylesheet_directory_uri() ) . 'style.css',
    array('twentytwentyfive-style'),
    file_exists( get_stylesheet_directory() . '/style.css' ) ? filemtime( get_stylesheet_directory() . '/style.css' ) : '1.0'
  );
}, 10);
