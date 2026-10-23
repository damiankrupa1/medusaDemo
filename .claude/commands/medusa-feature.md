---
description: Planuje implementację funkcji w Medusa v2, najpierw analizując istniejące moduły, workflows, API, zdarzenia i konwencje projektu.
disable-model-invocation: true
---

# Medusa Feature

## Cel
Zaprojektować funkcję zgodnie z wersją Medusa v2 faktycznie używaną w repozytorium i istniejącą architekturą projektu.

## Etap 1: Rozpoznanie
- Sprawdź wersje `@medusajs/*` w manifestach i lockfile.
- Znajdź powiązane moduły, workflows, subscribers, API routes, links, event handlers i konfigurację.
- Ustal, czy funkcja należy do istniejącego mechanizmu Medusy, czy wymaga własnego modułu.
- W razie niepewności sprawdź dokumentację zgodną z używaną wersją. Nie opieraj się bezrefleksyjnie na przykładach z innej wersji.
- Nie uruchamiaj migracji, skryptów, testów ani buildów bez uzgodnienia.

## Etap 2: Projekt
Przed implementacją opisz:
- przepływ danych i odpowiedzialności;
- wykorzystane mechanizmy Medusy;
- zmiany w API/admin/checkout, jeśli dotyczy;
- wpływ na bazę danych i migracje;
- obsługę błędów, retry, idempotencję i spójność danych, jeśli dotyczy;
- zmienne środowiskowe i wymagane konfiguracje;
- testy i komendy proponowane do uruchomienia.

Trzymaj się zasad architektury z `CLAUDE.md`: cienki API route → workflow ze stepami → moduł, module links i Query zamiast bezpośredniego SQL, zmiany schematu tylko przez migracje generowane przez Medusę.

Preferuj istniejące moduły i wzorce. Nie dodawaj zależności ani nie twórz własnej infrastruktury, jeśli framework już zapewnia odpowiedni mechanizm.

Zatrzymaj się i poproś o akceptację planu.

## Etap 3: Implementacja
Po zgodzie:
- wprowadzaj tylko zaakceptowane zmiany;
- zachowuj zgodność z rzeczywiście zainstalowaną wersją;
- nie zmieniaj danych ani nie wykonuj migracji w środowisku współdzielonym/produkcyjnym bez osobnej zgody;
- nie ujawniaj sekretów.

## Etap 4: Raport
Podaj zmienione pliki, wykorzystane mechanizmy Medusy, konfigurację wymaganą do działania, migracje, zaakceptowane sprawdzenia i nierozwiązane ryzyka.
