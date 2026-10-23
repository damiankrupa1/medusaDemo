# Komendy Claude Code

Procedury dla Claude Code leżą jako pojedyncze pliki w
`.claude/commands/<nazwa>.md`; każdy tworzy komendę `/<nazwa>`. Nazwa
pochodzi z nazwy pliku, więc frontmatter nie ma pola `name`. Ten README
leży poza `commands/`, bo każdy plik `.md` w tym katalogu staje się komendą.

| Komenda | Kiedy używać | Zmienia pliki? |
|---|---|---|
| `/controlled-work` | Zadanie programistyczne z uzgodnieniem planu i zakresu weryfikacji przed implementacją | tak, po akceptacji |
| `/medusa-feature` | Projekt i wdrożenie funkcji w Medusa v2 zgodnie z architekturą projektu | tak, po akceptacji |
| `/architecture-review` | Decyzja architektoniczna: opcje, kompromisy, rekomendacja | nie |
| `/debug-systematically` | Diagnoza błędu i minimalna poprawka przyczyny źródłowej | tak, po akceptacji |
| `/review-changes` | Code review zmian, domyślnie niezacommitowanych | nie |
| `/pre-deploy-review` | Przegląd gotowości do wdrożenia, bez wdrażania | nie |
| `/safe-commit` | Commit po akceptacji listy plików i wiadomości | tworzy commit |
| `/pixel-perfect` | Widok frontendu na podstawie makiety Figma | tak, po akceptacji |
| `/accessibility-review` | Przegląd dostępności frontendu (WCAG) | nie |

## Wywoływanie

- Komendy uruchamiasz jawnie, np. `/review-changes`. Wszystkie oprócz
  `controlled-work` mają `disable-model-invocation: true`, więc Claude nie
  wywoła ich sam. Czy Claude może sam wywołać plik z `commands/`, jak skill
  z folderu, dokumentacja nie mówi jednoznacznie; nie zakładaj tego dla
  `controlled-work`.
- Wywołana komenda ma pierwszeństwo przed sekcją General Behavior w
  `CLAUDE.md` na czas tego zadania. Pozostałe zasady `CLAUDE.md`
  (architektura Medusy, migracje, sekrety) obowiązują dalej.

`disable-model-invocation` ogranicza automatyczne wywołania, ale nie jest
techniczną blokadą komend. Ryzykowne operacje nadal powinny być
zabezpieczone uprawnieniami lub hookami.

## Wspólne zasady

- Żadna komenda nie uruchamia testów, lintów, buildów ani migracji bez
  uzgodnienia zakresu z użytkownikiem.
- Push, deploy i operacje na produkcji zawsze wymagają osobnej zgody
  (`CLAUDE.md`, `safe-commit`, `pre-deploy-review`).

## Copilot

`.github/copilot-instructions.md` odsyła do tego spisu, więc GitHub Copilot
stosuje te same procedury.

## Dodawanie komendy

1. Utwórz `.claude/commands/<nazwa>.md` z frontmatterem: `description`
   i zwykle `disable-model-invocation: true`.
2. Dopisz komendę do tabeli powyżej.
