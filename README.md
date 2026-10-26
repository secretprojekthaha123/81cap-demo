# 81 CAP – nova produktna stran (testna simulacija)

Samostojna statična stran: `index.html`, `styles.css`, `app.js`, `media/`.
Brez ogrodij in brez gradnje. Nakupni gumbi vodijo na blagajno obstoječe
trgovine 81cap.com (Shopify cart permalink), zato poseg v trgovino ni potreben.

## Predogled (lokalno)

V mapi nad `81cap-site` zaženi:

```bash
python -m http.server 8081 --directory 81cap-site
```

in odpri http://localhost:8081. (Odpiranje `index.html` neposredno iz
Raziskovalca deluje, a video se zaradi `file://` v nekaterih brskalnikih
ne predvaja samodejno.)

V Claude Code je strežnik nastavljen v `.claude/launch.json` pod imenom `81cap-site`.

## Objava (brezplačno)

Stran je navadna statična mapa, zato jo gosti vsak statični gostitelj:

- **Netlify Drop** (najhitreje): https://app.netlify.com/drop → povleci mapo `81cap-site`. Dobiš `*.netlify.app` povezavo; lastno domeno/poddomeno (npr. `new.81cap.com`) dodaš v nastavitvah z enim CNAME zapisom.
- **Cloudflare Pages / Vercel / GitHub Pages**: naloži mapo oz. repozitorij; nastavitve gradnje pusti prazne (ni build koraka), izhodna mapa je `81cap-site`.

Pred objavo:

1. Preveri zalogo in cene: https://www.81cap.com/products/81-cap.js (`available`, `price`). ID-ji variant in cene so v `app.js` (`VARIANTS`) in v HTML-ju razdelka *Pick your cap*.
2. Vse trditve na strani izhajajo iz 81cap.com (produktna stran in About). Ne dodajaj trditev brez vira.
3. Če bo stran kdaj vgrajena v Shopify temo (ista domena), lahko permalink zamenjaš s `POST /cart/add.js`, da obiskovalec ostane na strani.

## Kako stran deluje

- **Prvi zaslon:** `media/81cap-hero-1080.mp4` (namizje) oz. `81cap-hero-720.mp4` (zasloni < 768 px), `muted autoplay loop playsinline`. Poster je temni prvi kader, da ni preskoka ob zagonu.
- **Kartice lastnosti** se menjajo po `video.currentTime` (časi v `data-at`: 2,0 s · 3,0 s · 5,0 s · 7,5 s, usklajeni z vrtenjem capa v videu). Tik pred koncem (zadnjih 0,35 s) se slika zatemni, zato je prehod zanke na temni začetni kader neviden.
- **Zmanjšano gibanje** (`prefers-reduced-motion`): video se ne predvaja, prikaže se svetla plakatna slika, animacije so izklopljene.
- **Nakup:** izbira tipa (MALE/FEMALE) in količine (5/10/20) nastavi `href` gumba na `https://www.81cap.com/cart/{VARIANT_ID}:1`. Vseh 6 povezav preverjenih 26. 10. 2026 (302 → Shopify checkout).
- **Mobilno:** lepljiva nakupna vrstica se prikaže po prvem zaslonu in skrije, ko je razdelek za nakup viden.

## Datoteke v `media/`

| Datoteka | Namen |
|---|---|
| `81cap-hero-1080.mp4`, `81cap-hero-720.mp4` | Dreamina video, 10 s, 30 fps, brez zvoka, obrezana oznaka »AI« |
| `81cap-hero-first.jpg` | poster (temni začetni kader) |
| `81cap-hero-poster.jpg` | svetli kader (reduced motion, OG slika) |
| `still-front/side/rear.jpg` | kadri iz videa za razdelek z detajli |
| `81cap-photo.webp` | izvirna fotografija (zaključni razdelek) |
| `81-logo-white.svg`, `81-logo.svg` | logotip s 81cap.com (bel za glavo/nogo, rumen za favicon) |

Rumena barva znamke: `#FFF000` (iz barvne sheme teme 81cap.com).
