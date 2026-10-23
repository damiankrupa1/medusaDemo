---
description: Workflow do realizacji zadań programistycznych z obowiązkowym uzgodnieniem zakresu zmian i testów przed implementacją.
---

# Controlled Work

## Zasada nadrzędna

Użytkownik kontroluje zakres implementacji oraz weryfikacji. Nie uruchamiaj testów, lintów, buildów ani innych komend weryfikacyjnych bez wcześniejszego uzgodnienia ich zakresu z użytkownikiem.

## Etap 1: Analiza

1. Zrozum zadanie i przeanalizuj odpowiednie fragmenty kodu.
2. Sprawdź dostępne skrypty w package.json, konfigurację testów i istniejące konwencje.
3. Nie modyfikuj jeszcze kodu.
4. Nie uruchamiaj testów, lintów, buildów ani skryptów weryfikacyjnych.

## Etap 2: Plan i uzgodnienie

Przed implementacją przedstaw:

- proponowane zmiany i pliki, których dotyczą;
- ryzyka i potencjalne skutki uboczne;
- proponowany zakres weryfikacji, podzielony na:
  - testy ukierunkowane;
  - lint i formatowanie;
  - typecheck;
  - build;
  - testy integracyjne lub e2e.

Dla każdej komendy podaj, dlaczego jest potrzebna i czy jest niezbędna.

Zaproponuj minimalny, proporcjonalny do zadania zestaw sprawdzeń.

Zatrzymaj się i poproś o akceptację planu oraz zakresu weryfikacji. Nie implementuj zmian przed uzyskaniem zgody.

## Etap 3: Implementacja

Po akceptacji wykonaj uzgodnione zmiany.

Nie rozszerzaj samodzielnie zakresu weryfikacji. Jeśli pojawi się potrzeba dodatkowych testów lub komend, wyjaśnij przyczynę i zapytaj użytkownika przed ich uruchomieniem.

## Etap 4: Weryfikacja

Uruchom wyłącznie zaakceptowane komendy.

Nie uruchamiaj ponownie pełnego zestawu testów po każdej drobnej poprawce, jeśli nie zostało to uzgodnione.

Jeśli sprawdzenie nie przejdzie, przedstaw wynik i zaproponuj dalsze kroki. Nie ukrywaj błędów ani nie twierdź, że testy przeszły, jeśli ich nie uruchomiono.

## Etap 5: Podsumowanie

Podaj:
- co zostało zmienione;
- jakie zaakceptowane komendy uruchomiono;
- ich rzeczywiste wyniki;
- czego nie sprawdzono;
- ewentualne ryzyka pozostałe po zmianach.
