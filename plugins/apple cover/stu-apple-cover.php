<?php
/**
 * Plugin Name: Stu – Quick Apple Cover
 * Description: One-click button in the editor to fetch Apple Music artwork for the current post and set it as the Featured Image.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) exit;

add_action('add_meta_boxes', function () {
    add_meta_box('stu_apple_cover', 'Quick Cover (Apple)', function ($post) {
        $title = esc_attr(get_the_title($post));
        echo '<p>Uses Apple iTunes Search to find a square cover and sets it as the Featured Image.</p>';
        echo '<p><label>Search term (Song — Artist):<br><input type="text" id="stu_ac_term" style="width:100%" value="' . $title . '"></label></p>';
        echo '<p><button type="button" class="button button-primary" id="stu_ac_btn">Fetch & Set Cover</button> <span id="stu_ac_status" style="margin-left:8px;"></span></p>';
        ?>
        <script>
        (function(){
          const btn = document.getElementById('stu_ac_btn');
          const term = document.getElementById('stu_ac_term');
          const status = document.getElementById('stu_ac_status');
          if(!btn) return;
          btn.addEventListener('click', function(){
            status.textContent = 'Searching…';
            fetch(ajaxurl, {
              method: 'POST',
              headers: {'Content-Type':'application/x-www-form-urlencoded'},
              body: new URLSearchParams({
                action: 'stu_fetch_apple_cover',
                post_id: '<?php echo (int) $post->ID; ?>',
                term: term.value
              })
            }).then(r=>r.json()).then(res=>{
              if(res.success){ status.textContent = '✅ ' + res.data.message; location.reload(); }
              else { status.textContent = '❌ ' + (res.data && res.data.message ? res.data.message : 'Failed'); }
            }).catch(()=> status.textContent = '❌ Request failed');
          });
        })();
        </script>
        <?php
    }, null, 'side', 'high');
});

add_action('wp_ajax_stu_fetch_apple_cover', function () {
    if (!current_user_can('edit_post', (int) $_POST['post_id'])) {
        wp_send_json_error(['message' => 'Permission denied.']);
    }
    $post_id = (int) $_POST['post_id'];
    $term = sanitize_text_field($_POST['term'] ?? get_the_title($post_id));
    if (!$term) wp_send_json_error(['message' => 'No search term.']);

    // Search iTunes
    $url = add_query_arg([
        'term'   => $term,
        'media'  => 'music',
        'entity' => 'song',
        'limit'  => 1,
        'country'=> 'AU'
    ], 'https://itunes.apple.com/search');

    $res = wp_remote_get($url, ['timeout' => 12]);
    if (is_wp_error($res)) wp_send_json_error(['message' => 'Apple search failed.']);

    $data = json_decode(wp_remote_retrieve_body($res), true);
    if (empty($data['results'][0])) wp_send_json_error(['message' => 'No match found. Try “Song — Artist”.']);

    $art = $data['results'][0]['artworkUrl100'] ?? $data['results'][0]['artworkUrl60'] ?? '';
    if (!$art) wp_send_json_error(['message' => 'No artwork URL.']);

    // Upsize to 1200x1200
    $art = str_replace(['100x100bb','60x60bb'], '1200x1200bb', $art);

    // Sideload into Media Library and set as featured image
    if (!function_exists('media_sideload_image')) {
        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';
    }
    $attachment_id = 0;
    $html = media_sideload_image($art, $post_id, $term, 'id');
    if (is_wp_error($html)) wp_send_json_error(['message' => 'Download failed.']);

    $attachment_id = (int) $html;
    set_post_thumbnail($post_id, $attachment_id);

    wp_send_json_success(['message' => 'Cover set!']);
});
