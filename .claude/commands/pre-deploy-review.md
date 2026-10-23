---
description: Przegląda gotowość do wdrożenia, ryzyka środowiskowe, sekrety, migracje i możliwość wycofania zmian. Nie wdraża bez zgody.
disable-model-invocation: true
---

# Pre-deploy Review

## Zakres
To przegląd gotowości, a nie zgoda na wdrożenie. Nie wykonuj deploya, migracji produkcyjnych, zmian DNS, rotacji sekretów, kasowania danych ani innych operacji zewnętrznych.

## Analiza
Jeśli repozytorium ma własną dokumentację wdrożenia, oprzyj przegląd na niej. W tym projekcie to `docs/deployment-railway.md`, zwłaszcza sekcje „Production deployment checklist” i „Troubleshooting”.

Sprawdź odpowiednie pliki i konfiguracje, bez ujawniania wartości sekretów:
- zmienne środowiskowe wymagane w produkcji i ich obecność (nie wypisuj wartości);
- rozdzielenie konfiguracji development/staging/production;
- build/deploy commands i porty;
- zdrowie aplikacji, logowanie i obsługę błędów;
- migracje bazy, kompatybilność wsteczną i plan backup/rollback;
- storage plików, publiczne URL-e i uprawnienia;
- Redis, kolejki, worker/server mode, jeśli dotyczy;
- webhooki, idempotencję i obsługę błędów płatności, jeśli dotyczy;
- CORS, cookies, HTTPS, uprawnienia i ryzyko ujawnienia danych;
- monitoring oraz możliwość weryfikacji po wdrożeniu.

Nie zakładaj, że dana usługa istnieje — oznacz punkty jako „nie dotyczy” lub „niepotwierdzone”.

## Testy i komendy
Nie uruchamiaj lintów, testów, buildów ani komend wdrożeniowych bez wcześniejszego uzgodnienia zakresu z użytkownikiem. Nie odczytuj ani nie drukuj sekretów. Nie wykonuj migracji na produkcji.

## Raport
Przedstaw:
- status: gotowe / gotowe z ryzykami / niegotowe / brak danych;
- blokery i ryzyka wysokie;
- pozostałe ryzyka;
- proponowane komendy weryfikacyjne;
- plan wdrożenia i rollbacku;
- punkty wymagające potwierdzenia.

Zatrzymaj się przed każdą operacją zmieniającą system zewnętrzny i poproś o wyraźną zgodę na konkretną operację.
