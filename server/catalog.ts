type GameCard = {
  title: string;
  href: string;
  image: string;
  imageAlt: string;
  description: string;
  rating: string;
};

const games: GameCard[] = [
  {
    title: "Ильсур ловит члены",
    href: "/ilsur-lovit-chleny/",
    image: "/catalog/game-preview.png",
    imageAlt: "Скриншот игрового экрана во время полёта банана",
    description:
      "Диско-пушки палят членами, а у Ильсура опять руки заняты. Помоги ему поймать их ртом, держи темп и докажи, что у Ильсура глубокая глотка",
    rating: "Рейтинг скоро появится",
  },
];

function escapeHtml(value: string) {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return value.replace(/[&<>"']/g, (character) => entities[character]!);
}

export function renderCatalog(nickname: string) {
  const cards = games
    .map(
      (game) => `<article class="game-card">
  <a class="game-card__preview" href="${game.href}" aria-label="Открыть игру ${game.title}">
    <img src="${game.image}" alt="${game.imageAlt}" width="1200" height="675">
    <span class="game-card__play-indicator" aria-hidden="true">▶</span>
  </a>
  <div class="game-card__body">
    <p class="game-card__eyebrow">АРКАДА · 1 ИГРОК</p>
    <h2>${game.title}</h2>
    <p class="game-card__description">${game.description}</p>
    <p class="game-card__rating">${game.rating}</p>
    <a class="catalog-button" href="${game.href}">Начать петушить</a>
  </div>
</article>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="color-scheme" content="dark">
    <title>Ильсур - пИтух</title>
    <link rel="stylesheet" href="/catalog/catalog.css">
  </head>
  <body>
    <main class="catalog" aria-label="Игры, где можно отпетушить Ильсура">
      <header class="catalog-header">
        <div class="catalog-brand">
          <p class="catalog-kicker">ВСЕ ВОКРУГ ЗНАЮТ, ЧТО</p>
          <h1>Ильсур - пИтух</h1>
        </div>
        <div class="catalog-account">
          <p id="player-nickname">Привет, <b>${escapeHtml(nickname)}</b></p>
          <form method="post" action="/logout"><button class="logout-button" type="submit">Выйти</button></form>
        </div>
      </header>
      <section class="catalog-library" aria-labelledby="library-title">
        <div class="section-heading">
          <div>
            <p class="catalog-kicker">ВЫБИРАЙ И ЗАЛЕТАЙ</p>
            <h2 id="library-title">Игры, где можно отпетушить Ильсура</h2>
          </div>
          <p class="library-count">01 <span>ИГРА</span></p>
        </div>
        <div class="game-grid">${cards}</div>
      </section>
    </main>
  </body>
</html>`;
}
