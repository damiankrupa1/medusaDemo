# Katalog produktów demo (1000 produktów) – Medusa 2.19

Ten katalog zawiera wszystko, co jest potrzebne, żeby zasilić sklep demo
(Medusa 2.19 na Railway + storefront Nuxt) katalogiem 1000 produktów
odzieżowych z legalnymi zdjęciami: dane źródłowe, skrypty, zoptymalizowane
zdjęcia i plik CSV w formacie importu Medusa Admin.

Liczby z ostatniej walidacji (produkty, warianty, zdjęcia, rozmiary plików)
zapisuje lokalnie `validation-results.json` (poza gitem).

## Zawartość

| Ścieżka | Co to jest | W gicie? |
|---|---|---|
| `catalog.json` | Źródło prawdy: 1000 produktów niezależnych od środowiska (kategorie i kolekcje po **handle**, nie po ID) | tak |
| `*.csv` | CSV do importu w Medusa Admin, budowane przez `build-csv.mjs` dla jednego konkretnego backendu (lokalnie `products.csv`; produkcja: `products-railway-test-5.csv`, `products-railway.csv`) | nie (`.gitignore`) |
| `validation-results.json` | Wynik ostatniej walidacji (generuje go `validate-catalog.mjs`) | nie (`.gitignore`) |
| `images/` | Zoptymalizowane zdjęcia WebP (`fs-0001-1.webp`, ...) | nie (`.gitignore`) |
| `uploads/<host>.json` | Manifest uploadu: plik → URL zwrócony przez File Module danego backendu | nie |
| `work/` | Pliki robocze: kandydaci, podglądy, arkusze do przeglądu, etykiety | nie |
| `scripts/` | Skrypty (Node 22, bez nowych zależności; `sharp` z istniejącego `node_modules`) | tak |

> CSV nie są w repozytorium: każdy jest budowany dla **jednego konkretnego
> backendu** (krok 7 poniżej), bo ID kategorii, kolekcji, kanału sprzedaży
> i profilu wysyłki oraz URL-e zdjęć są inne w każdym środowisku. Po
> imporcie źródłem prawdy jest baza sklepu; migawkę daje eksport w Admin
> (Products → Export).

## Źródła zdjęć i licencje

Używane są wyłącznie zdjęcia na licencji **CC0** lub oznaczone jako
**domena publiczna (PDM)**: można ich używać komercyjnie, modyfikować
i nie trzeba podawać autora. Mimo to autor, licencja i strona źródłowa każdego
zdjęcia są zapisane w `catalog.json` (`images[]`) i w metadanych produktu
(`metadata.image_credits`).

- **Wikimedia Commons** – kategorie `Images from Unsplash`, `Images from
  Pixabay`, `Files from Pexels`, czyli zdjęcia przesłane z tych serwisów
  w okresie, gdy publikowały na CC0. Licencja jest sprawdzana dla każdego
  pliku (`LicenseShortName`).
- **Openverse** (oficjalne API) – źródła StockSnap, rawpixel (tylko ich
  własne zdjęcia z domeny publicznej, bez skanów muzealnych) i WordPress
  Photo Directory.

Bezpośrednie API Unsplash i Pexels wymagają klucza; ich wyszukiwarka www
jest chroniona przed botami. Zgodnie z decyzją właściciela projektu katalog
korzysta tylko ze źródeł CC0 bez klucza. Skrypt `fetch-candidates.mjs`
obsługuje też Pexels API (`--source pexels`), jeśli kiedyś pojawi się
`PEXELS_API_KEY`. Zdjęcia z Pexels mają własną licencję, nie CC0.

Każde zdjęcie użyte w katalogu zostało **obejrzane** na arkuszu przeglądu
i opisane ręcznie (typ ubrania, płeć, kolor, widoczne cechy). Tytuł, opis,
kategoria i kolor produktu wynikają z tego opisu. Odrzucane były m.in. zdjęcia
z widocznymi logo marek, napisami, dziećmi, strojami historycznymi lub
religijnymi, zdjęcia czarno-białe oraz ujęcia, na których produkt jest mało
widoczny.

