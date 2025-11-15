<?php
/**
 * Plugin Name: Stu Bulk Move to Songs (Temporary Admin Tool)
 * Description: One-off admin tool to convert existing Posts to the "song" CPT (and revert if needed). Adds Tools → Bulk Move to Songs.
 * Version: 1.0.0
 * Author: Stu + Slayer
 */

if (!defined('ABSPATH')) exit;

add_action('admin_menu', function () {
    add_management_page(
        'Bulk Move to Songs',
        'Bulk Move to Songs',
        'manage_options',
        'stu-bulk-move-to-songs',
        'stu_bulk_move_render_page'
    );
});

function stu_bulk_move_notice($msg, $type = 'info'){
    printf('<div class="notice notice-%s"><p>%s</p></div>', esc_attr($type), wp_kses_post($msg));
}

function stu_bulk_move_render_page() {
    if (!current_user_can('manage_options')) return;
    $action = isset($_POST['stu_action']) ? sanitize_text_field($_POST['stu_action']) : '';
    $match_shortcode = isset($_POST['match_shortcode']) ? (bool) $_POST['match_shortcode'] : true;
    $category_slugs = isset($_POST['category_slugs']) ? sanitize_text_field($_POST['category_slugs']) : '';
    $tag_slugs      = isset($_POST['tag_slugs']) ? sanitize_text_field($_POST['tag_slugs']) : '';
    $per_batch      = isset($_POST['per_batch']) ? max(1, intval($_POST['per_batch'])) : 500;
    $security_ok    = isset($_POST['_wpnonce']) && wp_verify_nonce($_POST['_wpnonce'], 'stu_bulk_move_nonce');

    echo '<div class="wrap"><h1>Bulk Move to Songs</h1>';
    echo '<p>This temporary tool converts existing <strong>Posts</strong> to the <strong>Song</strong> post type (CPT) for use at <code>/chords/</code>. You can Dry Run first, then Convert. A Revert option is included for safety.</p>';

    if ($action && !$security_ok) {
        stu_bulk_move_notice('Security check failed. Please try again.', 'error');
        $action = ''; // cancel
    }

    if ($action) {
        if ($action === 'dry' || $action === 'convert') {
            // Build query for posts to consider
            $tax_query = [];
            if ($category_slugs) {
                $cats = array_filter(array_map('trim', explode(',', $category_slugs)));
                if ($cats) {
                    $tax_query[] = [
                        'taxonomy' => 'category',
                        'field'    => 'slug',
                        'terms'    => $cats,
                        'operator' => 'IN',
                    ];
                }
            }
            if ($tag_slugs) {
                $tags = array_filter(array_map('trim', explode(',', $tag_slugs)));
                if ($tags) {
                    $tax_query[] = [
                        'taxonomy' => 'post_tag',
                        'field'    => 'slug',
                        'terms'    => $tags,
                        'operator' => 'IN',
                    ];
                }
            }

            $args = [
                'post_type'      => 'post',
                'post_status'    => 'any',
                'posts_per_page' => $per_batch,
                'fields'         => 'ids',
                'tax_query'      => $tax_query ? $tax_query : null,
                'orderby'        => 'date',
                'order'          => 'DESC',
                'suppress_filters' => true,
            ];

            $q = new WP_Query($args);
            $ids = $q->posts;

            // If matching shortcode, filter by content containing [chordpress
            if ($match_shortcode && $ids) {
                $filtered = [];
                foreach ($ids as $id) {
                    $content = get_post_field('post_content', $id);
                    if (stripos($content, '[chordpress') !== false) {
                        $filtered[] = $id;
                    }
                }
                $ids = $filtered;
            }

            $count = count($ids);
            if ($action === 'dry') {
                if ($count) {
                    stu_bulk_move_notice(sprintf('Dry Run: Found <strong>%d</strong> post(s) that would be converted to <code>song</code>. Showing up to %d below.', $count, min($count, 100)), 'info');
                    echo '<ol>';
                    $shown = 0;
                    foreach ($ids as $id) {
                        $link = get_edit_post_link($id, '');
                        $title = get_the_title($id);
                        printf('<li><a href="%s" target="_blank">%s</a> <em>(ID %d)</em></li>', esc_url($link), esc_html($title ?: '(no title)'), $id);
                        if (++$shown >= 100) break;
                    }
                    echo '</ol>';
                    if ($count > 100) {
                        echo '<p><em>…and more.</em></p>';
                    }
                } else {
                    stu_bulk_move_notice('Dry Run: No matching posts found.', 'warning');
                }
            } else {
                // Convert
                if ($count) {
                    $moved = 0;
                    foreach ($ids as $id) {
                        // Skip if already a song
                        if (get_post_type($id) === 'song') continue;
                        // Remember previous type for revert
                        if (!get_post_meta($id, '_prev_post_type', true)) {
                            add_post_meta($id, '_prev_post_type', 'post', true);
                        }
                        // Change type
                        $ok = set_post_type($id, 'song');
                        if ($ok) $moved++;
                    }
                    stu_bulk_move_notice(sprintf('Converted <strong>%d</strong> post(s) to <code>song</code>.', $moved), 'success');
                } else {
                    stu_bulk_move_notice('No matching posts were converted.', 'warning');
                }
            }
        } elseif ($action === 'revert') {
            // Revert any songs we converted (those with _prev_post_type=post)
            $args = [
                'post_type'      => 'song',
                'post_status'    => 'any',
                'meta_key'       => '_prev_post_type',
                'meta_value'     => 'post',
                'fields'         => 'ids',
                'posts_per_page' => 500,
            ];
            $q = new WP_Query($args);
            $ids = $q->posts;
            $reverted = 0;
            foreach ($ids as $id) {
                $ok = set_post_type($id, 'post');
                if ($ok) {
                    delete_post_meta($id, '_prev_post_type');
                    $reverted++;
                }
            }
            if ($reverted) {
                stu_bulk_move_notice(sprintf('Reverted <strong>%d</strong> item(s) back to <code>post</code>.', $reverted), 'success');
            } else {
                stu_bulk_move_notice('No converted songs found to revert.', 'info');
            }
        }
    }

    // Form
    ?>
    <form method="post">
        <?php wp_nonce_field('stu_bulk_move_nonce'); ?>
        <table class="form-table">
            <tr>
                <th scope="row">Match posts with [chordpress]</th>
                <td>
                    <label>
                        <input type="checkbox" name="match_shortcode" value="1" <?php checked(!isset($_POST['match_shortcode']) || $match_shortcode); ?>>
                        Only include posts whose content contains <code>[chordpress</code> (recommended)
                    </label>
                </td>
            </tr>
            <tr>
                <th scope="row">Limit by Categories (optional)</th>
                <td>
                    <input type="text" name="category_slugs" value="<?php echo esc_attr($category_slugs); ?>" class="regular-text" placeholder="e.g., chords,songs,uke"/>
                    <p class="description">Comma-separated category slugs. Leave blank to include all categories.</p>
                </td>
            </tr>
            <tr>
                <th scope="row">Limit by Tags (optional)</th>
                <td>
                    <input type="text" name="tag_slugs" value="<?php echo esc_attr($tag_slugs); ?>" class="regular-text" placeholder="e.g., chordpress,ukulele"/>
                    <p class="description">Comma-separated tag slugs. Leave blank to include all tags.</p>
                </td>
            </tr>
            <tr>
                <th scope="row">Max per run</th>
                <td>
                    <input type="number" name="per_batch" value="<?php echo esc_attr($per_batch); ?>" min="1" step="1" />
                    <p class="description">How many items to process in one go. If you have thousands, run multiple times.</p>
                </td>
            </tr>
        </table>
        <p class="submit" style="display:flex;gap:8px;align-items:center;">
            <button class="button" name="stu_action" value="dry">Dry Run (preview)</button>
            <button class="button button-primary" name="stu_action" value="convert">Convert to “song”</button>
            <span style="margin-left:16px;"></span>
            <button class="button" name="stu_action" value="revert" onclick="return confirm('Revert any converted Songs back to Posts?')">Revert converted</button>
        </p>
    </form>
    <hr/>
    <p><em>Tip:</em> When you’re done, you can safely delete this plugin file to remove the menu item.</p>
    </div>
    <?php
}
