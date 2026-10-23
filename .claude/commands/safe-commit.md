---
description: Bezpieczne przygotowanie commita Git. Sprawdza branch, zmienione pliki i diff, proponuje wiadomość commit i zawsze wymaga wyraźnej zgody użytkownika przed wykonaniem git commit.
disable-model-invocation: true
---

# Safe Commit

## Cel

Przygotuj commit w sposób kontrolowany. Użytkownik musi znać zakres zmian i zatwierdzić operację przed wykonaniem `git commit`.

## Bezwzględne zasady

- Nigdy nie wykonuj `git commit` bez wyraźnej zgody użytkownika na konkretny commit.
- Nie traktuj wcześniejszej zgody na implementację ani uruchomienie testów jako zgody na commit.
- Nie wykonuj `git push`, nie zmieniaj brancha, nie twórz tagów i nie modyfikuj historii Git bez osobnej zgody.
- Nie używaj `git add .`, `git add -A` ani `git commit -a`.
- Nie nadpisuj, nie usuwaj i nie resetuj zmian użytkownika.
- Nie zmieniaj automatycznie treści plików tylko po to, aby przygotować commit.
- Nie pomijaj hooków Git ani kontroli bezpieczeństwa.
- Jeśli nie można jednoznacznie określić zakresu commita, zatrzymaj się i zapytaj.

## Etap 1: Inspekcja

Wykonaj wyłącznie polecenia odczytujące stan repozytorium:

1. `git status --short --branch`
2. `git branch --show-current`
3. `git diff --stat`
4. `git diff`
5. `git diff --cached --stat`
6. `git diff --cached`
7. `git ls-files --others --exclude-standard`

Dostosuj polecenia do sytuacji, jeśli repozytorium jest duże lub diff jest obszerny. W razie potrzeby sprawdź konkretne pliki.

Nie wypisuj wartości sekretów. Jeśli wykryjesz potencjalne sekrety, pliki `.env`, klucze prywatne lub dane dostępowe, nie ujawniaj ich zawartości i ostrzeż użytkownika.

Nie uruchamiaj testów, lintów, typechecków ani buildów tylko na potrzeby przygotowania commita. Ich zakres powinien być uzgodniony osobno.

## Etap 2: Analiza

Przedstaw użytkownikowi:

- aktualny branch;
- liczbę i nazwy zmienionych plików;
- podział na staged, unstaged i untracked;
- podsumowanie istotnych zmian;
- podejrzane, przypadkowe lub wrażliwe pliki;
- informację o plikach, których nie można bezpiecznie ocenić;
- proponowaną wiadomość Conventional Commit;
- dokładną listę plików przeznaczonych do commita.

Nie zakładaj, że wszystkie zmienione pliki należą do jednego commita. Jeśli zmiany są niezwiązane, zaproponuj ich rozdzielenie.

## Etap 3: Prośba o zgodę

Zatrzymaj się przed jakąkolwiek operacją zapisującą do indeksu Git lub tworzącą commit.

Pokaż raport w formacie:

```text
BRANCH: ...
ZAKRES: ...
PLIKI DO COMMITA: ...
POMINIĘTE PLIKI: ...
PROPOZYCJA COMMIT MESSAGE: ...
TESTY / WERYFIKACJA: ... (tylko rzeczywiście wykonane)
OSTRZEŻENIA: ...
```

Zapytaj wprost:

„Czy zatwierdzasz dokładnie ten zestaw plików i tę wiadomość commita?”

Nie wykonuj commita, dopóki użytkownik nie odpowie twierdząco.

Odpowiedź musi jednoznacznie dotyczyć przedstawionego commita. Nie traktuj niejednoznacznej wypowiedzi jako zgody.

## Etap 4: Przygotowanie

Po uzyskaniu zgody:

1. Ponownie sprawdź `git status --short --branch`.
2. Zweryfikuj, czy branch i zawartość plików nie zmieniły się od czasu akceptacji.
3. Jeśli cokolwiek istotnego się zmieniło, anuluj operację i przedstaw zaktualizowany raport do ponownej akceptacji.
4. Dodaj do indeksu wyłącznie zaakceptowane pliki, używając jawnych ścieżek.
5. Sprawdź `git diff --cached` oraz `git diff --cached --stat`.
6. Jeśli rzeczywisty zakres staged changes różni się od zaakceptowanego, nie wykonuj commita. Wyjaśnij różnicę i poproś o ponowną zgodę.

Nie usuwaj ani nie zastępuj cudzych zmian już znajdujących się w indeksie. Jeśli nie da się bezpiecznie odseparować zmian użytkownika, zatrzymaj się.

## Etap 5: Commit

Wykonaj `git commit` dopiero wtedy, gdy:
- użytkownik zaakceptował konkretny zakres i wiadomość;
- branch i staged diff zostały ponownie zweryfikowane;
- nie ma nierozwiązanych problemów z zakresem commita.

Użyj zaakceptowanej wiadomości. Nie zmieniaj jej samodzielnie.

Jeśli hook Git odrzuci commit, przedstaw błąd i zapytaj o dalsze działania. Nie omijaj hooków i nie poprawiaj automatycznie plików bez zgody.

## Etap 6: Podsumowanie

Po zakończeniu podaj:
- hash commita;
- wiadomość commita;
- branch;
- listę zatwierdzonych plików;
- wynik operacji.

Nie wykonuj automatycznie `git push`.