## Model danych produktu

- 10 kategorii odzieżowych + `women` / `men` (produkt należy do kategorii
  odzieżowej i jednej lub obu kategorii płci). Istniejące `shirts`,
  `sweatshirts`, `pants` są używane ponownie (strona główna Nuxt korzysta
  z `pants`). Pozostałe tworzy `ensure-entities.mjs`.
- Kolekcje `latest-drops` i `weekly-picks` (handle z `app.config.ts`
  storefrontu). Kolekcja `sale` nie jest używana, bo w katalogu nie ma
  prawdziwych obniżek.
- Treści bazowe (tytuł, opis, materiał, opcje) są po angielsku (`en-US`),
  bo angielski jest językiem bazowym sklepu. Polskie (`pl-PL`) są
  w `catalog.json` (`i18n`, `slugs`) i trafiają do backendu dopiero po
  imporcie, przez `translate-catalog.mjs` (krok 10).
- Jedna opcja **Size** (po polsku „Rozmiar”) z wariantami (XS–XL, S–XXL,
  34–44, W30–W38, S/M–L/XL lub `One size`, po polsku „Uniwersalny”). Kolor
  nie jest opcją wariantu: każde zdjęcie pokazuje jeden kolor, więc każdy
  produkt ma jeden kolor (w tytule i opisie).
- Ceny w **PLN** (końcówka ,99). Jeśli backend ma też region EUR lub USD,
  `build-csv.mjs` dodaje przeliczone ceny (kursy w `scripts/lib/taxonomy.mjs`).
- `Variant Manage Inventory = FALSE`: importu CSV nie da się użyć do ustawienia
  stanów magazynowych, a śledzone warianty bez stanu storefront pokazuje jako
  „niedostępne”. Śledzenie zapasów można włączyć po imporcie, razem
  z ustawieniem stanów.
- `Product External Id` = ID katalogowe (`FS-0001`), SKU: `FS-0001-SWT-M`.
- Produkty bez zweryfikowanego zdjęcia mają status **draft** (nie pojawiają się
  w sklepie): 686 z 1000, w `catalog.json` z pustym `images`.

## Przygotowanie (już wykonane, powtarzalne)

```bash
# 1. Kandydaci (tylko metadane): Commons + Openverse
node data/catalog/scripts/fetch-candidates.mjs --source commons
node data/catalog/scripts/fetch-candidates.mjs --source commons-pixabay --commons-category Images_from_Pixabay
node data/catalog/scripts/fetch-candidates.mjs --source commons-pexels --commons-category Files_from_Pexels
node data/catalog/scripts/fetch-candidates.mjs --source openverse   # anonimowo: 200 zapytań/dzień

# 2. Podglądy i arkusze do przeglądu (Wikimedia pobierane po jednym pliku – limity)
node data/catalog/scripts/review-sheets.mjs --download
node data/catalog/scripts/review-sheets.mjs --limit 600

# 3. Przegląd: work/labels/sheet-NNN.txt, jedna linia na kafelek
#    12|dress|w|floral|midi,straps   zatwierdzone: typ|płeć (w/m/u)|kolor|cechy
#    13|x|powód                       odrzucone
#    14|+12                           kolejne zdjęcie tego samego produktu

# 4. Katalog (dokładnie 1000 produktów) i zdjęcia WebP
node data/catalog/scripts/generate-catalog.mjs --target 1000
node data/catalog/scripts/prepare-images.mjs
node data/catalog/scripts/validate-catalog.mjs --expected 1000
```

Zdjęcia: maks. 1200×1500 px (proporcje zachowane, bez powiększania), sRGB,
bez metadanych, WebP o jakości 82 obniżanej do 58 tylko wtedy, gdy plik
przekracza 500 KB. Plik ≥ 1 000 000 bajtów przerywa skrypt.

## Import do środowiska docelowego

