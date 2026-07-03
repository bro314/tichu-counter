# Dragon's Count Turnier-Feature

Die App Dragon's Count soll ein Turnier-Feature bekommen.

* Ein Turnier kann in zwei Formaten stattfinden: Gruppen oder KO.

## Datenstrukturen

* Turnier  
  * Id (Integer, muss Unique sein, automatisch vergeben, nicht sichtbar für User oder Admins)  
  * Datum/Zeit der Erstellung (automatisch vergeben)  
  * Name  
  * Tag (optional)  
  * Boolean: Können User selbst ein Team anmelden?  
  * Liste von Admin Usern (darf nicht leer sein)  
  * Status (Vorbereitung, Erstellung, Durchführung, FERTIG)  
* Team  
  * Turnier Id (rein technische Referenz-Id für die Datenbank)  
  * Name (muss Unique sein, muss beim Erstellen überprüft werden)  
  * Spieler 1 als Account oder Guest (wenn nicht von einem Admin erstellt, dann ist Spieler 1 immer der Account des Users)  
  * Spieler 2 als Account oder Guest  
* Spiel (existierende Datenstruktur von Dragon's Count)  
  * Wird um "Turnier Id" erweitert, um Spiele eindeutig einem Turnier zuzuordnen und danach suchen zu können. Die Turnier Id ist nur eine technische Id, die weder für Admins noch User sichtbar ist.  
    * Besonderheit: Spiele mit Turnier Id können von Adminaccounts des Turniers genauso bearbeitet werden wie von den Spieleraccounts des Spiels.  
  * Wird um "Turnier Bezeichnung" erweitert, um einzuordnen, was für ein Spiel es ist (Gruppe A, Gruppe D, Achtelfinale, Finale, ...). Sichtbar für User, indem es in Klammern an die Notiz angehängt wird in der GameCard. Kann nicht verändert werden.

## Screens

Besonderheit: Die Turnierliste und die Turnierseiten kann man auch sehen, wenn man nicht eingeloggt ist. Die Infos sind alle öffentlich. Man nur als anonymer User keinerlei Änderungen machen.

* Turnierliste  
  * So ähnlich wie die Homepage, statt Cards mit Spielen sieht man halt Cards mit Turnieren  
  * Auf eine Karten tippen/klicken bringt einen zur Turnierseite  
  * Button: Neues Turnier erstellen, erstellt einen Dialog zur Turniererstellung, wo man die Datenstruktur "Turnier" (siehe dort) befüllen kann.  
  * Zu dieser Turnierliste kommt man auch immer vom Navigationsmenü: Zu "Start", "Spiel", "Einstellungen" kommt
  "Turniere" hinzu. "Turniere" kommt nach "Spiel".
* Turnierseite  
  * Für Admins immer "Turnier bearbeiten" anzeigen. In dem Dialog kann man dann aber nur die Liste der Admins verändern und "Turnier löschen" drücken (mit confirmation). Und man bekommt einen QR Code angezeigt für die Turnierseite, die man den Leuten geben kann, die sich als Team anmelden wollen bzw. die den Stand des Turniers sehen wollen.  
    * Es gibt jeweils auch immer einen Button für Admins, um in die nächste Phase zu wechseln:  
      * Vorbereitung \-\> Erstellung  
        * Geht nur, wenn mindestens zwei Teams angemeldet sind.  
        * Bringt den Admin dann direkt zur Erstellungsseite  
      * Erstellung \-\> Durchführung (Erstellungsseite)  
        * Für Gruppenturniere  
          * Auswahl wie viele Gruppen  
          * Button "Turnier (re-)generieren": Verteilt alle Teams auf die Gruppen. Gruppen werden bezeichnet mit Großbuchstaben A,B,C,... Die größte Gruppe darf höchstens 1 Team mehr haben als die kleinste Gruppe.  
          * Button "Turnier starten": \-\> Phase Durchführung. Alle Spiele werden erstellt, jeweils mit Turnier Id und Turnier Bezeichnung. Dann sehen die User ja automatisch die erstellten Spiele auch ihrem Home Screen.  
        * Für KO Turniere  
          * Button "Turnier (re-)generieren": Verteilt alle Teams zufällig auf einen KO Baum, wobei einige Teams in der ersten Runde ein Freilos haben, wenn es nicht 2^n Teams sind.  
          * Button "Turnier starten": Siehe Gruppenturnier. Besonderheit: Wir brauchen eine Logik, sobald ein Spiel eines KO Turniers beendet wurde, die ggf. das Spiel für die nächste Runde erstellt, falls die Gegner schon feststehen.  
      * Durchführung \-\> Fertig  
        * Das bedeutet letztlich nicht viel. Admins können das machen, wenn alle Spiele gespielt sind (oder vorher, wenn das Turnier abgebrochen wurde). Man sieht dann einfach in der Turnierliste, dass es kein aktives Turnier mehr ist.  
  * Phase Vorbereitung  
    * Button "Team erstellen", um dem Turnier beizutreten (für User nur sichtbar wenn das erlaubt ist).  
      * Spieler 1 ist immer der Spieler, der eingeloggt ist. Nur ein Admin der Turniers kann auch andere Teams erstellen, zum Beispiel Teams mit 2 Guests.  
    * Liste aller angemeldeten Teams anzeigen jeweils TeamCard  
    * Teams aus anderem Turnier übernehmen (nur für Admins)  
      * Man sucht sich zunächst aus einer Liste/Dropdown das Turnier aus, von dem man übernehmen möchte. Dann bekommt man die Liste aller Teams, jeweils mit Checkbox daneben. Unten hat man dann "Übernehmen" und "Abbrechen" buttons.  
    * Team bearbeiten (für Admins oder Spieler des Teams mit Account) durch tippen/klicken der Teamcard  
      * Erlaubt in der Phase Vorbereitung die Umbenennung des Teams und auch die Änderung der Spieler (aber bei Nicht-Admins nicht Spieler 1, siehe oben).  
      * Hat einen Button "Team löschen".  
    * Für Admins: "Turnier starten" \-\> Phase Erstellung  
  * Phase Erstellung  
    * Nur für Admins, für alle anderen: "Turnier wird gerade erstellt"  
  * Phase Durchführung  
    * Gruppenturniere  
      * Seite mit Liste aller Gruppen jeweils mit Anzahl Teams pro Gruppe und Prozentzahl, wie viele Spiele schon fertig sind. Jede Gruppe wird als MUI Card dargestellt. Tippen/Klicken der Card bringt einen zur Gruppenseite  
      * Gruppenseite  
        * Liste aller Spiele. GameCard wiederverwenden, aber zusätzlich den Teamnamen anzeigen und deutlich das Gewinnerteam hevorheben.  
        * Tabelle: Ranking nach Anzahl der Siege. Bei Punktgleichstand: Erst direkter Vergleich. Danach nach Punktdifferenz aller Gruppenspiele eines Teams. Das sind auch die Spalten der Tabelle: Name des Teams, Anzahl Siege, Punktdifferenz  
    * KO Turniere  
      * Seite mit Liste aller Runden (Achtefinale, Viertelfinale, ...) jeweils als MUI Card. Jeweils in Prozent anzeigen, wieviele Spiele der Runde schon fertig sind. Tippen/Klicken der Card bringt einen zur Rundenseite  
      * Rundenseite  
        * Liste aller Spiele. GameCard wiederverwenden, aber zusätzlich den Teamnamen anzeigen und deutlich das Gewinnerteam hevorheben.

