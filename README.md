# Powiedz na P! 🎮

Mobilna gra towarzyska, która działa na iPhonie i Androidzie pod adresem:

**https://sobierajskimat-hash.github.io/Gra-na-P/**

341 haseł, poziomy trudności, podpowiedzi, minutnik, tablica wyników dla maksymalnie 6 graczy. Lokalna punktacja zapisuje się w przeglądarce. Gra działa bez własnego serwera.

## Pokój online – co już przygotowano

- Utwórz pokój jednym dotknięciem.
- Wygeneruj link z losowym, 16-znakowym kodem pokoju.
- Wyślij link znajomym; każdy widzi wspólną punktację w czasie rzeczywistym.
- Dodaj/usuń do 6 graczy, edytuj imiona, dodawaj/odejmuj punkty, zeruj wyniki.
- Aktualizacje punktów są transakcyjne (zabezpieczają przed jednoczesnymi kliknięciami).
- W każdej chwili można wrócić do niezależnej tablicy lokalnej.

**Tryb online nie jest jeszcze aktywny.** Wymaga podłączenia własnego projektu Firebase. Do czasu konfiguracji istniejąca gra i lokalne wyniki działają normalnie.

## Jednorazowa konfiguracja Firebase (bez własnego serwera)

1. Wejdź na [Firebase Console](https://console.firebase.google.com/) i utwórz projekt, np. `powiedz-na-p`. Możesz wyłączyć Google Analytics.
2. W menu **Build → Firestore Database** wybierz **Create database**. Wybierz region w Europie, jeśli to odpowiada Twoim potrzebom. Wybierz tryb produkcyjny, **nie otwieraj publicznie bazy przez testowe reguły**.
3. W **Build → Authentication → Sign-in method** włącz dostawcę **Anonymous (Anonimowe)** i zapisz.
4. Wejdź w **Firestore Database → Rules**. Skopiuj całą zawartość pliku [firestore.rules](./firestore.rules) do edytora reguł i kliknij **Publish**. Reguły pozwalają obsługiwać wyłącznie dokumenty o losowych kodach pokoi, najwyżej 6 graczy, bez publicznego listowania pokoi.
5. Otwórz **Project settings (⚙) → General → Your apps → Add app → Web (</>)** i zarejestruj aplikację (bez Firebase Hosting, strona pozostaje na GitHub Pages).
6. Skopiuj wyświetlony obiekt `firebaseConfig` z polami `apiKey`, `authDomain`, `projectId`, `appId` i ewentualnie `storageBucket`, `messagingSenderId`.
7. W pliku `firebase-config.js` zastąp `null` tym obiektem, np.:

   ```js
   window.P_FIREBASE_CONFIG = {
     apiKey: "WARTOŚĆ_Z_FIREBASE",
     authDomain: "PROJEKT.firebaseapp.com",
     projectId: "PROJEKT",
     appId: "WARTOŚĆ_Z_FIREBASE"
   };
   ```

   **Najwygodniej:** skopiuj tylko konfigurację aplikacji webowej z panelu Firebase do ChatGPT. Asystent może wtedy uzupełnić repozytorium GitHub. To jest konfiguracja publiczna aplikacji klienckiej, ale **nie przesyłaj kluczy konta usługi, plików JSON z private_key ani haseł**.
8. Po automatycznym wdrożeniu GitHub Pages odśwież grę. Przycisk „Utwórz pokój online” stanie się aktywny.

**Uwaga o prywatności:** Link do pokoju pełni rolę zaproszenia. Każdy, kto otrzyma link, może oglądać i zmieniać jego wyniki (także skasować punkty lub graczy). Nie wpisuj poufnych danych. Należy chronić link przed niepowołanymi osobami. Uwierzytelnianie anonimowe nie jest równoznaczne z prywatnymi kontami graczy.

## Technologia

GitHub Pages + HTML/CSS/JS, opcjonalnie Firebase Authentication (anonimowe) i Cloud Firestore (realtime listener oraz transakcje). Pliki `online.js`, `firebase-config.js` i `firestore.rules` zawierają gotowy moduł synchronizacji i jego konfigurację.

### GitHub Pages

W repozytorium: **Settings → Pages → Deploy from a branch → main → /(root) → Save**.
