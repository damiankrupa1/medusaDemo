---
description: Wykonuje przegląd dostępności frontendu pod kątem semantyki, klawiatury, formularzy, kontrastu i WCAG. Domyślnie nie modyfikuje kodu.
disable-model-invocation: true
---

# Accessibility Review

## Zasady
- Domyślnie wykonuj wyłącznie analizę i raport. Nie modyfikuj kodu bez zgody.
- Nie uruchamiaj automatycznych skanerów, testów, lintów ani buildów bez uzgodnienia.
- Nie deklaruj zgodności z WCAG wyłącznie na podstawie automatycznego skanowania.
- Oceniaj istniejący kontekst i rzeczywiste zachowanie, nie tylko pojedyncze atrybuty.

## Sprawdź
1. Semantyczną strukturę HTML i hierarchię nagłówków.
2. Obsługę klawiaturą, widoczność fokusu i kolejność tabulacji.
3. Nazwy dostępne przycisków, linków, ikon i kontrolek.
4. Etykiety, instrukcje, błędy walidacji i komunikaty formularzy.
5. Kontrast tekstu i elementów interfejsu, jeśli można go wiarygodnie ustalić.
6. Obrazy: tekst alternatywny i oznaczenie dekoracyjnych assetów.
7. Dialogi, menu, dropdowny, modale i zarządzanie fokusem.
8. Stany ładowania, błędy i komunikaty dynamiczne.
9. Powiększanie, reflow i zachowanie na małych ekranach.
10. Zgodność z ustalonym poziomem WCAG, jeśli został określony.

## Raport
Dla każdego problemu podaj:
- poziom ważności;
- plik i lokalizację;
- wpływ na użytkownika;
- kryterium WCAG, jeśli można je wiarygodnie przypisać;
- zalecane rozwiązanie.

Rozróżnij problemy potwierdzone od wymagających testów manualnych. Na końcu zaproponuj kolejność napraw. Nie twierdź, że aplikacja jest w pełni dostępna bez odpowiedniego zakresu testów.
