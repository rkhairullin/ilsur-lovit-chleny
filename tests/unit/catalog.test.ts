import { expect, test } from "vitest";
import { renderCatalog } from "../../server/catalog.js";

test("renders the closed expandable game catalog with an escaped player name", () => {
  const page = renderCatalog(`<Игрок> & \"Рок\" 'n'`, () => []);

  expect(page).toContain("<h1>Ильсур - пИтух</h1>");
  expect(page).toContain('<p class="catalog-kicker">ВСЕ ВОКРУГ ЗНАЮТ, ЧТО</p>');
  expect(page).toContain(
    '<h2 id="library-title">Игры, где можно отпетушить Ильсура</h2>',
  );
  expect(page).toContain(
    "<b>&lt;Игрок&gt; &amp; &quot;Рок&quot; &#39;n&#39;</b>",
  );
  expect(page.match(/href="\/ilsur-lovit-chleny\/"/g)).toHaveLength(2);
  expect(page).toContain('src="/catalog/game-preview.png"');
  expect(page).toContain(">Начать петушить</a>");
  expect(page).toContain(
    "Диско-пушки палят членами, а у Ильсура опять руки заняты. Помоги ему поймать их ртом, держи темп и докажи, что у Ильсура глубокая глотка",
  );
  expect(page).toContain("Пока нет результатов");
  expect(page).not.toContain("АРКАДА · 1 ИГРОК");
});