Wszystkie skrypty biorą konfigurację **wyłącznie ze zmiennych środowiskowych**.
Nic nie jest zapisywane w plikach ani w logach:

```bash
export MEDUSA_BACKEND_URL=https://<backend>
export MEDUSA_ADMIN_EMAIL=...        # albo MEDUSA_ADMIN_API_KEY=sk_...
export MEDUSA_ADMIN_PASSWORD=...
```

Jeśli backend nie działa na `localhost`, każdy skrypt odmówi pracy bez
`--confirm-host <host>` (dokładna nazwa hosta). Dzięki temu przypadkowe
uruchomienie na produkcji nie jest możliwe.

> **Uwaga:** `apps/backend/.env` w tym repozytorium wskazuje na
> **produkcyjną** bazę i Redis na Railway. Nie uruchamiaj `pnpm medusa ...`
> lokalnie bez nadpisania `DATABASE_URL`/`REDIS_URL`.

```bash
H=medusademo-production.up.railway.app   # przykład; sprawdź właściwy host

# 5. Kategorie i kolekcje: najpierw raport, potem utworzenie brakujących
node data/catalog/scripts/ensure-entities.mjs --confirm-host $H
node data/catalog/scripts/ensure-entities.mjs --confirm-host $H --apply

# 6. Upload zdjęć przez File Module backendu (POST /admin/uploads)
#    2 równoległe żądania po 4 pliki, ponawianie błędów, wznawianie z manifestu,
#    każdy zwrócony URL jest pobierany i porównywany z plikiem lokalnym
node data/catalog/scripts/upload-images.mjs --confirm-host $H

# 7. CSV z ID i URL-ami tego środowiska (przerywa przy kolizji handle/SKU)
node data/catalog/scripts/build-csv.mjs --confirm-host $H --out products.csv
#    opcjonalnie: --published-only (bez szkiców), --skip-existing (ponowny import)

# 8. Walidacja z dostępnością URL-i i istnieniem encji
node data/catalog/scripts/validate-catalog.mjs --check-urls --check-backend --confirm-host $H

# 9a. Import w Medusa Admin: Products → Import → products.csv → Import
# 9b. albo to samo przez API (przydatne, gdy przeglądarka nie może wysłać
#     pliku do bucketu – patrz niżej)
node data/catalog/scripts/import-csv.mjs --confirm-host $H            # podsumowanie, bez importu
node data/catalog/scripts/import-csv.mjs --confirm-host $H --confirm  # import

# 10. Po imporcie: polskie treści (Translation Module, pl-PL) i slugi per język
#     dla produktów katalogu, które są już w backendzie (po external_id)
node data/catalog/scripts/translate-catalog.mjs --confirm-host $H          # raport
node data/catalog/scripts/translate-catalog.mjs --confirm-host $H --apply  # zapis
```

### Import testowy kilku produktów

Kroki 5–8 przyjmują `--ids`, które zawęża je do wybranych produktów katalogu,
np. żeby przed importem całości sprawdzić 5 produktów. `ensure-entities.mjs`
tworzy wtedy tylko kategorie i kolekcje, których te produkty używają.

```bash
IDS=FS-0020,FS-0104,FS-0038,FS-0004,FS-0139
node data/catalog/scripts/ensure-entities.mjs --ids $IDS --confirm-host $H --apply
node data/catalog/scripts/upload-images.mjs --ids $IDS --confirm-host $H
node data/catalog/scripts/build-csv.mjs --ids $IDS --confirm-host $H --out products-railway-test-5.csv
node data/catalog/scripts/validate-catalog.mjs --ids $IDS --csv products-railway-test-5.csv \
  --check-urls --check-backend --confirm-host $H
```

Pełny import po teście: `ensure-entities.mjs` i `upload-images.mjs` bez
`--ids` (zdjęcia z testu nie są wysyłane ponownie, bo są w manifeście),
a `build-csv.mjs` i `validate-catalog.mjs` z `--ids` obejmującym resztę
katalogu, żeby walidator oczekiwał właściwej liczby produktów w CSV.
Produkcja dostała tylko produkty opublikowane (szkice bez zdjęć pominięte);
żeby zaimportować też szkice, usuń z filtra warunek `p.status === "published"`
i opcję `--published-only`:

