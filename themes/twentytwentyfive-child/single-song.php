<?php
/* Template for single Song posts */
if (!defined('ABSPATH')) exit;
get_header();
?>
<main id="primary" class="site-main">
<?php while ( have_posts() ) : the_post(); ?>
  <article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
    <header class="entry-header">
      <h1 class="entry-title"><?php the_title(); ?></h1>
      <?php
      $artists = get_the_terms(get_the_ID(), 'artist');
      $decades = get_the_terms(get_the_ID(), 'decade');

      $parts = [];
      if (!is_wp_error($artists) && $artists) {
        $artist_names = array_map('esc_html', wp_list_pluck($artists, 'name'));
        $parts[] = 'By ' . implode(', ', $artist_names);
      }
      if (!is_wp_error($decades) && $decades) {
        $decade_names = array_map('esc_html', wp_list_pluck($decades, 'name'));
        $parts[] = implode(', ', $decade_names);
      }
      if ($parts) {
        echo '<p class="song-meta">'. implode(' • ', $parts) .'</p>';
      }
      ?>
    </header>

    <div class="entry-content">
      <?php the_content(); ?>
    </div>
  </article>
<?php endwhile; ?>
</main>

<style>
/* style the custom meta + hide theme’s default meta on song pages */
.song-meta { margin:.5rem 0 1.25rem; color:#6b7280; }
body.single-song .wp-block-post-author,
body.single-song .wp-block-post-author-name,
body.single-song .wp-block-post-terms,
body.single-song .wp-block-post-date { display:none !important; }
</style>

<?php get_footer(); ?>
