<?php
/**
 * Plugin Name: Stu Songs (CPT + Artist/Decade/Difficulty + /chords/ Archive)
 * Description: Registers a native "Song" post type with /chords/ archive, Artist/Decade/Difficulty taxonomies, A–Z filter, and pretty URLs. Seeds decades 1900s–current.
 * Author: Stu + Slayer
 * Version: 1.1.0
 */

if (!defined('ABSPATH')) exit;

add_action('init', function () {
    // --- Post Type: song -> /chords/ archive ---
    register_post_type('song', [
        'labels' => [
            'name' => 'Songs',
            'singular_name' => 'Song',
            'add_new_item' => 'Add New Song',
            'edit_item' => 'Edit Song',
            'menu_name' => 'Songs',
        ],
        'public' => true,
        'has_archive' => 'chords',                // https://yoursite/chords/
        'rewrite' => ['slug' => 'chords', 'with_front' => false],
        'menu_position' => 5,
        'menu_icon' => 'dashicons-album',
        'supports' => ['title','editor','excerpt','thumbnail','custom-fields','revisions'],
        'show_in_rest' => true,
    ]);

    // --- Taxonomy: Artist (tag-like) -> /chords/artist/<term> ---
    register_taxonomy('artist', 'song', [
        'labels' => ['name' => 'Artists', 'singular_name' => 'Artist'],
        'public' => true,
        'hierarchical' => false,
        'rewrite' => ['slug' => 'chords/artist', 'with_front' => false],
        'show_in_rest' => true,
    ]);

    // --- Taxonomy: Decade (1900s, 1910s, ...) -> /chords/decade/<term> ---
    register_taxonomy('decade', 'song', [
        'labels' => ['name' => 'Decades', 'singular_name' => 'Decade'],
        'public' => true,
        'hierarchical' => false,
        'rewrite' => ['slug' => 'chords/decade', 'with_front' => false],
        'show_in_rest' => true,
    ]);

    // --- Taxonomy: Difficulty (Beginner/Intermediate/Advanced) ---
    register_taxonomy('difficulty', 'song', [
        'labels' => ['name' => 'Difficulty', 'singular_name' => 'Difficulty'],
        'public' => true,
        'hierarchical' => true,
        'rewrite' => ['slug' => 'chords/difficulty', 'with_front' => false],
        'show_in_rest' => true,
    ]);
});

// Seed decades 1900s–current decade once
add_action('init', function () {
    if (!taxonomy_exists('decade')) return;
    if (get_option('stu_decade_seeded')) return;

    $current_year = (int) current_time('Y');
    $end = (int) (floor($current_year / 10) * 10); // e.g., 2020
    for ($y = 1900; $y <= $end; $y += 10) {
        $name = $y . 's';       // e.g., 1980s
        $slug = strtolower($name);
        if (!term_exists($name, 'decade')) {
            wp_insert_term($name, 'decade', ['slug' => $slug]);
        }
    }
    update_option('stu_decade_seeded', 1);
}, 20);

// Add custom query var for A–Z letter filter and per-page control
add_filter('query_vars', function ($vars) {
    $vars[] = 'alpha';
    $vars[] = 'pp';
    return $vars;
});

// Pretty URL for A–Z: /chords/letter/a/
add_action('init', function () {
    add_rewrite_rule('^chords/letter/([a-zA-Z])/?$', 'index.php?post_type=song&alpha=$matches[1]', 'top');
});

// One-time flush for the rewrite rules (safe in MU plugin)
add_action('init', function () {
    if (!get_option('stu_songs_rewrite_flushed_110')) {
        flush_rewrite_rules(false);
        update_option('stu_songs_rewrite_flushed_110', 1);
    }
}, 30);

// Main archive query defaults (order, pagination, taxonomy sorting)
add_action('pre_get_posts', function ($q) {
    if (is_admin() || !$q->is_main_query()) return;

    // On /chords/ and its sub archives
    if ($q->is_post_type_archive('song') || $q->is_tax(['artist','decade','difficulty'])) {
        $pp = intval(get_query_var('pp')) ?: 30;
        $q->set('posts_per_page', $pp);
        $q->set('orderby', 'title');
        $q->set('order', 'ASC');

        // A–Z filter (alpha)
        $alpha = get_query_var('alpha');
        if ($alpha && preg_match('/^[a-z]$/i', $alpha)) {
            add_filter('posts_where', function ($where) use ($alpha) {
                global $wpdb;
                $letter = esc_sql($alpha);
                $where .= $wpdb->prepare(" AND UPPER({$wpdb->posts}.post_title) LIKE %s", strtoupper($letter) . '%');
                return $where;
            });
        }
    }
});

// Admin list columns
add_filter('manage_song_posts_columns', function ($cols) {
    $cols['artist']  = 'Artist';
    $cols['decade']  = 'Decade';
    $cols['difficulty'] = 'Difficulty';
    return $cols;
});
add_action('manage_song_posts_custom_column', function ($col, $post_id) {
    if (in_array($col, ['artist','decade','difficulty'])) {
        $tax = $col;
        $terms = get_the_term_list($post_id, $tax, '', ', ', '');
        echo $terms ? $terms : '—';
    }
}, 10, 2);
