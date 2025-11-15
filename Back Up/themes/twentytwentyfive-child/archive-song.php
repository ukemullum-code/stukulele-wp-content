<?php
/* Archive template for Songs (/chords/) — ONE-COLUMN LIST LAYOUT with Decade */
if (!defined('ABSPATH')) exit;
get_header();
$alpha = get_query_var('alpha');
$pp    = intval(get_query_var('pp')) ?: 30;
?>
<style>
.song-archive-wrap{max-width:860px;margin:0 auto;padding:28px 18px;}
.song-toolbar{position:sticky;top:0;background:#fff;padding-bottom:12px;margin-bottom:16px;
  border-bottom:1px solid #eee;z-index:2;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between}
.song-toolbar .filters{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.song-toolbar input[type="search"]{padding:8px 10px;min-width:260px;border:1px solid #ddd;border-radius:8px}
.song-toolbar select, .song-toolbar button{padding:8px 10px;border:1px solid #ddd;border-radius:8px;background:#fff;cursor:pointer}
.song-toolbar button{font-weight:600}
.az{display:flex;gap:6px;flex-wrap:wrap}
.az a{padding:4px 8px;border:1px solid #ddd;border-radius:6px;text-decoration:none;color:#111}
.az a.active{border-color:#111;font-weight:700}

.list{display:block}
.item{display:grid;grid-template-columns:112px 1fr;gap:16px;padding:16px 0;border-bottom:1px solid #eee}
.item:last-child{border-bottom:none}
.thumb{width:112px;height:112px;overflow:hidden;border-radius:10px;background:#f6f6f6}
.thumb img{width:100%;height:100%;object-fit:cover;display:block}

.item h3{margin:0 0 4px 0;font-size:1.25rem;line-height:1.2}
.item h3 a{text-decoration:none;color:#0b59d0}
.item h3 a:hover{text-decoration:underline}
.meta{font-size:.92rem;color:#555;margin-bottom:6px}
.desc{color:#444;opacity:.9}

.count{margin:10px 0 6px 0;color:#666;font-size:.9rem}

@media (max-width:640px){
  .item{grid-template-columns:84px 1fr}
  .thumb{width:84px;height:84px}
  .song-toolbar input[type="search"]{min-width:180px}
}
</style>

<div class="song-archive-wrap">
    <header class="song-toolbar">
        <div class="filters">
            <form method="get" action="<?php echo esc_url(get_post_type_archive_link('song')); ?>" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                <input type="search" name="s" value="<?php echo isset($_GET['s']) ? esc_attr($_GET['s']) : ''; ?>" placeholder="Search songs…" />
                <?php
                // Decade dropdown
                $decades = get_terms(['taxonomy'=>'decade','hide_empty'=>true]);
                if (!is_wp_error($decades) && $decades){
                    $current_decade = (is_tax('decade') ? get_queried_object()->slug : (isset($_GET['decade']) ? sanitize_text_field($_GET['decade']) : ''));
                    echo '<select name="decade" onchange="this.form.submit()"><option value="">All decades</option>';
                    foreach ($decades as $d){
                        printf('<option value="%s"%s>%s</option>', esc_attr($d->slug), selected($current_decade, $d->slug, false), esc_html($d->name));
                    }
                    echo '</select>';
                }
                // Artist dropdown
                $artists = get_terms(['taxonomy'=>'artist','hide_empty'=>true]);
                if (!is_wp_error($artists) && $artists){
                    $current_artist = (is_tax('artist') ? get_queried_object()->slug : (isset($_GET['artist']) ? sanitize_text_field($_GET['artist']) : ''));
                    echo '<select name="artist" onchange="this.form.submit()"><option value="">All artists</option>';
                    foreach ($artists as $a){
                        printf('<option value="%s"%s>%s</option>', esc_attr($a->slug), selected($current_artist, $a->slug, false), esc_html($a->name));
                    }
                    echo '</select>';
                }
                ?>
                <input type="hidden" name="pp" value="<?php echo esc_attr($pp); ?>" />
                <button type="submit">Filter</button>
            </form>
        </div>

        <nav class="az">
            <?php
            $letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            $base = trailingslashit(get_post_type_archive_link('song'));
            $is_alpha = $alpha ? strtoupper($alpha) : '';
            echo '<a href="'.esc_url($base).'" class="'.(!$is_alpha?'active':'').'">All</a>';
            for ($i=0;$i<strlen($letters);$i++){
                $L = $letters[$i];
                $url = esc_url($base.'letter/'.strtolower($L).'/');
                $cls = ($is_alpha===$L)?'active':'';
                echo '<a class="'.$cls.'" href="'.$url.'">'.$L.'</a>';
            }
            ?>
        </nav>
    </header>

    <?php
    global $wp_query;

    // Apply dropdown GETs as taxonomy filters if present
    if (!empty($_GET['decade']) || !empty($_GET['artist'])) {
        $tax_query = [];
        if (!empty($_GET['decade'])) $tax_query[] = ['taxonomy'=>'decade','field'=>'slug','terms'=>sanitize_text_field($_GET['decade'])];
        if (!empty($_GET['artist'])) $tax_query[] = ['taxonomy'=>'artist','field'=>'slug','terms'=>sanitize_text_field($_GET['artist'])];

        $qargs = [
            'post_type'      => 'song',
            'posts_per_page' => $pp,
            'paged'          => max(1, get_query_var('paged')),
            'orderby'        => 'title',
            'order'          => 'ASC',
            'tax_query'      => $tax_query,
            's'              => isset($_GET['s']) ? sanitize_text_field($_GET['s']) : '',
        ];
        $loop = new WP_Query($qargs);
    } else {
        $loop = $wp_query;
    }
    ?>

    <div class="count">
        <?php
        $total = isset($loop->found_posts) ? intval($loop->found_posts) : 0;
        echo esc_html( $total . ' ' . _n('song', 'songs', $total) . ' found' );
        ?>
    </div>

    <?php if ($loop->have_posts()): ?>
        <div class="list" role="list">
            <?php while ($loop->have_posts()): $loop->the_post(); ?>
                <article class="item" role="listitem">
                    <a class="thumb" href="<?php the_permalink(); ?>">
                        <?php if (has_post_thumbnail()) { the_post_thumbnail('medium'); } ?>
                    </a>
                    <div class="body">
                        <h3><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h3>
                        <div class="meta">
                            <?php
                            $artist = get_the_term_list(get_the_ID(), 'artist', '', ', ', '');
                            $decade = get_the_term_list(get_the_ID(), 'decade', '', ', ', '');
                            $diff   = get_the_term_list(get_the_ID(), 'difficulty', '', ', ', '');
                            $bits   = array_filter([
                                $artist ? strip_tags($artist) : '',
                                $decade ? 'Decade: '.strip_tags($decade) : '',
                                $diff   ? strip_tags($diff) : ''
                            ]);
                            echo esc_html(implode(' • ', $bits));
                            ?>
                        </div>
                        <div class="desc">
                            <?php echo wp_kses_post( get_the_excerpt() ); ?>
                        </div>
                    </div>
                </article>
            <?php endwhile; wp_reset_postdata(); ?>
        </div>

        <div class="pag">
            <?php
            echo paginate_links([
                'total'   => $loop->max_num_pages,
                'current' => max(1, get_query_var('paged')),
            ]);
            ?>
        </div>
    <?php else: ?>
        <p>No songs yet. Add some in <strong>Songs → Add New</strong>.</p>
    <?php endif; ?>
</div>

<?php get_footer(); ?>
