---
description: Wdraża widok na podstawie makiety Figma, z kontrolą geometrii, typografii, assetów, responsywności i porównaniem wizualnym.
disable-model-invocation: true
---

# Pixel Perfect

## Cel
Przełożyć zaakceptowaną makietę na istniejący projekt frontendowy z możliwie wiernym wyglądem, bez niepotrzebnego przepisywania architektury.

## Zasady
- Nie uruchamiaj samodzielnie lintów, testów ani buildów bez uzgodnienia.
- Jeśli projekt lub makieta są niejednoznaczne, zapytaj zamiast zgadywać.
- Nie przebudowuj niezwiązanych części aplikacji.

## Etap 1: Analiza, bez zmian
1. Odczytaj link do konkretnego frame'a Figma. Jeśli Figma MCP jest niedostępny, powiedz to i poproś o dostęp/screenshot; nie udawaj, że odczytałeś projekt.
2. Sprawdź frame, warstwy, wymiary, typografię, kolory, spacing, komponenty, warianty, assety i dostępne breakpointy.
3. Zbadaj istniejący frontend: framework, router, style, design tokens, komponenty i konwencje.
4. Nie instaluj zależności i nie modyfikuj kodu na etapie analizy.

## Etap 2: Plan i zgoda
Przedstaw:
- elementy makiety i zakres implementacji;
- komponenty istniejące do ponownego użycia;
- pliki, które planujesz zmienić;
- brakujące assety/informacje;
- plan responsywności;
- proponowaną weryfikację (screenshoty, testy, lint/build).

Zatrzymaj się i poczekaj na zgodę na implementację oraz zakres weryfikacji.

## Etap 3: Implementacja
Po akceptacji:
- używaj istniejącego stacku i wzorców projektu;
- korzystaj z rzeczywistych assetów z projektu/Figmy, nie zastępuj ich przypadkowymi obrazami;
- odwzoruj hierarchię, proporcje, odstępy, fonty, kolory, obramowania i stany;
- uwzględnij semantyczny HTML, klawiaturę i widoczne stany interakcji;
- nie dodawaj fikcyjnych funkcji ani treści bez potrzeby.

## Etap 4: Kontrola wizualna
Uruchamiaj tylko zaakceptowane narzędzia i komendy. Jeśli dostępna jest przeglądarka/screenshot:
- ustaw viewport odpowiadający frame'owi;
- porównaj screenshot implementacji z referencją;
- poprawiaj najpierw największe różnice geometryczne, następnie typografię, kolory i detale;
- sprawdź uzgodnione breakpointy.

Nie twierdź, że porównanie wizualne zostało wykonane, jeśli nie masz screenshotu lub dostępu do przeglądarki.

## Etap 5: Raport
Wypisz zmienione pliki, wykonane sprawdzenia i znane odstępstwa od makiety.