```bash
IDS=$(node -e 'const t = new Set(process.argv[1].split(",")); console.log(require("./data/catalog/catalog.json").products.filter((p) => p.status === "published" && !t.has(p.id)).map((p) => p.id).join(","))' FS-0020,FS-0104,FS-0038,FS-0004,FS-0139)
node data/catalog/scripts/build-csv.mjs --ids "$IDS" --published-only --confirm-host $H --out products-railway.csv
node data/catalog/scripts/validate-catalog.mjs --ids "$IDS" --csv products-railway.csv \
  --check-urls --check-backend --confirm-host $H
```

### Railway: storage i znane ryzyka

- Backend na Railway używa providera `@medusajs/file-s3` (Railway Bucket +
  funkcja `bucket-proxy`, zob. `docs/deployment-railway.md`). Medusa zapisuje
  w bazie **pełny URL** `S3_FILE_URL/<klucz>`, więc `S3_FILE_URL` musi być
  ustawiony docelowo **przed** uploadem. Późniejsza zmiana nie poprawi URL-i
  już zapisanych w produktach.
- Upload zdjęć idzie przez API backendu, więc zdjęcia trafiają tam, gdzie
  skonfigurowany jest File Module. Lokalny dysk kontenera Railway jest
  ulotny: jeśli backend loguje „S3 file storage is only partially
  configured”, **nie** wysyłaj zdjęć, bo znikną po redeployu.
  `upload-images.mjs` sam przerywa pracę, gdy zdalny backend zwraca URL-e
  `/static/...` (lokalny dysk) i nie zapisuje ich w manifeście.
- Backend (Server i Worker) i bucket proxy muszą mieć `S3_REGION=auto`.
  Z regionem lokalizacji bucketu (`ams`, czyli wartością
  `${{<bucket>.REGION}}`) storage odrzuca podpisy backendu
  (`SignatureDoesNotMatch`), więc upload zdjęć kończy się HTTP 500.
  Szczegóły w `docs/deployment-railway.md` (rozdział Troubleshooting).
- Import CSV w Admin 2.19 wysyła plik z przeglądarki metodą PUT pod
  presigned URL bucketu. Bucket potrzebuje do tego reguły CORS dla domeny
  Admina (ustawia ją `apps/backend/scripts/bucket-cors.mjs`), a Server
  i Worker zmiennych
  `AWS_REQUEST_CHECKSUM_CALCULATION=WHEN_REQUIRED` i
  `AWS_RESPONSE_CHECKSUM_VALIDATION=WHEN_REQUIRED` (zob.
  `docs/deployment-railway.md`). Bez reguły CORS można użyć
  `import-csv.mjs`, które robi to samo z Node (CORS go nie dotyczy).
- Import działa jako workflow w tle. Przy `WORKER_MODE=server/worker`
  sprawdź po imporcie, czy pojawiła się właściwa liczba produktów (skrypt
  `import-csv.mjs` liczy je po `external_id`).
- Koszt i zajętość: 337 zdjęć to łącznie ok. 41 MB
  (`stats.image_mb_total` w `validation-results.json`). Ceny storage
  i transferu Railway zależą od planu, więc nie są tu podawane.

## Uwagi dot. storefrontu Nuxt (bez zmian w kodzie)

- Karta produktu pokazuje `thumbnail`, galeria tylko `images[0]`, więc
  dodatkowe zdjęcia produktu są w danych, ale storefront ich nie wyświetla.
- Wartości opcji są sortowane alfabetycznie (`L, M, S, XL, XS`). To
  zachowanie `option-selector.vue`, a nie danych (warianty mają
  `variant_rank`).
- Istniejące kategorie `Shirts`, `Sweatshirts`, `Pants` mają angielskie
  nazwy. Import ich nie zmienia; ewentualne przetłumaczenie należy zrobić
  w Admin.
