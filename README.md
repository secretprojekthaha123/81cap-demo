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

## Različica 2 (26. 10. 2026) – tri družine izdelkov

Stran zdaj predstavlja 81 CAP, FIRE CAP in 81X360 z vodnikom Male/Female, primerjalno tabelo in tremi nakupnimi razdelki. Vsi podatki so z 81cap.com (produktne strani, /products/*.js, About).

### Fotografije (`media/products/`)

| Datoteka | Vir (Shopify CDN) | Pomen |
|---|---|---|
| `81cap-male.webp`, `81cap-male-base.webp` | 81cap-1680437.jpg | 81 CAP MALE: spodnja stran s stebelcem (pin) |
| `81cap-female.webp`, `81cap-female-base.webp` | 81cap-5124933.jpg | 81 CAP FEMALE: spodnja stran z luknjo (socket) |
| `81cap-male-5/10/20.webp` | 81cap-7690552 / 5929180 / 6204645 | pakiranja MALE (na fotografijah spodnje strani s stebelcem) |
| `81cap-female-5/10/20.webp` | 81cap-2197846 / 6861201 / 9733946 | pakiranja FEMALE (spodnje strani z luknjo) |
| `firecap-three-views.webp`, `firecap-side.webp`, `firecap-angled.webp` | 81cap-7994253 / 8015388 / 3093950 | FIRE CAP (trgovina fotografira Female izvedbo z luknjo) |
| `firecap-10/20/50.webp` | 81cap-8482206 / 1705889 / 3719574 | pakiranja FIRE CAP (ista fotografija za Male in Female) |
| `x360-male-base.webp`, `x360-female-base.webp` | 81cap-3594354 / 3835375 | 81X360 spodnja stran: stebelce / luknja |
| `x360-frame-up/45r/90l.webp` | 81cap-8115339 / 8405589 / 9677460 | 81X360 z nastavkom v treh polozajih |
| `x360-body.webp`, `x360-rotor.webp` | sestavljeno iz 8115339 (+ 9677460, 8405589 za zapolnitev) | plasti za animacijo: telo brez nastavka in vrtljivi del (disk + nastavek) |

Dodelitev MALE/FEMALE: ime pove prikljucek capa. MALE = stebelce, za plocevinke z zenskim ventilom (400-600 ml); FEMALE = luknja, za ULTRA WIDE, MAD MAXX, BOOSTER (moski ventil). Fotografije sem dodelil po vidnem stebelcu oziroma luknji, ker Shopify varianta nima lastne slike.

### Animacija 81X360

`app.js` vrti `x360-rotor.webp` okrog sredisca diska (`transform-origin: 49.53% 35.8%`), telo `x360-body.webp` miruje. Samodejni zamah -90..+90 stopinj z umirjanjem na koncih; drsnik prevzame nadzor, zamah se nadaljuje po 4 s. Pri `prefers-reduced-motion` je samo drsnik. Zasuk je 2D okrog osi diska; perspektiva nastavka pri skrajnih kotih se zato rahlo razlikuje od pravih fotografij (9677460, 8405589), ki so prikazane poleg.

### Neskladja na izvirnih straneh (nisem jih resil z ugibanjem)

- About: 81 FEMALE "1,62x faster / 1,42x more surface" v opisu, v tabeli testov pa "2,25x / 1,47x" (iz 29 s : 47 s in 5,3 : 3,6 m2 sledi 1,62x in 1,47x). Na strani so zato za Female samo surovi casi in povrsine, brez mnozitelja.
- About: "4,13 times faster" pri 400 ml, iz 26 s : 112 s sledi 4,31x. Naslov na strani ohranja navedbo proizvajalca 4,13x, poleg so surovi casi.
- FIRE CAP opis pravi "for all cans with female valves (MADMAXX, ULTRA WIDE, ...)", stran 81 CAP pa iste plocevinke uvrsca k FEMALE capu (moski ventil). Na strani FIRE CAP so navedene plocevinke iz opisa brez trditve o ventilu.
- Manjka: fotografija spodnje strani FIRE CAP Male; pakiranja FIRE CAP imajo isto fotografijo za oba prikljucka.
- Dostava: cene so objavljene samo za pakiranja 81 CAP (5/10/20).

### Nakupne povezave

18 variant (6 na izdelek), vse preverjene 26. 10. 2026 (302 -> Shopify checkout). ID-ji so v `app.js` (`PRODUCTS`).

## Različica 3 – naslovna stran + ločene produktne strani

- `index.html`: video, pregled treh capov z osnovnimi lastnostmi in gumbom "Details & buy", vodnik Male/Female, primerjalna tabela, FAQ.
- `81cap.html`, `firecap.html`, `x360.html`: podrobnosti, fotografije, izbira priključka in količine, nakupni gumb. Na telefonu je spodaj pripet gumb "Add to cart" s trenutno izbrano varianto in ceno.
- Navigacija: na telefonu vrstica z zavihki pod glavo, na namizju v glavi.
- Posamezne datoteke so povezane relativno, zato stran deluje v vsaki podmapi (GitHub Pages, Netlify).
