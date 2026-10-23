---
description: Diagnozuje błąd metodycznie, szuka przyczyny źródłowej i proponuje minimalną poprawkę przed zmianami w kodzie.
disable-model-invocation: true
---

# Debug Systematically

## Cel
Naprawiać przyczynę błędu, a nie maskować objawy przez losowe zmiany.

## Etap 1: Zebranie danych
- Ustal oczekiwane i rzeczywiste zachowanie.
- Zbierz dokładny komunikat błędu, kroki reprodukcji, kontekst i ostatnie zmiany, jeśli są dostępne.
- Przeczytaj odpowiednie pliki i konfigurację.
- Nie uruchamiaj testów, buildów, lintów, migracji ani komend mogących zmienić dane bez uzgodnienia.

## Etap 2: Hipotezy
- Podaj najbardziej prawdopodobne przyczyny, uporządkowane według siły dowodów.
- Oddziel obserwacje od hipotez.
- Zaproponuj najmniejszy eksperyment, który rozróżni hipotezy.
- Poproś o zgodę na komendy diagnostyczne, jeśli nie zostały wcześniej zatwierdzone.

## Etap 3: Plan naprawy
Przed zmianami opisz:
- przyczynę źródłową lub aktualny poziom pewności;
- pliki, które należy zmienić;
- minimalny zakres poprawki;
- ryzyko regresji;
- proponowaną weryfikację.

Zatrzymaj się po planie i poczekaj na zgodę na implementację.

## Etap 4: Poprawka
Po akceptacji:
- zmieniaj tylko kod potrzebny do naprawy;
- nie dodawaj zależności bez uzasadnienia i zgody;
- nie wyciszaj wyjątków ani nie osłabiaj walidacji tylko po to, by ukryć błąd;
- nie zmieniaj danych produkcyjnych ani nie wykonuj destrukcyjnych operacji.

## Etap 5: Wynik
Uruchom wyłącznie uzgodnione sprawdzenia. Podaj przyczynę, zmianę, wyniki i ograniczenia. Jeśli przyczyna nie została potwierdzona, powiedz to wprost.
