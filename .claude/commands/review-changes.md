---
description: Wykonuje read-only code review zmian Git pod kątem błędów, regresji, bezpieczeństwa i jakości. Nie poprawia kodu.
disable-model-invocation: true
---

# Review Changes

## Zasady
- To przegląd tylko do odczytu. Nie edytuj plików, nie stage'uj zmian i nie twórz commitów.
- Nie uruchamiaj testów, lintów ani buildów bez osobnej zgody.
- Domyślny zakres to niezacommitowane zmiany: `git diff`, `git diff --cached` oraz nowe pliki z `git ls-files --others --exclude-standard`, które nie pojawiają się w żadnym diffie. Jeśli użytkownik wskaże inny zakres (np. branch względem `main`: `git diff main...HEAD`), przejrzyj ten zakres.
- Czytaj też kontekst kodu potrzebny do oceny zmian.
- Nie zakładaj, że brak testów oznacza błąd; oceń ryzyko konkretnej zmiany.

## Sprawdź
1. Błędy logiczne i przypadki brzegowe.
2. Regresje i niezgodność z istniejącymi kontraktami API.
3. Bezpieczeństwo, autoryzację, walidację wejścia i przypadkowe sekrety.
4. Obsługę błędów, stany ładowania i puste wyniki.
5. Typowanie, null/undefined, asynchroniczność i wyścigi.
6. Wydajność, dostępność i responsywność, jeśli dotyczy.
7. Niepotrzebną złożoność, duplikację i nieuzasadnione zależności.
8. Braki w testach adekwatne do ryzyka.

## Raport
Zwracaj konkretne ustalenia z lokalizacją pliku i fragmentu:
- [P1] krytyczny problem;
- [P2] istotny problem;
- [P3] mniejszy problem;
- [P4] sugestia, jeśli jest rzeczywiście pomocna.

Dla każdego ustalenia podaj scenariusz, skutek i powód. Nie zgłaszaj hipotetycznych problemów bez uzasadnienia. Jeśli nie znaleziono problemów, powiedz, że przegląd nie wykazał istotnych ustaleń, ale nie gwarantuj braku błędów.

Na końcu wymień obszary, których nie można było zweryfikować. Nie naprawiaj znalezionych problemów bez polecenia użytkownika.
