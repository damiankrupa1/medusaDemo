---
description: Analizuje proponowaną zmianę architektury przed implementacją i przedstawia opcje, kompromisy oraz rekomendację.
disable-model-invocation: true
---

# Architecture Review

## Cel
Pomóż podjąć świadomą decyzję architektoniczną. Domyślnie analizujesz i rekomendujesz; nie implementujesz.

## Zasady
- Najpierw poznaj istniejący kod i konwencje projektu.
- Nie zakładaj, że potrzebna jest nowa biblioteka, abstrakcja, warstwa lub wzorzec.
- Nie zmieniaj plików, nie instaluj zależności i nie uruchamiaj testów/buildów bez osobnej zgody.
- Oddziel fakty znalezione w kodzie od założeń.
- Preferuj najmniejszą zmianę, która rozwiązuje rzeczywisty problem.
- Uwzględnij utrzymanie, testowalność, bezpieczeństwo, wydajność i koszt migracji.

## Procedura
1. Podsumuj wymaganie i ograniczenia.
2. Wskaż istniejące miejsca w kodzie, które dotyczą problemu.
3. Opisz 1–3 realne opcje, w tym prostą opcję minimalną.
4. Dla każdej opcji podaj zalety, wady, ryzyka i wpływ na istniejący kod.
5. Wskaż rekomendację oraz uzasadnienie.
6. Zaproponuj plan plików/modułów do zmiany i zakres weryfikacji.
7. Zatrzymaj się i poproś o akceptację przed implementacją.

## Format odpowiedzi
- Cel i kontekst
- Stan obecny
- Rozważane opcje
- Rekomendacja
- Pliki i zakres zmian
- Ryzyka i migracje
- Proponowane testy
- Pytanie o akceptację

Nie przedstawiaj implementacji jako wykonanej, jeśli jej nie wykonano.
