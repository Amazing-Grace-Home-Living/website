import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const homepage = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const listings = readFileSync(new URL('../listings/index.html', import.meta.url), 'utf8');

test('hero visual is in its own grid column and does not repeat featured Tampa image', () => {
  const hero = homepage.match(/<section class="hero">([\s\S]*?)<\/section>/)?.[1];
  assert.ok(hero, 'homepage hero exists');
  assert.match(hero, /<\/div><\/div><a class="hero-visual"/, 'hero content closes before image');
  const heroImage = hero.match(/<a class="hero-visual"[^>]*><img src="([^"]+)"/)?.[1];
  const featured = homepage.match(/<section class="featured"[^>]*>([\s\S]*?)<\/section>/)?.[1];
  const featuredImage = featured?.match(/<img src="([^"]+)"/)?.[1];
  assert.ok(heroImage && featuredImage);
  assert.notEqual(heroImage, featuredImage, 'Tampa photo must not repeat');
});

test('Clearwater uses kitchen as lead and excludes unverified exterior everywhere', () => {
  assert.doesNotMatch(homepage + listings, /COYV1031\.JPG/);
  const featured = homepage.match(/<section class="featured" id="clearwater-featured"[^>]*>([\s\S]*?)<\/section>/)?.[1];
  assert.ok(featured);
  const featuredImages = [...featured.matchAll(/<img src="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(featuredImages, [
    '/assets/Clearwater/Kitchen.jpg',
    '/assets/Clearwater/Room.jpg',
    '/assets/Clearwater/bathroom.jpg',
  ]);
  const gallery = listings.match(/<!-- CLEARWATER_SECTION_START -->([\s\S]*?)<!-- CLEARWATER_SECTION_END -->/)?.[1];
  assert.ok(gallery);
  assert.match(gallery, /3 photos/);
  const galleryImages = [...gallery.matchAll(/<img src="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(galleryImages, featuredImages);
  assert.deepEqual([...gallery.matchAll(/data-photo="(\d+)"/g)].map(match => Number(match[1])), [0, 1, 2]);
});
